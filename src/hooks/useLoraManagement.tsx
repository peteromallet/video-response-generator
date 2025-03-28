
import { useState, useCallback, useEffect, useRef } from 'react';
import { LoraAsset, VideoEntry } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useVideoManagement } from './useVideoManagement';
import { useAuth } from '@/hooks/useAuth';
import { Logger } from '@/lib/logger';

const logger = new Logger('useLoraManagement');

export const useLoraManagement = () => {
  const [loras, setLoras] = useState<LoraAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { videos, isLoading: videosLoading } = useVideoManagement();
  const isMounted = useRef(true);
  const fetchAttempted = useRef(false);

  const loadAllLoras = useCallback(async () => {
    if (!isMounted.current) return;
    
    setIsLoading(true);
    fetchAttempted.current = true;
    logger.log("Loading all LoRAs");
    
    try {
      // Flexible LoRA asset query with multiple type variations
      const { data: loraAssets, error } = await supabase
        .from('assets')
        .select('*')
        .or(`type.ilike.%lora%,type.eq.LoRA,type.eq.lora,type.eq.Lora`) 
        .order('created_at', { ascending: false });
      
      if (error) {
        logger.error("Error querying LoRA assets:", error);
        throw error;
      }
      
      logger.log("LoRA assets from database:", loraAssets?.length || 0);
      
      if (!isMounted.current) return;
      
      // Map videos to their assets
      const lorasWithVideos = loraAssets?.map((asset) => {
        // Find primary video
        const primaryVideo = videos.find(v => v.id === asset.primary_media_id);
        
        // Find all videos associated with this asset through metadata
        const assetVideos = videos.filter(v => 
          v.metadata?.assetId === asset.id ||
          (v.metadata?.loraName && 
           v.metadata.loraName.toLowerCase() === (asset.name || '').toLowerCase())
        );
        
        logger.log(`Asset ${asset.id} (${asset.name}) associated videos:`, 
          assetVideos.map(v => v.id));
        
        // LoRA approval status from database
        const admin_approved = asset.admin_approved || 'Listed';
        
        return {
          ...asset,
          primaryVideo,
          videos: assetVideos,
          admin_approved // Add the LoRA-level approval status
        } as LoraAsset;
      }) || [];
      
      logger.log("Final LoRAs with videos:", lorasWithVideos.length);
      if (isMounted.current) {
        setLoras(lorasWithVideos);
        setIsLoading(false);
      }
    } catch (error) {
      logger.error("Error loading LoRAs:", error);
      if (isMounted.current) {
        toast.error("Error loading LoRAs. Please try again.");
        setIsLoading(false);
      }
    }
  }, [videos]);

  // Load LoRAs when videos are loaded
  useEffect(() => {
    // Reset fetch attempt flag when videos change
    fetchAttempted.current = false;
    
    // Load LoRAs even if videos array is empty to avoid perpetual loading
    if (!videosLoading && !fetchAttempted.current) {
      logger.log("Videos loaded or empty, loading LoRAs");
      loadAllLoras();
    }
  }, [videos, videosLoading, loadAllLoras]);

  // Force loading state to false after a timeout to prevent infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading && isMounted.current) {
        logger.warn("LoRA loading timeout reached, forcing completion");
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeoutId);
  }, [isLoading]);
  
  // Log user state for debugging
  useEffect(() => {
    logger.log(`Auth state in useLoraManagement: ${user ? 'signed in' : 'not signed in'}`);
  }, [user]);

  // Cleanup function
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      logger.log("useLoraManagement unmounting, cleaning up");
    };
  }, []);

  const refetchLoras = useCallback(async () => {
    if (isMounted.current) {
      logger.log("Manually refreshing LoRAs");
      await loadAllLoras();
      toast.success("LoRAs refreshed");
    }
  }, [loadAllLoras]);

  return {
    loras,
    isLoading,
    refetchLoras
  };
};
