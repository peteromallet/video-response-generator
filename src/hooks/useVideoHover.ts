
import { useEffect, useRef, RefObject } from 'react';
import { Logger } from '@/lib/logger';

const logger = new Logger('useVideoHover');

/**
 * Hook to handle playing videos on hover and pausing when mouse leaves
 */
export const useVideoHover = (
  containerRef: RefObject<HTMLElement>,
  videoRef: RefObject<HTMLVideoElement>,
  options: {
    enabled: boolean;
    resetOnLeave?: boolean;
    delayPlay?: number;
  }
) => {
  const { enabled, resetOnLeave = true, delayPlay = 30 } = options; // Reduced delay for responsiveness
  const playTimeoutRef = useRef<number | null>(null);
  const isHoveringRef = useRef<boolean>(false);
  const lastPlayAttemptRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    
    const container = containerRef.current;
    const video = videoRef.current;
    
    if (!container || !video) {
      logger.warn('Container or video ref not available for hover effect');
      return;
    }
    
    const handleMouseEnter = () => {
      logger.log('Mouse entered video container');
      isHoveringRef.current = true;
      
      // Clear any existing timeout
      if (playTimeoutRef.current) {
        window.clearTimeout(playTimeoutRef.current);
      }
      
      // Set a small delay to ensure the video is ready to play and to avoid flickering
      // on quick mouse movements
      playTimeoutRef.current = window.setTimeout(() => {
        // Check if we're still hovering (mouse might have left during timeout)
        if (!isHoveringRef.current) return;
        
        // Ensure video is ready and not already playing
        if (video.paused) {
          logger.log('Attempting to play video on hover');
          
          // Force preload if not already loaded
          if (video.preload !== 'auto') {
            video.preload = 'auto';
          }
          
          // Always start from the beginning for a consistent preview
          video.currentTime = 0;
          
          // Track when we try to play to avoid too many rapid attempts
          const now = Date.now();
          if (now - lastPlayAttemptRef.current > 300) {
            lastPlayAttemptRef.current = now;
            video.play().catch(e => {
              // Only log errors that aren't abort errors (which happen when quickly hovering in/out)
              if (e.name !== 'AbortError') {
                logger.warn('Play on hover prevented:', e);
              }
            });
          }
        }
      }, delayPlay);
    };
    
    const handleMouseLeave = () => {
      logger.log('Mouse left video container');
      isHoveringRef.current = false;
      
      // Clear any pending play operation
      if (playTimeoutRef.current) {
        window.clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
      }
      
      // Small delay before pausing to handle quick hover in/out
      setTimeout(() => {
        if (!isHoveringRef.current && !video.paused) {
          video.pause();
          
          if (resetOnLeave) {
            // Reset to the beginning for a consistent preview
            video.currentTime = 0;
          }
        }
      }, 50);
    };
    
    // Remove any existing listeners before adding new ones
    container.removeEventListener('mouseenter', handleMouseEnter);
    container.removeEventListener('mouseleave', handleMouseLeave);
    
    // Add listeners
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      // Clear any pending timeout on unmount
      if (playTimeoutRef.current) {
        window.clearTimeout(playTimeoutRef.current);
      }
      
      // Clean up event listeners
      if (container) {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [containerRef, videoRef, enabled, resetOnLeave, delayPlay]);
};
