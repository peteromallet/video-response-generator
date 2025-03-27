
import React from 'react';
import { AlertCircle, ExternalLink, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logger } from '@/lib/logger';
import { toast } from 'sonner';

const logger = new Logger('VideoPreviewError');

interface VideoPreviewErrorProps {
  error: string;
  onRetry: () => void;
  details?: string;
  videoSource?: string;
}

const VideoPreviewError: React.FC<VideoPreviewErrorProps> = ({ 
  error, 
  onRetry, 
  details,
  videoSource
}) => {
  // Log the error for debugging
  logger.error(`Video preview error: ${error}`);
  if (details) {
    logger.error(`Error details: ${details}`);
  }
  if (videoSource) {
    logger.error(`Problem video source: ${videoSource}`);
  }

  const handleRefreshClick = () => {
    logger.log('Manually refreshing video...');
    toast.info('Attempting to refresh video...');
    onRetry();
  };

  const handlePageRefresh = () => {
    logger.log('Refreshing entire page...');
    toast.info('Refreshing page...');
    window.location.reload();
  };

  // Customize error message for specific error types
  const getActionText = () => {
    if (error.includes('URL safety check') || (details && details.includes('URL safety check'))) {
      return 'This is likely due to browser security restrictions. Try refreshing the entire page, or try a different browser.';
    }
    if (error.includes('blob') || (details && details.includes('blob'))) {
      return 'The video link may have expired. Click "Try again" to get a fresh video URL.';
    }
    if (error.includes('security') || error.includes('blocked')) {
      return 'Your browser is blocking this video for security reasons. Try using a different browser or refreshing the page.';
    }
    if (error.includes('could not be loaded from database')) {
      return 'Video data could not be retrieved. This could be a temporary issue. Please try again in a few moments.';
    }
    return '';
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
      <div className="bg-background p-4 rounded-lg max-w-[90%] text-center">
        <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
        <h4 className="font-medium text-sm mb-1">Error loading video</h4>
        <p className="text-xs text-muted-foreground mb-2">{error}</p>
        
        {getActionText() && (
          <p className="text-xs text-amber-600 mt-1 mb-2">{getActionText()}</p>
        )}
        
        {details && (
          <div className="mb-3">
            <details className="text-left">
              <summary className="text-xs text-muted-foreground cursor-pointer">View technical details</summary>
              <p className="text-xs text-muted-foreground p-2 bg-muted rounded overflow-auto max-h-[60px] mt-1">
                {details}
              </p>
            </details>
          </div>
        )}
        
        <div className="flex justify-center gap-2">
          <Button size="sm" onClick={handleRefreshClick} variant="default" className="gap-1">
            <RefreshCw className="h-3 w-3" /> Try again
          </Button>
          
          <Button size="sm" onClick={handlePageRefresh} variant="outline" className="gap-1">
            <RefreshCw className="h-3 w-3" /> Refresh page
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoPreviewError;
