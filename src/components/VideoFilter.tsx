
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoFilterProps {
  videoFilter: string;
  setVideoFilter: (filter: string) => void;
  onRefresh: () => void;
  isDisabled?: boolean;
  isAdmin?: boolean;
}

const VideoFilter: React.FC<VideoFilterProps> = ({
  videoFilter,
  setVideoFilter,
  onRefresh,
  isDisabled = false,
  isAdmin = false
}) => {
  // Helper function to get consistent button classes
  const getFilterButtonClass = (filter: string) => {
    return cn(
      "px-4 py-2 rounded-md text-sm font-medium transition-colors",
      videoFilter === filter 
        ? "!bg-[#FEF7CD] !text-forest-dark hover:!bg-[#FEF7CD]" 
        : "bg-muted hover:bg-muted/80"
    );
  };
  
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div className="flex gap-2 items-center">
        <Select
          value={videoFilter}
          onValueChange={setVideoFilter}
          disabled={isDisabled}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="curated">Curated Videos</SelectItem>
            <SelectItem value="listed">Listed Videos</SelectItem>
            {isAdmin && (
              <SelectItem value="rejected">Rejected Videos</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => setVideoFilter('curated')}
          className={getFilterButtonClass('curated')}
          style={{
            backgroundColor: videoFilter === 'curated' ? '#FEF7CD' : '',
            color: videoFilter === 'curated' ? '#1A2D10' : ''
          }}
          variant="outline"
        >
          Curated
        </Button>
        <Button
          type="button"
          onClick={() => setVideoFilter('listed')}
          className={getFilterButtonClass('listed')}
          style={{
            backgroundColor: videoFilter === 'listed' ? '#FEF7CD' : '',
            color: videoFilter === 'listed' ? '#1A2D10' : ''
          }}
          variant="outline"
        >
          Listed
        </Button>
        {isAdmin && (
          <Button
            type="button"
            onClick={() => setVideoFilter('rejected')}
            className={getFilterButtonClass('rejected')}
            style={{
              backgroundColor: videoFilter === 'rejected' ? '#FEF7CD' : '',
              color: videoFilter === 'rejected' ? '#1A2D10' : ''
            }}
            variant="outline"
          >
            Rejected
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isDisabled}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
    </div>
  );
};

export default VideoFilter;
