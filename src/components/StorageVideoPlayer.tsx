
import React, { useState, useEffect, useRef, memo } from 'react';
import VideoPlayer from './video/VideoPlayer';
import { Logger } from '@/lib/logger';
import VideoPreviewError from './video/VideoPreviewError';
import { videoUrlService } from '@/lib/services/videoUrlService';
import { Play } from 'lucide-react';

const logger = new Logger('StorageVideoPlayer');

interface StorageVideoPlayerProps {
  videoLocation: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playOnHover?: boolean;
  previewMode?: boolean;
  showPlayButtonOnHover?: boolean;
  isHoveringExternally?: boolean;
  lazyLoad?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement>;
  onLoadedData?: () => void;
  thumbnailUrl?: string;
  forcePreload?: boolean;
}

const StorageVideoPlayer: React.FC<StorageVideoPlayerProps> = memo(({
  videoLocation,
  className,
  controls = true,
  autoPlay = false,
  muted = true,
  loop = false,
  playOnHover = false,
  previewMode = false,
  showPlayButtonOnHover = true,
  isHoveringExternally,
  lazyLoad = true,
  videoRef: externalVideoRef,
  onLoadedData,
  thumbnailUrl,
  forcePreload = false
}) => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isHovering, setIsHovering] = useState(isHoveringExternally || false);
  const [posterUrl, setPosterUrl] = useState<string | null>(thumbnailUrl || null);
  const [videoInitialized, setVideoInitialized] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  // Always load the video immediately without lazy loading
  const [shouldLoadVideo, setShouldLoadVideo] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef || internalVideoRef;
  const isHoveringRef = useRef(isHoveringExternally || false);
  
  const isBlobUrl = videoLocation.startsWith('blob:');

  // Update isHoveringRef when props change
  useEffect(() => {
    isHoveringRef.current = isHoveringExternally || false;
    if (isHoveringExternally !== undefined) {
      logger.log(`StorageVideoPlayer: isHoveringExternally changed to ${isHoveringExternally}`);
      setIsHovering(isHoveringExternally);
    }
  }, [isHoveringExternally]);

  // Always load the video immediately 
  useEffect(() => {
    setShouldLoadVideo(true);
  }, [forcePreload]);

  // Detect manual hover changes
  const handleManualHoverStart = () => {
    if (isHoveringExternally === undefined) {
      logger.log('StorageVideoPlayer: Manual hover start');
      setIsHovering(true);
      setShouldLoadVideo(true);
    }
  };

  const handleManualHoverEnd = () => {
    if (isHoveringExternally === undefined) {
      logger.log('StorageVideoPlayer: Manual hover end');
      setIsHovering(false);
    }
  };
  
  // Handle external hover state changes
  useEffect(() => {
    if (isHoveringExternally !== undefined) {
      // Start loading video immediately when hovering starts
      if (isHoveringExternally) {
        logger.log('External hover detected - loading video');
        setShouldLoadVideo(true);
      }
      
      if (videoInitialized && videoRef.current) {
        const video = videoRef.current;
        
        if (isHoveringExternally && video.paused && videoLoaded) {
          logger.log('External hover detected - attempting to play video');
          
          // Play immediately without delay
          setTimeout(() => {
            if (video.paused) {
              video.play().catch(e => {
                if (e.name !== 'AbortError') {
                  logger.error('Error playing video on hover:', e);
                }
              });
            }
          }, 0);
        } else if (!isHoveringExternally && !video.paused) {
          logger.log('External hover ended - pausing video');
          video.pause();
          if (previewMode) {
            video.currentTime = 0;
          }
        }
      }
    }
  }, [isHoveringExternally, previewMode, videoRef, videoInitialized, videoLoaded]);
  
  // Always load the video - no lazy loading
  useEffect(() => {
    let isMounted = true;
    
    const loadVideo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!videoLocation) {
          throw new Error('No video location provided');
        }
        
        let url;
        if (isBlobUrl) {
          url = videoLocation;
          logger.log('Using blob URL directly:', url.substring(0, 30) + '...');
        } else {
          url = await videoUrlService.getVideoUrl(videoLocation, previewMode);
          logger.log('Fetched video URL:', url.substring(0, 30) + '...');
        }
        
        if (!url) {
          throw new Error('Could not resolve video URL');
        }
        
        if (isMounted) {
          setVideoUrl(url);
          setLoading(false);
          setVideoLoaded(true);
          // Mark video as initialized after URL is set
          setVideoInitialized(true);
          logger.log('Video URL loaded and ready');
        }
      } catch (error) {
        logger.error('Error loading video:', error);
        if (isMounted) {
          setError(`Failed to load video: ${error instanceof Error ? error.message : String(error)}`);
          setErrorDetails(String(error));
          setLoading(false);
        }
      }
    };
    
    if (videoLocation) {
      loadVideo();
    }
    
    return () => {
      isMounted = false;
    };
  }, [videoLocation, retryCount, previewMode, isBlobUrl]);

  const handleError = (message: string) => {
    setError(message);
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setErrorDetails(null);
    setRetryCount(prev => prev + 1);
    setShouldLoadVideo(true);
  };
  
  const handleVideoLoaded = () => {
    if (onLoadedData) {
      logger.log('StorageVideoPlayer: Video loaded, notifying parent');
      onLoadedData();
    }
  };

  // Main video player render
  return (
    <div 
      className="relative w-full h-full"
      onMouseEnter={handleManualHoverStart}
      onMouseLeave={handleManualHoverEnd}
      ref={containerRef}
    >
      {/* Show loading overlay if video is loading but we have a poster */}
      {loading && posterUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
          <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
        </div>
      )}

      {loading && !posterUrl && (
        <div className="flex items-center justify-center h-full bg-secondary/30 rounded-lg">
          Loading video...
        </div>
      )}

      {error && (
        <div className="relative h-full w-full bg-secondary/30 rounded-lg">
          <VideoPreviewError 
            error={error} 
            details={errorDetails || undefined}
            onRetry={handleRetry} 
            videoSource={videoUrl}
            canRecover={!previewMode}
          />
        </div>
      )}

      {!error && videoUrl && (
        <VideoPlayer
          src={videoUrl}
          className={className}
          controls={controls}
          autoPlay={autoPlay || isHovering}
          muted={muted}
          loop={loop}
          playOnHover={playOnHover}
          onError={handleError}
          showPlayButtonOnHover={showPlayButtonOnHover}
          containerRef={containerRef}
          videoRef={videoRef}
          externallyControlled={isHoveringExternally !== undefined}
          isHovering={isHovering}
          poster={posterUrl || undefined}
          lazyLoad={false} // Disable lazy loading
          onLoadedData={handleVideoLoaded}
        />
      )}

      {/* Show poster if no video URL or during loading */}
      {!videoUrl && posterUrl && !error && (
        <img 
          src={posterUrl} 
          alt="Video thumbnail" 
          className="w-full h-full object-cover absolute inset-0 z-0 pointer-events-none"
        />
      )}

      {/* Play button overlay only when not hovering */}
      {posterUrl && !isHovering && showPlayButtonOnHover && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="rounded-full bg-black/40 p-3">
            <Play className="h-6 w-6 text-white" />
          </div>
        </div>
      )}
    </div>
  );
});

StorageVideoPlayer.displayName = 'StorageVideoPlayer';

export default StorageVideoPlayer;
