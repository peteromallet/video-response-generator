
import React, { useRef } from 'react';
import { Play, FileVideo, Eye, RefreshCw } from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

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
  
  if (!url) {
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
        
        {onRefresh && (
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={onRefresh} 
            disabled={isRefreshing}
            className="mt-2 gap-1 bg-black/50 text-white hover:bg-black/70"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
        
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
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <VideoPlayer 
        src={url} 
        controls={false}
        autoPlay={false}
        muted={true}
        className="w-full h-full object-cover"
        onError={onError}
        poster={posterUrl || undefined}
        playOnHover={true}
        containerRef={containerRef}
      />
      
      {onRefresh && (
        <div className="absolute top-2 right-2">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={onRefresh} 
            disabled={isRefreshing}
            className="gap-1 bg-black/50 text-white hover:bg-black/70"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      )}
      
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
    </div>
  );
};

export default StandardVideoPreview;
