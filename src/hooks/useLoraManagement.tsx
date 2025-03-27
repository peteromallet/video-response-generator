
import { useState, useCallback, useEffect } from 'react';
import { LoraAsset, VideoEntry } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/auth';
import { useVideoManagement } from './useVideoManagement';

export const useLoraManagement = () => {
  const [loras, setLoras] = useState<LoraAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { videos } = useVideoManagement();

  // First check if user is authenticated
  useEffect(() => {
    const checkUser = async () => {
      try {
        console.log("useLoraManagement: Checking current user");
        const user = await getCurrentUser();
        console.log("useLoraManagement: Current user:", user ? user.id : "not authenticated");
        setUserId(user?.id || null);
      } catch (error) {
        console.error("useLoraManagement: Error checking user:", error);
        setUserId(null);
      }
    };
    
    checkUser();

    // Also set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("useLoraManagement: Auth state changed:", event);
      if (event === 'SIGNED_IN' && session?.user) {
        console.log("useLoraManagement: User signed in:", session.user.id);
        setUserId(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        console.log("useLoraManagement: User signed out");
        setUserId(null);
      }
    });

    return () => {
      console.log("useLoraManagement: Cleaning up auth subscription");
      subscription.unsubscribe();
    };
  }, []);

  const loadAllLoras = useCallback(async () => {
    setIsLoading(true);
    console.log("useLoraManagement: Loading all LoRAs");
    
    try {
      // Debug: Use the newly created database function to get all assets
      const { data: rawAssets, error: rawAssetsError } = await supabase.rpc('debug_get_all_assets');
      
      if (rawAssetsError) {
        console.error("useLoraManagement: Error with debug_get_all_assets:", rawAssetsError);
      } else {
        console.log("useLoraManagement: Raw assets from database:", rawAssets);
      }
      
      // Flexible LoRA asset query with multiple type variations
      const { data: loraAssets, error } = await supabase
        .from('assets')
        .select('*')
        .or(`type.ilike.%lora%,type.eq.LoRA,type.eq.lora,type.eq.Lora`) 
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("useLoraManagement: Error querying LoRA assets:", error);
        throw error;
      }
      
      console.log("useLoraManagement: LoRA assets from database:", loraAssets);
      
      // Map videos to their assets
      const lorasWithVideos = loraAssets.map((asset) => {
        // Find primary video
        const primaryVideo = videos.find(v => v.id === asset.primary_media_id);
        
        // Find all videos associated with this asset through metadata
        const assetVideos = videos.filter(v => 
          v.metadata?.assetId === asset.id ||
          (v.metadata?.loraName && 
           v.metadata.loraName.toLowerCase() === (asset.name || '').toLowerCase())
        );
        
        console.log(`useLoraManagement: Asset ${asset.id} (${asset.name}) associated videos:`, 
          assetVideos.map(v => v.id));
        
        return {
          ...asset,
          primaryVideo,
          videos: assetVideos
        } as LoraAsset;
      });
      
      console.log("useLoraManagement: Final LoRAs with videos:", lorasWithVideos);
      setLoras(lorasWithVideos);
    } catch (error) {
      console.error("useLoraManagement: Error loading LoRAs:", error);
      toast.error("Error loading LoRAs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [videos]);

  useEffect(() => {
    if (videos.length > 0) {
      console.log("useLoraManagement: Videos loaded, loading LoRAs");
      loadAllLoras();
    }
  }, [videos, loadAllLoras]);

  const refetchLoras = useCallback(async () => {
    await loadAllLoras();
    toast.success("LoRAs refreshed");
  }, [loadAllLoras]);

  return {
    loras,
    isLoading,
    refetchLoras
  };
};
