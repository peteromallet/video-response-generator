import { VideoEntry } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseDatabase } from './SupabaseDatabase';

/**
 * Implementation of the more complex database operations for Supabase
 */
export class SupabaseDatabaseOperations extends SupabaseDatabase {
  async deleteEntry(id: string): Promise<boolean> {
    try {
      // First check if this is a primary media for any asset
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select('id')
        .eq('primary_media_id', id);
      
      if (!assetError && assetData && assetData.length > 0) {
        // This is a primary media, update the asset
        for (const asset of assetData) {
          // Find another media for this asset to make primary
          const { data: otherMediaData, error: otherMediaError } = await supabase
            .from('asset_media')
            .select('media_id')
            .eq('asset_id', asset.id)
            .neq('media_id', id)
            .limit(1);
          
          if (!otherMediaError && otherMediaData && otherMediaData.length > 0) {
            // Update asset with new primary media
            await supabase
              .from('assets')
              .update({ primary_media_id: otherMediaData[0].media_id })
              .eq('id', asset.id);
          } else {
            // No other media, set primary_media_id to null
            await supabase
              .from('assets')
              .update({ primary_media_id: null })
              .eq('id', asset.id);
          }
        }
      }
      
      // Remove asset_media relationships
      await supabase
        .from('asset_media')
        .delete()
        .eq('media_id', id);
      
      // Get the media entry to find the URL
      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .select('url')
        .eq('id', id)
        .single();
      
      if (!mediaError && mediaData) {
        // Delete from storage if it's a Supabase storage URL
        if (mediaData.url && mediaData.url.includes('supabase.co')) {
          try {
            const videoFileName = mediaData.url.split('/').pop();
            if (videoFileName) {
              await supabase.storage
                .from('videos')
                .remove([videoFileName]);
              this.logger.log(`Deleted video ${videoFileName} from Supabase Storage`);
            }
          } catch (storageError) {
            this.logger.error(`Error deleting video from Supabase Storage:`, storageError);
          }
        }
      }
      
      // Delete the media entry
      const { error: deleteError } = await supabase
        .from('media')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        this.logger.error(`Error deleting media ${id}:`, deleteError);
        return false;
      }
      
      this.logger.log(`Deleted media entry: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting entry ${id}:`, error);
      return false;
    }
  }
  
  async clearAllEntries(): Promise<void> {
    try {
      // Delete all asset_media relationships
      await supabase
        .from('asset_media')
        .delete()
        .neq('id', 'placeholder');
      
      // Delete all assets
      await supabase
        .from('assets')
        .delete()
        .neq('id', 'placeholder');
      
      // Delete all media
      await supabase
        .from('media')
        .delete()
        .neq('id', 'placeholder');
      
      this.logger.log('Cleared all entries');
    } catch (error) {
      this.logger.error('Error clearing entries:', error);
    }
  }
  
  async addEntry(entry: Omit<VideoEntry, 'id' | 'created_at' | 'admin_approved'>): Promise<VideoEntry> {
    try {
      // Create the media entry
      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .insert({
          title: entry.metadata?.title || 'Untitled',
          url: entry.video_location,
          type: 'video',
          classification: entry.metadata?.classification || 'art',
          creator: entry.metadata?.creatorName || entry.reviewer_name,
          user_id: entry.user_id || this.currentUserId,
          admin_approved: 'Listed' // Default to Listed
        })
        .select()
        .single();
      
      if (mediaError) {
        this.logger.error('Error creating media entry:', mediaError);
        throw mediaError;
      }
      
      let assetId = entry.metadata?.assetId;
      
      // Create or update asset if needed
      if (entry.metadata?.loraName && !assetId) {
        // Create new asset
        const { data: assetData, error: assetError } = await supabase
          .from('assets')
          .insert({
            type: 'LoRA',
            name: entry.metadata.loraName,
            description: entry.metadata.loraDescription || '',
            creator: entry.metadata.creatorName || entry.reviewer_name,
            user_id: entry.user_id || this.currentUserId,
            primary_media_id: mediaData.id,
            admin_approved: 'Listed', // Default to Listed
            lora_type: entry.metadata.loraType,
            lora_link: entry.metadata.loraLink
          })
          .select()
          .single();
        
        if (assetError) {
          this.logger.error('Error creating asset:', assetError);
        } else {
          assetId = assetData.id;
          
          // Link asset and media
          const { error: linkError } = await supabase
            .from('asset_media')
            .insert({
              asset_id: assetId,
              media_id: mediaData.id
            });
            
          if (linkError) {
            this.logger.error('Error linking asset and media:', linkError);
          } else {
            this.logger.log(`Created asset_media relationship between asset ${assetId} and media ${mediaData.id}`);
          }
        }
      } else if (assetId) {
        // Link to existing asset
        this.logger.log(`Adding media ${mediaData.id} to existing asset ${assetId}`);
        
        const { error: linkError } = await supabase
          .from('asset_media')
          .insert({
            asset_id: assetId,
            media_id: mediaData.id
          });
          
        if (linkError) {
          this.logger.error('Error linking to existing asset:', linkError);
        } else {
          this.logger.log(`Successfully created asset_media relationship between asset ${assetId} and media ${mediaData.id}`);
          
          // Verify the relationship was created
          const { data: verifyData, error: verifyError } = await supabase
            .from('asset_media')
            .select('*')
            .eq('asset_id', assetId)
            .eq('media_id', mediaData.id);
            
          if (verifyError) {
            this.logger.error('Error verifying asset_media relationship:', verifyError);
          } else {
            this.logger.log(`Verification found ${verifyData?.length || 0} asset_media relationships`);
          }
        }
        
        // Update primary media if this is primary
        if (entry.metadata?.isPrimary) {
          await supabase
            .from('assets')
            .update({ primary_media_id: mediaData.id })
            .eq('id', assetId);
        }
      }
      
      // Construct the new VideoEntry object
      const newEntry: VideoEntry = {
        id: mediaData.id,
        video_location: mediaData.url,
        reviewer_name: entry.reviewer_name,
        skipped: entry.skipped || false,
        created_at: mediaData.created_at,
        admin_approved: 'Listed', // Default to Listed
        user_id: mediaData.user_id,
        metadata: {
          title: mediaData.title,
          creator: entry.metadata?.creator || 'self',
          classification: mediaData.classification || 'art',
          description: entry.metadata?.description || '',
          assetId
        }
      };
      
      return newEntry;
    } catch (error) {
      this.logger.error('Error adding entry:', error);
      throw error;
    }
  }

  async createNewAssetWithMedia(
    mediaId: string,
    loraName: string,
    loraDescription: string = '',
    creatorName: string,
    userId: string | null,
    loraType: string,
    loraLink: string
  ): Promise<string> {
    this.logger.log(`Creating new asset for LoRA: ${loraName}`);
    
    try {
      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .insert({
          type: 'LoRA',
          name: loraName,
          description: loraDescription,
          creator: creatorName,
          user_id: userId,
          primary_media_id: mediaId,
          admin_approved: 'Listed',
          lora_type: loraType,
          lora_link: loraLink
        })
        .select()
        .single();
      
      if (assetError) {
        this.logger.error('Error creating asset:', assetError);
        throw assetError;
      }
      
      const assetId = assetData.id;
      
      const { error: linkError } = await supabase
        .from('asset_media')
        .insert({
          asset_id: assetId,
          media_id: mediaId
        });
        
      if (linkError) {
        this.logger.error('Error linking asset and media:', linkError);
        throw linkError;
      }
      
      this.logger.log(`Created new asset ${assetId} with primary media ${mediaId}`);
      return assetId;
    } catch (error) {
      this.logger.error('Error creating new asset with media:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const supabaseDatabaseOperations = new SupabaseDatabaseOperations();
