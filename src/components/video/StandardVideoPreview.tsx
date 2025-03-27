
import React, { useRef, useState, useEffect } from 'react';
import { Play, FileVideo, Eye, RefreshCw } from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logger } from '@/lib/logger';
import VideoPreviewError from './VideoPreviewError';
import { cn } from '@/lib/utils';
import { videoUrlService } from '@/lib/services/videoUrlService';

const logger = new Logger('StandardVideoPreview');

interface StandardVideoPreviewProps {
  url: string | null;
  posterUrl: string | null;
  onError: (msg: string) => void;
  videoId?: string;
  onRefresh?: (e: React.MouseEvent) => void;
  isRefreshing?: boolean;
}

const StandardVideoPreview: React.FC<StandardVideoPreviewProps> = ({
  url,
  posterUrl,
  onError,
  videoId,
  onRefresh,
  isRefreshing = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lastErrorTime, setLastErrorTime] = useState<number | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(url);
  
  // Update currentUrl whenever the url prop changes
  useEffect(() => {
    setCurrentUrl(url);
  }, [url]);
  
  // Listen for URL refresh events
  useEffect(() => {
    const handleUrlRefreshed = (event: CustomEvent) => {
      const { original, fresh } = event.detail;
      logger.log(`URL refresh event received`);
      
      // If this component is using the expired URL, update to the fresh one
      if (currentUrl === original) {
        logger.log(`Updating expired URL to fresh URL: ${fresh.substring(0, 30)}...`);
        setCurrentUrl(fresh);
        setCurrentError(null);
        setErrorDetails(null);
        setErrorCount(0);
      }
    };
    
    // Add event listener
    document.addEventListener('videoUrlRefreshed', handleUrlRefreshed as EventListener);
    
    // Clean up
    return () => {
      document.removeEventListener('videoUrlRefreshed', handleUrlRefreshed as EventListener);
    };
  }, [currentUrl]);
  
  const handleError = (msg: string) => {
    const now = Date.now();
    setLastErrorTime(now);
    setErrorCount(prev => prev + 1);
    setCurrentError(msg);
    
    logger.error(`Video preview error: ${msg}`);
    logger.error(`Video URL: ${currentUrl || 'none'}`);
    logger.error(`Error count: ${errorCount + 1}`);
    logger.error(`Time since last error: ${lastErrorTime ? now - lastErrorTime : 'first error'} ms`);
    
    // Extract any potential details from the error message
    if (msg.includes(':')) {
      const parts = msg.split(':');
      setErrorDetails(parts.slice(1).join(':').trim());
    }
    
    onError(msg);
  };
  
  const handleRetry = () => {
    logger.log('Retry clicked in error component');
    setErrorCount(0);
    setCurrentError(null);
    setErrorDetails(null);
  };
  
  // Handle the refresh button click - attempt to recover directly from db
  const handleRefreshVideo = async (e: React.MouseEvent) => {
    if (onRefresh) {
      onRefresh(e);
      return;
    }
    
    if (!currentUrl) return;
    
    // If no external refresh handler provided, implement our own
    e.stopPropagation();
    setCurrentError(null);
    setErrorDetails(null);
    
    try {
      const freshUrl = await videoUrlService.forceRefreshUrl(currentUrl);
      if (freshUrl) {
        logger.log(`Refreshed URL: ${freshUrl.substring(0, 30)}...`);
        setCurrentUrl(freshUrl);
      }
    } catch (error) {
      logger.error('Error refreshing URL:', error);
      handleError('Error refreshing video');
    }
  };

  if (!currentUrl) {
    return (
      <div 
        className="flex flex-col items-center justify-center w-full h-full bg-muted/70 cursor-pointer relative"
        style={posterUrl ? {
          backgroundImage: `url(${posterUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {}}
      >
        <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
          <Play className="h-6 w-6 text-white" />
        </div>
        <div className="mt-2 text-xs text-muted-foreground flex items-center bg-black/50 px-2 py-1 rounded">
          <FileVideo className="h-3 w-3 mr-1" />
          Preview
        </div>
        
        {videoId && (
          <div className="absolute bottom-2 right-2">
            <Link to={`/videos/${videoId}`}>
              <Button size="sm" variant="secondary" className="gap-1 opacity-90 hover:opacity-100">
                <Eye className="h-3 w-3" />
                View
              </Button>
            </Link>
          </div>
        )}
        
        <div className="absolute top-2 right-2">
          <Button 
            size="sm" 
            variant="secondary" 
            className="gap-1 opacity-90 hover:opacity-100"
            onClick={handleRefreshVideo}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
            {isRefreshing ? "..." : "Refresh"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {currentError ? (
        <VideoPreviewError
          error={currentError}
          details={errorDetails || undefined}
          onRetry={handleRetry}
          videoSource={currentUrl}
        />
      ) : (
        <VideoPlayer 
          src={currentUrl} 
          controls={false}
          autoPlay={false}
          muted={true}
          className="w-full h-full object-cover"
          onError={handleError}
          poster={posterUrl || undefined}
          playOnHover={true}
          containerRef={containerRef}
        />
      )}
      
      {videoId && (
        <div className="absolute bottom-2 right-2 z-10">
          <Link to={`/videos/${videoId}`}>
            <Button size="sm" variant="secondary" className="gap-1 opacity-90 hover:opacity-100">
              <Eye className="h-3 w-3" />
              View
            </Button>
          </Link>
        </div>
      )}
      
      <div className="absolute top-2 right-2 z-10">
        <Button 
          size="sm" 
          variant="secondary" 
          className="gap-1 opacity-90 hover:opacity-100"
          onClick={handleRefreshVideo}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
          {isRefreshing ? "..." : "Refresh"}
        </Button>
      </div>
    </div>
  );
};

export default StandardVideoPreview;
