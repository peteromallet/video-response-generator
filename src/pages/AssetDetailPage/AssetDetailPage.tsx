
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation, { Footer } from '@/components/Navigation';
import { VideoEntry } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import VideoLightbox from '@/components/VideoLightbox';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Logger } from '@/lib/logger';

// Custom hooks
import { useAssetDetails } from './hooks/useAssetDetails';
import { useAssetAdminActions } from './hooks/useAssetAdminActions';

// Components
import AssetHeader from './components/AssetHeader';
import AssetInfoCard from './components/AssetInfoCard';
import AssetVideoSection from './components/AssetVideoSection';

const logger = new Logger('AssetDetailPage');

const AssetDetailPage: React.FC = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [selectedVideo, setSelectedVideo] = useState<VideoEntry | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetchFailed, setHasFetchFailed] = useState(false);

  const id = params.id;
  
  // Log entry to help debug when this component renders
  logger.log(`AssetDetailPage - Fetching asset details for ID: ${id}`);

  const {
    asset,
    videos,
    isLoading: assetLoading,
    dataFetchAttempted,
    creatorDisplayName,
    getCreatorName,
    fetchAssetDetails,
    setAsset,
    setDataFetchAttempted
  } = useAssetDetails(id);

  const {
    isApproving,
    handleCurateAsset,
    handleListAsset,
    handleRejectAsset,
    handleDeleteVideo,
    handleApproveVideo
  } = useAssetAdminActions(id, setAsset, fetchAssetDetails);

  // Sync loading state
  useEffect(() => {
    setIsLoading(assetLoading || (authLoading && user !== null));
  }, [assetLoading, authLoading, user]);

  // Handle fetch failure after timeout
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (isLoading && !hasFetchFailed) {
      timeoutId = setTimeout(() => {
        if (isLoading) {
          logger.warn(`Asset fetch timeout reached for ID: ${id}`);
          setHasFetchFailed(true);
          setIsLoading(false);
        }
      }, 15000); // 15 second timeout
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading, id, hasFetchFailed]);

  const handleRetry = () => {
    setIsLoading(true);
    setHasFetchFailed(false);
    setDataFetchAttempted(false);
    
    // Add a small delay to ensure state updates have propagated
    setTimeout(() => {
      fetchAssetDetails();
    }, 100);
  };

  const handleGoBack = () => {
    navigate('/');
  };

  const handleOpenLightbox = (video: VideoEntry) => {
    setSelectedVideo(video);
    setIsLightboxOpen(true);
  };

  const handleCloseLightbox = () => {
    setIsLightboxOpen(false);
  };

  if (isLoading) {
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
            <h1 className="text-2xl font-bold">Loading LoRA Details...</h1>
          </div>
          <LoadingState />
        </main>
        <Footer />
      </div>
    );
  }

  if ((!asset && dataFetchAttempted) || hasFetchFailed) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 container max-w-6xl py-8 px-4">
          <EmptyState 
            title="LoRA not found"
            description={hasFetchFailed 
              ? "Failed to load the LoRA details. There might be a connectivity issue."
              : "The requested LoRA could not be found."}
          />
          <div className="flex justify-center gap-4 mt-6">
            <Button onClick={handleGoBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <Button onClick={handleRetry} variant="outline">
              Retry Loading
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container max-w-6xl py-8 px-4">
        <AssetHeader asset={asset} handleGoBack={handleGoBack} />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AssetInfoCard 
            asset={asset}
            creatorDisplayName={creatorDisplayName}
            isAdmin={isAdmin}
            isApproving={isApproving}
            handleCurateAsset={handleCurateAsset}
            handleListAsset={handleListAsset}
            handleRejectAsset={handleRejectAsset}
            getCreatorName={getCreatorName}
          />
          
          <AssetVideoSection 
            asset={asset}
            videos={videos}
            isAdmin={isAdmin}
            handleOpenLightbox={handleOpenLightbox}
            handleApproveVideo={handleApproveVideo}
            handleDeleteVideo={handleDeleteVideo}
            fetchAssetDetails={fetchAssetDetails}
          />
        </div>
      </main>
      
      <Footer />
      
      {selectedVideo && (
        <VideoLightbox
          isOpen={isLightboxOpen}
          onClose={handleCloseLightbox}
          videoUrl={selectedVideo.video_location}
          title={selectedVideo.metadata?.title || `Video by ${selectedVideo.reviewer_name}`}
          creator={selectedVideo.reviewer_name}
        />
      )}
    </div>
  );
};

export default AssetDetailPage;
