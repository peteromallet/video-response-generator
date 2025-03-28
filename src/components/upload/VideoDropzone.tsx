
import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload as UploadIcon, Link as LinkIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface VideoDropzoneProps {
  id: string;
  file: File | null;
  url: string | null;
  onDrop: (acceptedFiles: File[]) => void;
  onLinkAdded?: (link: string) => void;
  onRemove?: () => void;
  multiple?: boolean;
}

const VideoDropzone: React.FC<VideoDropzoneProps> = ({ 
  id, 
  file, 
  url, 
  onDrop, 
  onLinkAdded, 
  onRemove,
  multiple = true // Default to true to enable multiple file uploads
}) => {
  // Log props to make sure they're being passed correctly
  console.log(`VideoDropzone props - id: ${id}, file: ${file ? file.name : 'null'}, url: ${url}`);
  
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [videoLink, setVideoLink] = useState('');
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      console.log("Dropzone onDrop called with files:", acceptedFiles);
      if (acceptedFiles && acceptedFiles.length > 0) {
        onDrop(acceptedFiles);
      }
    },
    accept: {
      'video/*': []
    },
    maxSize: 100 * 1024 * 1024, // 100MB max size
    multiple: multiple, // Allow multiple files to be selected
  });
  
  const toggleLinkInput = () => {
    setShowLinkInput(!showLinkInput);
  };
  
  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation for video URLs
    const isYoutubeUrl = videoLink.includes('youtube.com/') || videoLink.includes('youtu.be/');
    const isVimeoUrl = videoLink.includes('vimeo.com/');
    const isDirectVideoUrl = /\.(mp4|webm|ogg|mov)(\?.*)?$/.test(videoLink);
    
    if (!videoLink) {
      toast.error('Please enter a video URL');
      return;
    }
    
    if (!isYoutubeUrl && !isVimeoUrl && !isDirectVideoUrl) {
      toast.error('Please enter a valid video URL (YouTube, Vimeo, or direct video link)');
      return;
    }
    
    if (onLinkAdded) {
      onLinkAdded(videoLink);
      setVideoLink('');
      setShowLinkInput(false);
    }
  };

  const handleRemoveVideo = () => {
    if (onRemove) {
      onRemove();
    }
  };
  
  // Prevent nested form issue by using a div instead
  if (showLinkInput) {
    return (
      <div className="w-full">
        <div className="space-y-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center">
              <LinkIcon className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm font-medium">Add video URL</span>
            </div>
            <Input
              type="url"
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value)}
              placeholder="Paste YouTube, Vimeo, or direct video URL"
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleLinkSubmit}>Add Video</Button>
            <Button type="button" variant="outline" size="sm" onClick={toggleLinkInput}>
              Cancel
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Supported: YouTube, Vimeo, or direct video links (.mp4, .webm, etc.)
        </p>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      {file || url ? (
        <div className="mb-4">
          <Button 
            type="button" 
            variant="destructive" 
            size="sm" 
            onClick={handleRemoveVideo}
            className="mb-2"
          >
            <X className="h-4 w-4 mr-2" />
            Remove Video
          </Button>
        </div>
      ) : null}
      
      <div 
        {...getRootProps()} 
        className="dropzone mt-1 border-2 border-dashed rounded-md p-8 text-center cursor-pointer bg-muted/50 w-full md:w-1/2 mx-auto"
      >
        <input {...getInputProps()} id={`video-${id}`} />
        <div className="flex flex-col items-center justify-center">
          <UploadIcon className="h-12 w-12 text-muted-foreground mb-4" />
          {
            isDragActive ?
              <p>Drop the videos here ...</p> :
              <>
                <p className="text-lg font-medium mb-2">Drag 'n' drop videos here</p>
                <p className="text-sm text-muted-foreground">or click to select files</p>
                <p className="text-xs text-muted-foreground mt-2">Max size: 100MB per file</p>
              </>
          }
        </div>
      </div>
      <div className="text-center mt-2">
        <button 
          className="text-sm text-primary underline cursor-pointer" 
          onClick={toggleLinkInput}
          type="button"
        >
          Or share a link
        </button>
      </div>
    </div>
  );
};

export default VideoDropzone;
