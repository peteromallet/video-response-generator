
import { useState, useCallback, useEffect, useRef } from 'react';
import { LoraAsset } from '@/lib/types';
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
  const fetchInProgress = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadAllLoras = useCallback(async () => {
    // Prevent concurrent fetches and unmounted component updates
    if (!isMounted.current || fetchInProgress.current) {
      logger.log("Fetch already in progress or component unmounted, skipping");
      return;
    }
    
    fetchInProgress.current = true;
    setIsLoading(true);
    fetchAttempted.current = true;
    logger.log("Loading all LoRAs");
    
    try {
      // Set a loading timeout to prevent infinite loading
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      loadingTimeoutRef.current = setTimeout(() => {
        if (isMounted.current && isLoading) {
          logger.warn("LoRA loading timeout reached, forcing completion");
          setIsLoading(false);
          fetchInProgress.current = false;
        }
      }, 10000); // 10 second timeout
      
      // Flexible LoRA asset query with multiple type variations and no filters
      let query = supabase
        .from('assets')
        .select('*')
        .or(`type.ilike.%lora%,type.eq.LoRA,type.eq.lora,type.eq.Lora`);
        
      // Don't limit results for admin users
      if (user) {
        const isAdmin = await checkUserIsAdmin(user.id);
        logger.log(`User ${user.id} is admin: ${isAdmin}`);
        // If not admin, we could add filters here if needed
      }
      
      // Get all assets matching the type
      const { data: loraAssets, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        logger.error("Error querying LoRA assets:", error);
        throw error;
      }
      
      logger.log("LoRA assets from database:", loraAssets?.length || 0);
      if (loraAssets?.length) {
        logger.log("Sample asset data:", loraAssets[0]);
      }
      
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
        
        // LoRA approval status from database - default to 'Listed' if not set
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
        
        // Clear timeout since we successfully loaded
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      }
    } catch (error) {
      logger.error("Error loading LoRAs:", error);
      if (isMounted.current) {
        toast.error("Error loading LoRAs. Please try again.");
        setIsLoading(false);
        
        // Clear timeout since we're no longer loading (even if with error)
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      }
    } finally {
      fetchInProgress.current = false;
    }
  }, [videos, user]);

  // Helper function to check if user is admin
  const checkUserIsAdmin = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('has_role', { user_id: userId, role: 'admin' });
      
      if (error) {
        logger.error("Error checking admin role:", error);
        return false;
      }
      
      return !!data;
    } catch (e) {
      logger.error("Error in admin check:", e);
      return false;
    }
  };

  // Load LoRAs when videos are loaded - but only if not already loading and not already attempted
  useEffect(() => {
    if (!videosLoading && !fetchAttempted.current && !fetchInProgress.current) {
      logger.log("Videos loaded, loading LoRAs");
      loadAllLoras();
    }
  }, [videos, videosLoading, loadAllLoras]);

  // Log user state for debugging
  useEffect(() => {
    logger.log(`Auth state in useLoraManagement: ${user ? 'signed in' : 'not signed in'}`);
    
    // If auth state changes, reset fetch attempt to ensure we reload data - but only if not already fetching
    if (user && !isLoading && !fetchAttempted.current && !fetchInProgress.current) {
      logger.log("Auth state changed with user, reloading LoRAs");
      loadAllLoras();
    }
  }, [user, loadAllLoras, isLoading]);

  // Cleanup function
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      logger.log("useLoraManagement unmounting, cleaning up");
      
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, []);

  const refetchLoras = useCallback(async () => {
    if (isMounted.current && !fetchInProgress.current) {
      logger.log("Manually refreshing LoRAs");
      // Reset fetch attempt so we can trigger a fresh load
      fetchAttempted.current = false;
      await loadAllLoras();
      toast.success("LoRAs refreshed");
    } else {
      logger.log("Skipping manual refresh - fetch already in progress or component unmounted");
    }
  }, [loadAllLoras]);

  return {
    loras,
    isLoading,
    refetchLoras
  };
};
