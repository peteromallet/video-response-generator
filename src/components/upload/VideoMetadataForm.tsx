
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from "@/components/ui/card";

interface VideoMetadataFormProps {
  videoId: string;
  metadata: {
    title: string;
    description: string;
    classification: 'art' | 'gen';
    creator: 'self' | 'someone_else';
    creatorName: string;
    isPrimary?: boolean;
  };
  updateMetadata: (id: string, field: string, value: any) => void;
  canSetPrimary?: boolean;
  disabled?: boolean;
}

const VideoMetadataForm: React.FC<VideoMetadataFormProps> = ({ 
  videoId, 
  metadata, 
  updateMetadata, 
  canSetPrimary = true,
  disabled = false
}) => {
  const { user } = useAuth();
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Video Details</h3>
            
            <div>
              <Label htmlFor={`title-${videoId}`} className="text-sm font-medium mb-1.5 block">
                Title
              </Label>
              <Input
                type="text"
                id={`title-${videoId}`}
                placeholder="Optional video title"
                value={metadata.title}
                onChange={(e) => updateMetadata(videoId, 'title', e.target.value)}
                disabled={disabled}
              />
            </div>
            
            <div>
              <Label htmlFor={`description-${videoId}`} className="text-sm font-medium mb-1.5 block">
                Description
              </Label>
              <Textarea
                id={`description-${videoId}`}
                placeholder="Optional video description"
                value={metadata.description}
                onChange={(e) => updateMetadata(videoId, 'description', e.target.value)}
                disabled={disabled}
                className="min-h-[80px]"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Classification</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium mb-2 block">Video Classification</Label>
                <RadioGroup 
                  value={metadata.classification}
                  onValueChange={(value) => updateMetadata(videoId, 'classification', value)}
                  className="flex flex-col space-y-2"
                  disabled={disabled}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="gen" id={`classification-gen-${videoId}`} />
                    <Label htmlFor={`classification-gen-${videoId}`} className="cursor-pointer">Generation</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="art" id={`classification-art-${videoId}`} />
                    <Label htmlFor={`classification-art-${videoId}`} className="cursor-pointer">Artwork</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label className="text-sm font-medium mb-2 block">Creator</Label>
                <RadioGroup 
                  value={metadata.creator}
                  onValueChange={(value) => updateMetadata(videoId, 'creator', value)}
                  className="flex flex-col space-y-2"
                  disabled={disabled}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="self" id={`creator-self-${videoId}`} />
                    <Label htmlFor={`creator-self-${videoId}`} className="cursor-pointer">Me</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="someone_else" id={`creator-someone-else-${videoId}`} />
                    <Label htmlFor={`creator-someone-else-${videoId}`} className="cursor-pointer">Someone else</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            
            {metadata.creator === 'someone_else' && (
              <div>
                <Label htmlFor={`creator-name-${videoId}`} className="text-sm font-medium mb-1.5 block">
                  Creator Username <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  id={`creator-name-${videoId}`}
                  placeholder="Username of the creator"
                  value={metadata.creatorName}
                  onChange={(e) => updateMetadata(videoId, 'creatorName', e.target.value)}
                  required
                  disabled={disabled}
                />
              </div>
            )}
          </div>
          
          {canSetPrimary && (
            <div className="pt-2">
              <div className="flex items-center space-x-3">
                <Switch
                  id={`is-primary-${videoId}`}
                  checked={metadata.isPrimary}
                  onCheckedChange={(checked) => updateMetadata(videoId, 'isPrimary', checked)}
                  disabled={disabled}
                />
                <Label htmlFor={`is-primary-${videoId}`} className="font-medium cursor-pointer">
                  Use as primary media for this LoRA
                </Label>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoMetadataForm;
