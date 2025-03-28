import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import VideoDropzoneComponent from '@/components/upload/VideoDropzone';
import VideoPreview from '@/components/VideoPreview';
import VideoMetadataForm from '@/components/upload/VideoMetadataForm';
import { toast } from 'sonner';
import { VideoMetadata } from '@/lib/types';

interface VideoMetadataForm {
  title: string;
  description: string;
  classification: 'art' | 'gen';
  creator: 'self' | 'someone_else';
  creatorName: string;
  isPrimary?: boolean;
}

interface VideoItem {
  id: string;
  file: File | null;
  url: string | null;
  metadata: VideoMetadataForm;
}

interface MultipleVideoUploaderProps {
  videos: VideoItem[];
  setVideos: React.Dispatch<React.SetStateAction<VideoItem[]>>;
}

const MultipleVideoUploader: React.FC<MultipleVideoUploaderProps> = ({ 
  videos, 
  setVideos 
}) => {
  const initialMetadata: VideoMetadataForm = {
    title: '',
    description: '',
    classification: 'gen',
    creator: 'self',
    creatorName: '',
    isPrimary: false,
  };

  React.useEffect(() => {
    if (videos.length === 0) {
      setVideos([{
        id: crypto.randomUUID(),
        file: null,
        url: null,
        metadata: {...initialMetadata, isPrimary: true}
      }]);
    }
  }, []);

  React.useEffect(() => {
    // Ensure only one empty slot exists
    const emptySlots = videos.filter(v => !v.file && !v.url);
    
    if (emptySlots.length > 1) {
      // Remove extra empty slots, keeping only the last one
      setVideos(prev => {
        const withContent = prev.filter(v => v.file || v.url);
        const lastEmptySlot = [...prev].reverse().find(v => !v.file && !v.url);
        return [...withContent, lastEmptySlot!];
      });
    }
    
    // If no empty slots exist, add one
    if (emptySlots.length === 0) {
      setVideos(prev => [...prev, {
        id: crypto.randomUUID(),
        file: null,
        url: null,
        metadata: {...initialMetadata, isPrimary: false}
      }]);
    }
  }, [videos]);

  React.useEffect(() => {
    const primaryCount = videos.filter(v => v.metadata.isPrimary).length;
    
    if (primaryCount === 0 && videos.length > 0) {
      setVideos(prev => prev.map((video, index) => 
        index === 0 ? { ...video, metadata: { ...video.metadata, isPrimary: true } } : video
      ));
    }
    else if (primaryCount > 1) {
      const lastPrimaryIndex = [...videos].reverse().findIndex(v => v.metadata.isPrimary);
      if (lastPrimaryIndex !== -1) {
        const actualIndex = videos.length - 1 - lastPrimaryIndex;
        setVideos(prev => prev.map((video, index) => 
          ({ ...video, metadata: { ...video.metadata, isPrimary: index === actualIndex } })
        ));
      }
    }
  }, [videos, setVideos]);
  
  const handleRemoveVideo = (id: string) => {
    const videoToRemove = videos.find(v => v.id === id);
    if (!videoToRemove?.file && !videoToRemove?.url) {
      return;
    }
    
    if (videos.filter(v => v.file || v.url).length <= 1) {
      toast.error('You must have at least one video');
      return;
    }
    
    const isRemovingPrimary = videos.find(v => v.id === id)?.metadata.isPrimary;
    
    const updatedVideos = videos.filter(video => video.id !== id);
    
    if (isRemovingPrimary && updatedVideos.some(v => v.file || v.url)) {
      const firstVideoWithContent = updatedVideos.find(v => v.file || v.url);
      if (firstVideoWithContent) {
        firstVideoWithContent.metadata.isPrimary = true;
      }
    }
    
    setVideos(updatedVideos);
  };
  
  const updateVideoMetadata = (id: string, field: keyof VideoMetadataForm, value: any) => {
    if (field === 'isPrimary' && value === true) {
      setVideos(prev => 
        prev.map(video => 
          video.id === id 
            ? { ...video, metadata: { ...video.metadata, [field]: value } } 
            : { ...video, metadata: { ...video.metadata, isPrimary: false } }
        )
      );
    } else {
      setVideos(prev => 
        prev.map(video => 
          video.id === id ? { 
            ...video, 
            metadata: { 
              ...video.metadata, 
              [field]: value 
            } 
          } : video
        )
      );
    }
  };
  
  const handleVideoFileDrop = (id: string) => {
    return (acceptedFiles: File[]) => {
      console.log("File dropped:", acceptedFiles);
      
      if (acceptedFiles.length === 0) return;
      
      if (acceptedFiles.length === 1) {
        // Single file upload - process as before
        const file = acceptedFiles[0];
        if (file) {
          const url = URL.createObjectURL(file);
          console.log("Created URL:", url);
          
          const fileName = file.name;
          const fileNameWithoutExtension = fileName.split('.').slice(0, -1).join('.');
          const defaultTitle = fileNameWithoutExtension || fileName;
          
          setVideos(prev => 
            prev.map(video => 
              video.id === id 
                ? { 
                    ...video, 
                    file: file, 
                    url: url,
                    metadata: {
                      ...video.metadata,
                      title: defaultTitle
                    }
                  } 
                : video
            )
          );
        }
      } else {
        // Multiple files uploaded - create new video items for all files after the first one
        const currentVideoIndex = videos.findIndex(v => v.id === id);
        const hasChanged = { current: false };
        
        // Process the first file for the current dropzone
        const firstFile = acceptedFiles[0];
        const firstUrl = URL.createObjectURL(firstFile);
        const firstFileName = firstFile.name;
        const firstFileNameWithoutExtension = firstFileName.split('.').slice(0, -1).join('.');
        const firstDefaultTitle = firstFileNameWithoutExtension || firstFileName;
        
        // Create new video items for the remaining files
        const additionalVideos = acceptedFiles.slice(1).map(file => {
          const url = URL.createObjectURL(file);
          const fileName = file.name;
          const fileNameWithoutExtension = fileName.split('.').slice(0, -1).join('.');
          const defaultTitle = fileNameWithoutExtension || fileName;
          
          return {
            id: crypto.randomUUID(),
            file: file,
            url: url,
            metadata: {
              ...initialMetadata,
              title: defaultTitle,
              isPrimary: false
            }
          };
        });
        
        setVideos(prev => {
          // First update the current dropzone video with the first file
          const updatedVideos = prev.map((video, index) => {
            if (video.id === id) {
              hasChanged.current = true;
              return { 
                ...video, 
                file: firstFile, 
                url: firstUrl,
                metadata: {
                  ...video.metadata,
                  title: firstDefaultTitle
                }
              };
            }
            return video;
          });
          
          // Then add the additional videos
          return [...updatedVideos, ...additionalVideos];
        });
      }
    };
  };
  
  const handleVideoLinkAdded = (id: string) => {
    return (linkUrl: string) => {
      console.log("Link added:", linkUrl);
      
      let defaultTitle = '';
      
      try {
        if (linkUrl.includes('youtube.com/') || linkUrl.includes('youtu.be/')) {
          const url = new URL(linkUrl);
          const videoId = url.searchParams.get('v') || 
                          linkUrl.split('/').pop()?.split('?')[0] || 
                          'YouTube Video';
          defaultTitle = `YouTube Video - ${videoId}`;
        } 
        else if (linkUrl.includes('vimeo.com/')) {
          const videoId = linkUrl.split('/').pop() || 'Vimeo Video';
          defaultTitle = `Vimeo Video - ${videoId}`;
        }
        else {
          const fileName = linkUrl.split('/').pop() || 'Video';
          const fileNameWithoutExtension = fileName.split('.').slice(0, -1).join('.');
          defaultTitle = fileNameWithoutExtension || fileName;
        }
      } catch (e) {
        defaultTitle = 'External Video';
      }
      
      setVideos(prev => 
        prev.map(video => 
          video.id === id 
            ? { 
                ...video, 
                file: null, 
                url: linkUrl,
                metadata: {
                  ...video.metadata,
                  title: defaultTitle
                }
              } 
            : video
        )
      );
    };
  };
  
  const handleRemoveVideoFile = (id: string) => {
    setVideos(prev => 
      prev.map(video => 
        video.id === id ? { ...video, file: null, url: null } : video
      )
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First render videos with content */}
        {videos.filter(v => v.file || v.url).map((video) => (
          <div key={video.id} className="p-6 border rounded-lg bg-card space-y-4">
            <div className="flex justify-between items-center mb-4">
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                onClick={() => handleRemoveVideo(video.id)}
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
            
            <div className="space-y-6">
              <div className="relative">
                <VideoPreview 
                  file={video.file} 
                  url={video.url} 
                  className="w-full mx-auto"
                />
              </div>
              
              <div className="mt-4">
                <VideoMetadataForm
                  videoId={video.id}
                  metadata={video.metadata}
                  updateMetadata={updateVideoMetadata}
                  canSetPrimary={true}
                />
              </div>
            </div>
          </div>
        ))}
        
        {/* Then render only ONE empty dropzone */}
        {videos.filter(v => !v.file && !v.url).slice(0, 1).map((video) => (
          <div key={video.id} className="p-6 border rounded-lg bg-card space-y-4">
            <div className="w-full flex justify-center">
              <VideoDropzoneComponent 
                id={video.id} 
                file={video.file} 
                url={video.url} 
                onDrop={handleVideoFileDrop(video.id)}
                onLinkAdded={handleVideoLinkAdded(video.id)}
                onRemove={() => handleRemoveVideoFile(video.id)}
                multiple={true}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default MultipleVideoUploader;
