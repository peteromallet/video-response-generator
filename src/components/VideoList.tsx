import React, { useState, useEffect } from 'react';
import { VideoEntry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, Edit, Trash2, Eye, FileVideo, Star } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from 'sonner';
import { databaseSwitcher } from '@/lib/databaseSwitcher';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AspectRatio } from "@/components/ui/aspect-ratio";
import VideoPreview from './VideoPreview';
import { videoUrlService } from '@/lib/services/videoUrlService';

interface VideoListProps {
  videos: VideoEntry[];
  onDelete: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  refetchData: () => void;
}

const VideoList: React.FC<VideoListProps> = ({ videos, onDelete, onApprove, onReject, refetchData }) => {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadVideoUrls = async () => {
      const urlMap: Record<string, string> = {};
      
      for (const video of videos) {
        try {
          const url = await videoUrlService.getVideoUrl(video.video_location);
          if (url) {
            urlMap[video.id] = url;
          }
        } catch (error) {
          console.error(`Error loading URL for video ${video.id}:`, error);
        }
      }
      
      setVideoUrls(urlMap);
    };
    
    loadVideoUrls();
  }, [videos]);

  useEffect(() => {
    if (videos && videos.length > 0) {
      setSelectAll(selectedVideos.length === videos.length);
    } else {
      setSelectAll(false);
    }
  }, [videos, selectedVideos]);

  const toggleVideoSelection = (id: string) => {
    setSelectedVideos((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((videoId) => videoId !== id)
        : [...prevSelected, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedVideos([]);
    } else {
      const allVideoIds = videos.map((video) => video.id);
      setSelectedVideos(allVideoIds);
    }
    setSelectAll(!selectAll);
  };

  const filteredVideos = videos.filter(video => {
    const searchTerm = filterText.toLowerCase();
    return (
      video.reviewer_name.toLowerCase().includes(searchTerm) ||
      video.id.toLowerCase().includes(searchTerm) ||
      (video.metadata?.title?.toLowerCase().includes(searchTerm) ?? false)
    );
  });

  const handleDeleteSelected = async () => {
    if (selectedVideos.length === 0) {
      toast.error('No videos selected for deletion.');
      return;
    }

    try {
      const db = await databaseSwitcher.getDatabase();
      for (const videoId of selectedVideos) {
        await db.deleteEntry(videoId);
      }
      toast.success('Selected videos deleted successfully.');
      setSelectedVideos([]);
      setSelectAll(false);
      refetchData();
    } catch (error) {
      console.error('Error deleting selected videos:', error);
      toast.error('Failed to delete selected videos.');
    }
  };

  const handleApproveSelected = async () => {
    if (selectedVideos.length === 0) {
      toast.error('No videos selected for approval.');
      return;
    }

    try {
      const db = await databaseSwitcher.getDatabase();
      for (const videoId of selectedVideos) {
        await db.setApprovalStatus(videoId, true);
      }
      toast.success('Selected videos approved successfully.');
      setSelectedVideos([]);
      setSelectAll(false);
      refetchData();
    } catch (error) {
      console.error('Error approving selected videos:', error);
      toast.error('Failed to approve selected videos.');
    }
  };

  const handleRejectSelected = async () => {
    if (selectedVideos.length === 0) {
      toast.error('No videos selected for rejection.');
      return;
    }

    try {
      const db = await databaseSwitcher.getDatabase();
      for (const videoId of selectedVideos) {
        await db.setApprovalStatus(videoId, false);
      }
      toast.success('Selected videos rejected successfully.');
      setSelectedVideos([]);
      setSelectAll(false);
      refetchData();
    } catch (error) {
      console.error('Error rejecting selected videos:', error);
      toast.error('Failed to reject selected videos.');
    }
  };

  const getStatusBadge = (status: boolean | null) => {
    if (status === null) {
      return <Badge variant="secondary">Pending</Badge>
    } else if (status) {
      return <Badge className="bg-green-500">Approved</Badge>
    } else {
      return <Badge variant="destructive">Rejected</Badge>
    }
  };

  const formatModelName = (model: string) => {
    switch (model) {
      case 'wan': return 'Wan';
      case 'hunyuan': return 'Hunyuan';
      case 'ltxv': return 'LTXV';
      case 'cogvideox': return 'CogVideoX';
      case 'animatediff': return 'Animatediff';
      default: return model;
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <Input
          type="text"
          placeholder="Filter videos..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={selectedVideos.length === 0}>
            Delete Selected
          </Button>
          <Button variant="outline" size="sm" onClick={handleApproveSelected} disabled={selectedVideos.length === 0}>
            Approve Selected
          </Button>
          <Button variant="secondary" size="sm" onClick={handleRejectSelected} disabled={selectedVideos.length === 0}>
            Reject Selected
          </Button>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 mb-4">
        <Checkbox
          checked={selectAll}
          onCheckedChange={toggleSelectAll}
          id="select-all"
        />
        <label htmlFor="select-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Select All
        </label>
      </div>
      
      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVideos.map((video) => (
            <Card key={video.id} className={cn(
              "overflow-hidden transition-all flex flex-col",
              selectedVideos.includes(video.id) && "ring-2 ring-primary"
            )}>
              <AspectRatio ratio={16/9} className="bg-muted">
                {videoUrls[video.id] ? (
                  <VideoPreview 
                    url={videoUrls[video.id]} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <FileVideo className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </AspectRatio>
              
              <CardHeader className="pb-2 pt-3 px-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 overflow-hidden flex items-center gap-2">
                    {video.metadata?.isPrimary && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    )}
                    <CardTitle className="text-base truncate">
                      {video.metadata?.title || 'Untitled'}
                    </CardTitle>
                  </div>
                  <Checkbox
                    checked={selectedVideos.includes(video.id)}
                    onCheckedChange={() => toggleVideoSelection(video.id)}
                    className="ml-2"
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  {video.metadata?.model && (
                    <Badge variant="outline" className="rounded-sm text-xs">
                      {formatModelName(video.metadata.model)}
                    </Badge>
                  )}
                  {getStatusBadge(video.admin_approved)}
                  {video.metadata?.isPrimary && (
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
                      Primary
                    </Badge>
                  )}
                </div>
                
                {video.metadata?.description && (
                  <CardDescription className="line-clamp-1 mt-1 text-xs">
                    {video.metadata.description}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="px-3 py-1 text-xs space-y-1 flex-grow">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">By:</span>
                  <span className="font-medium truncate max-w-[120px]">
                    {video.metadata?.creator === 'self' 
                      ? video.reviewer_name 
                      : video.metadata?.creatorName || 'Unknown'}
                  </span>
                </div>
              </CardContent>
              
              <CardFooter className="px-3 py-2 border-t flex justify-between mt-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs h-7 px-2"
                  onClick={() => navigate(`/assets/loras/${video.id}`)}
                >
                  <Eye className="h-3 w-3 mr-1" /> View
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => navigate(`/edit/${video.id}`)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(video.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {video.admin_approved === null && (
                      <>
                        <DropdownMenuItem onClick={() => onApprove(video.id)}>
                          Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onReject(video.id)}>
                          Reject
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardFooter>
            </Card>
          ))}
          
          {filteredVideos.length === 0 && (
            <div className="col-span-full text-center py-8">
              <FileVideo className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-2 text-lg font-medium">No videos found</h3>
              <p className="text-muted-foreground">
                {filterText ? "Try a different search term" : "Upload some videos to get started"}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default VideoList;

