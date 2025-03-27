
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import VideoList from '@/components/VideoList';
import { LoraAsset, VideoEntry } from '@/lib/types';
import { toast } from 'sonner';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import { videoUrlService } from '@/lib/services/videoUrlService';

const AssetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<LoraAsset | null>(null);
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAssetDetails = async () => {
      if (!id) {
        toast.error('No asset ID provided');
        return;
      }

      try {
        // Fetch asset details
        const { data: assetData, error: assetError } = await supabase
          .from('assets')
          .select('*')
          .eq('id', id)
          .single();

        if (assetError) throw assetError;

        // Fetch associated videos from asset_media or directly from media table
        const { data: videoData, error: videoError } = await supabase
          .from('media')
          .select('*')
          .eq('type', 'video');

        if (videoError) throw videoError;

        // Filter videos that match this asset (by name or through primary_media_id)
        const assetVideos = videoData.filter(video => 
          video.title?.includes(assetData.name) || 
          video.id === assetData.primary_media_id
        );

        // Convert Supabase media format to VideoEntry format
        const convertedVideos: VideoEntry[] = await Promise.all(
          assetVideos.map(async (media: any) => {
            try {
              const videoUrl = await videoUrlService.getVideoUrl(media.url);
              
              return {
                id: media.id,
                video_location: videoUrl,
                reviewer_name: media.creator || 'Unknown',
                skipped: false,
                created_at: media.created_at,
                admin_approved: null,
                user_id: media.user_id,
                metadata: {
                  title: media.title,
                  description: '',
                  classification: media.classification,
                  model: media.type,
                  loraName: assetData.name,
                  loraDescription: assetData.description,
                  assetId: assetData.id
                }
              };
            } catch (error) {
              console.error(`Error processing video ${media.id}:`, error);
              return null;
            }
          })
        );

        setAsset(assetData);
        setVideos(convertedVideos.filter(v => v !== null) as VideoEntry[]);
      } catch (error) {
        console.error('Error fetching asset details:', error);
        toast.error('Failed to load asset details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssetDetails();
  }, [id]);

  const handleGoBack = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 container max-w-6xl py-8 px-4">
          <LoadingState />
        </main>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 container max-w-6xl py-8 px-4">
          <EmptyState 
            title="Asset not found"
            description="The requested asset could not be found."
          />
          <div className="flex justify-center mt-6">
            <Button onClick={handleGoBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container max-w-6xl py-8 px-4">
        <div className="mb-4 flex items-center">
          <Button 
            variant="outline" 
            onClick={handleGoBack}
            className="mr-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Asset Details</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>{asset?.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {asset?.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                  <p>{asset.description}</p>
                </div>
              )}
              
              {asset?.creator && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Creator</h3>
                  <p>{asset.creator}</p>
                </div>
              )}
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Type</h3>
                <Badge variant="outline">{asset?.type}</Badge>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Created At</h3>
                <p>{asset?.created_at ? new Date(asset.created_at).toLocaleDateString() : 'Unknown'}</p>
              </div>
            </CardContent>
          </Card>
          
          <div className="md:col-span-2">
            <h2 className="text-xl font-bold mb-4">Associated Videos</h2>
            {videos.length > 0 ? (
              <VideoList 
                videos={videos} 
                onDelete={() => {}} 
                onApprove={() => {}} 
                onReject={() => {}} 
                refetchData={() => {}}
              />
            ) : (
              <EmptyState 
                title="No Videos"
                description="No videos are currently associated with this asset."
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AssetDetailPage;
