
import React, { useState, useEffect } from 'react';
import { LoraAsset } from '@/lib/types';
import { Card } from "@/components/ui/card";
import { ArrowUpRight, FileVideo } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { videoUrlService } from '@/lib/services/videoUrlService';
import { Logger } from '@/lib/logger';
import VideoPreview from '../VideoPreview';

interface LoraCardProps {
  lora: LoraAsset;
}

const logger = new Logger('LoraCard');

const LoraCard: React.FC<LoraCardProps> = ({ lora }) => {
  const navigate = useNavigate();
  const [primaryVideoUrl, setPrimaryVideoUrl] = useState<string | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  
  useEffect(() => {
    const loadPrimaryVideoUrl = async () => {
      setIsLoadingVideo(true);
      try {
        if (lora.primaryVideo?.id) {
          const url = await videoUrlService.getVideoUrl(lora.primaryVideo.video_location);
          if (url) {
            setPrimaryVideoUrl(url);
            logger.log(`Successfully loaded database URL for LoRA ${lora.name}`);
          } else {
            logger.warn(`Empty or invalid URL returned for LoRA ${lora.name}`);
          }
        } else {
          if (lora.videos && lora.videos.length > 0) {
            const firstVideo = lora.videos.find(v => v.admin_approved !== 'Rejected');
            if (firstVideo) {
              const url = await videoUrlService.getVideoUrl(firstVideo.video_location);
              if (url) {
                setPrimaryVideoUrl(url);
                logger.log(`Used fallback video for LoRA ${lora.name}`);
              }
            }
          }
        }
      } catch (error) {
        logger.error(`Error loading primary video URL for LoRA ${lora.name}:`, error);
      } finally {
        setIsLoadingVideo(false);
      }
    };
    
    loadPrimaryVideoUrl();
  }, [lora]);
  
  const handleNavigate = () => {
    navigate(`/assets/loras/${lora.id}`);
  };
  
  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <div 
        className="aspect-video relative cursor-pointer group" 
        onClick={handleNavigate}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {isLoadingVideo ? (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <FileVideo className="h-8 w-8 text-muted-foreground animate-pulse" />
          </div>
        ) : primaryVideoUrl ? (
          <>
            <VideoPreview 
              url={primaryVideoUrl} 
              className="w-full h-full" 
              title={lora.name}
              creator={`By: ${lora.creator || 'Unknown'}`}
            />
            <div className={`absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center`}>
              <div className="bg-white bg-opacity-0 group-hover:bg-opacity-70 rounded-full p-2 transform scale-0 group-hover:scale-100 transition-all duration-300">
                <ArrowUpRight className="h-5 w-5 text-primary" />
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <FileVideo className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>
    </Card>
  );
};

export default LoraCard;
