import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { databaseSwitcher } from '@/lib/databaseSwitcher';
import Navigation from '@/components/Navigation';
import { UploadCloud, Loader2, Info, LockIcon, X, Edit, Plus, FileVideo } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { remoteStorage } from '@/lib/remoteStorage';
import { getCurrentUser, getCurrentUserProfile } from '@/lib/auth';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { VideoFile, VideoMetadata } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Form schema for overall LoRA information
const formSchema = z.object({
  headline: z.string().min(3, {
    message: "Headline must be at least 3 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  creator: z.enum(["self", "other"], {
    required_error: "Please specify who created this LoRA.",
  }),
  creatorName: z.string().optional(),
  url: z.string().url({
    message: "Please enter a valid URL.",
  }).optional().or(z.literal('')),
  model: z.enum(["wan", "hunyuan", "ltxv", "cogvideox", "animatediff"], {
    required_error: "Please select which model this LoRA is for.",
  })
});

// Form schema for individual video metadata
const videoMetadataSchema = z.object({
  title: z.string().min(1, { 
    message: "Title is required" 
  }),
  description: z.string().optional(),
  creator: z.enum(["self", "other"], {
    required_error: "Please specify who created this video.",
  }),
  creatorName: z.string().optional(),
});

interface VideoWithMetadata extends File {
  metadata?: VideoMetadata;
}

const Upload: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<VideoWithMetadata[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isEditingVideo, setIsEditingVideo] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Initialize form with react-hook-form and zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      headline: "",
      description: "",
      creator: "self",
      creatorName: "",
      url: "",
      model: "wan"
    },
  });

  // Form for individual video metadata
  const videoForm = useForm<z.infer<typeof videoMetadataSchema>>({
    resolver: zodResolver(videoMetadataSchema),
    defaultValues: {
      title: "",
      description: "",
      creator: "self",
      creatorName: "",
    },
  });
  
  const creatorType = form.watch("creator");
  const videoCreatorType = videoForm.watch("creator");

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        setIsAuthenticated(!!user);
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);

  const handleSelectFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to upload videos');
      navigate('/auth');
      return;
    }
    
    if (e.target.files && e.target.files.length > 0) {
      const fileArray = Array.from(e.target.files).filter(
        file => file.type.startsWith('video/')
      );
      
      if (fileArray.length === 0) {
        toast.error('Please select video files only.');
        return;
      }
      
      const filesWithMetadata = fileArray.map(file => {
        const videoFile = file as VideoWithMetadata;
        videoFile.metadata = {
          title: file.name.split('.')[0], // Default title from filename
          description: '',
          creator: 'self',
        };
        return videoFile;
      });
      
      setFiles(prevFiles => [...prevFiles, ...filesWithMetadata]);
    }
  }, [isAuthenticated, navigate]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please sign in to upload videos');
      navigate('/auth');
      return;
    }
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileArray = Array.from(e.dataTransfer.files).filter(
        file => file.type.startsWith('video/')
      );
      
      if (fileArray.length === 0) {
        toast.error('Please drop video files only.');
        return;
      }
      
      const filesWithMetadata = fileArray.map(file => {
        const videoFile = file as VideoWithMetadata;
        videoFile.metadata = {
          title: file.name.split('.')[0], // Default title from filename
          description: '',
          creator: 'self',
        };
        return videoFile;
      });
      
      setFiles(prevFiles => [...prevFiles, ...filesWithMetadata]);
    }
  }, [isAuthenticated, navigate]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const openEditVideoDialog = (index: number) => {
    const file = files[index];
    if (file && file.metadata) {
      videoForm.reset({
        title: file.metadata.title,
        description: file.metadata.description || '',
        creator: file.metadata.creator,
        creatorName: file.metadata.creatorName || '',
      });
      setIsEditingVideo(index);
    }
  };

  const saveVideoMetadata = (data: z.infer<typeof videoMetadataSchema>) => {
    if (isEditingVideo !== null) {
      setFiles(prevFiles => {
        const newFiles = [...prevFiles];
        const file = newFiles[isEditingVideo];
        if (file) {
          file.metadata = {
            title: data.title,
            description: data.description,
            creator: data.creator,
            creatorName: data.creator === 'other' ? data.creatorName : undefined,
          };
        }
        return newFiles;
      });
      setIsEditingVideo(null);
      videoForm.reset();
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to upload videos');
      navigate('/auth');
      return;
    }
    
    if (files.length === 0) {
      toast.error('Please select at least one video file to upload.');
      return;
    }
    
    // Check if all videos have titles
    const missingTitles = files.some(file => !file.metadata?.title);
    if (missingTitles) {
      toast.error('Please add titles to all videos before uploading.');
      return;
    }
    
    setUploading(true);
    
    try {
      const db = await databaseSwitcher.getDatabase();
      const userProfile = await getCurrentUserProfile();
      
      const reviewerName = userProfile?.username || 'Anonymous User';
      
      // Overall LoRA metadata
      const loraMetadata = {
        headline: values.headline,
        description: values.description,
        creator: values.creator,
        creatorName: values.creator === 'other' ? values.creatorName : undefined,
        url: values.url || undefined,
        model: values.model
      };
      
      for (const file of files) {
        const videoBlob = await file.arrayBuffer().then(buffer => new Blob([buffer], { type: file.type }));
        
        const videoFile: VideoFile = {
          id: `video_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          blob: videoBlob,
        };
        
        const videoLocation = await remoteStorage.uploadVideo(videoFile);
        console.log(`Video uploaded to Supabase: ${videoLocation}`);
        
        // Combine LoRA-level metadata with individual video metadata
        const videoMetadata = {
          ...loraMetadata,
          ...file.metadata,
        };
        
        await db.addEntry({
          video_location: videoLocation,
          reviewer_name: reviewerName,
          acting_video_location: null,
          skipped: false,
          metadata: videoMetadata
        });
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      toast.success(`${files.length} video${files.length > 1 ? 's' : ''} uploaded successfully!`);
      
      setFiles([]);
      setUploading(false);
      form.reset();
      
      navigate('/');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('An error occurred during upload. Please try again.');
      setUploading(false);
    }
  };

  const areFilesFilled = files.length > 0;

  const removeFile = (indexToRemove: number) => {
    setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background animate-fade-in">
      <Navigation />
      
      <main className="flex-1 container max-w-4xl py-8 px-4">
        <div className="animate-slide-in">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Propose LoRA</h1>
          <p className="text-muted-foreground mb-8">
            Upload videos of your LoRA generation for others to respond to with their acting.
          </p>
          
          {!isAuthenticated && (
            <div className="bg-muted p-4 rounded-lg mb-6 flex items-center gap-3">
              <LockIcon className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-medium">Authentication Required</h3>
                <p className="text-sm text-muted-foreground">
                  You need to <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/auth')}>sign in</Button> to upload videos.
                </p>
              </div>
            </div>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* LoRA Information section */}
              <div className="bg-muted/30 p-6 rounded-lg border border-border space-y-4">
                <h2 className="text-lg font-medium">LoRA Information</h2>
                
                {/* Headline field */}
                <FormField
                  control={form.control}
                  name="headline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Headline</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter a catchy headline for your LoRA" 
                          {...field} 
                          disabled={!isAuthenticated || uploading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description field */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your LoRA in a few sentences" 
                          {...field}
                          disabled={!isAuthenticated || uploading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Creator field */}
                <FormField
                  control={form.control}
                  name="creator"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Was this made by you or someone else?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                          disabled={!isAuthenticated || uploading}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="self" id="creator-self" />
                            <Label htmlFor="creator-self">I made this</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="other" id="creator-other" />
                            <Label htmlFor="creator-other">Someone else made this</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Creator name field - conditional rendering based on creator selection */}
                {creatorType === "other" && (
                  <FormField
                    control={form.control}
                    name="creatorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Who made this?</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter the creator's name" 
                            {...field} 
                            disabled={!isAuthenticated || uploading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* URL field */}
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL (optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Link to the LoRA (e.g., Civitai page)" 
                          {...field} 
                          disabled={!isAuthenticated || uploading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Model field */}
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Which model is this for?</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={!isAuthenticated || uploading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="wan">Wan</SelectItem>
                          <SelectItem value="hunyuan">Hunyuan</SelectItem>
                          <SelectItem value="ltxv">LTXV</SelectItem>
                          <SelectItem value="cogvideox">CogVideoX</SelectItem>
                          <SelectItem value="animatediff">Animatediff</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* File upload area */}
              <div className="space-y-2">
                <Label>Example Files</Label>
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all duration-200",
                    "hover:border-primary/50 hover:bg-secondary/50",
                    "flex flex-col items-center justify-center gap-4",
                    uploading && "pointer-events-none opacity-60",
                    !areFilesFilled && isAuthenticated && "border-destructive",
                    !isAuthenticated && "opacity-70 pointer-events-none"
                  )}
                  onClick={() => isAuthenticated && fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  {uploading ? (
                    <div className="text-center animate-scale-in">
                      <div className="flex justify-center mb-2">
                        <Loader2 className="h-12 w-12 text-primary animate-spin" />
                      </div>
                      <h3 className="text-lg font-medium">Uploading...</h3>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                        <UploadCloud className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">
                          {files.length > 0 
                            ? `${files.length} video${files.length > 1 ? 's' : ''} selected` 
                            : 'Drag videos here or click to browse'}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {files.length > 0 
                            ? 'You can continue to add more videos' 
                            : 'Upload example videos showing your LoRA in action'}
                        </p>
                        {!areFilesFilled && isAuthenticated && (
                          <p className="text-sm text-destructive mt-1 flex items-center gap-1 justify-center">
                            <Info className="h-3 w-3" /> At least one video is required
                          </p>
                        )}
                        {!isAuthenticated && (
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1 justify-center">
                            <LockIcon className="h-3 w-3" /> Sign in to upload videos
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={handleSelectFiles}
                    className="hidden"
                    disabled={uploading || !isAuthenticated}
                  />
                </div>
              </div>
              
              {/* List of selected videos with metadata */}
              {files.length > 0 && (
                <div className="animate-slide-in">
                  <h3 className="text-sm font-semibold mb-3">Selected videos:</h3>
                  <ul className="space-y-2">
                    {files.map((file, index) => (
                      <li key={index} className="flex items-center text-sm bg-secondary/50 p-4 rounded-md">
                        <FileVideo className="h-5 w-5 mr-2 text-muted-foreground" />
                        <div className="flex-1 overflow-hidden">
                          <div className="font-medium truncate">
                            {file.metadata?.title || file.name}
                          </div>
                          {file.metadata?.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {file.metadata.description}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB • 
                            {file.metadata?.creator === 'self' 
                              ? ' Created by you' 
                              : ` Created by ${file.metadata?.creatorName || 'someone else'}`}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditVideoDialog(index)}
                            className="h-8 w-8 p-0"
                            disabled={uploading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            disabled={uploading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || !isAuthenticated}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add more videos
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col items-end pt-4">
                {!areFilesFilled && isAuthenticated ? (
                  <p className="text-sm text-destructive mb-2 flex items-center gap-1">
                    <Info className="h-3 w-3" /> Please select at least one video to upload
                  </p>
                ) : null}
                
                <Button
                  className="rounded-full px-8"
                  disabled={uploading || files.length === 0 || !isAuthenticated}
                  type="submit"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : !isAuthenticated ? (
                    'Sign in to Upload'
                  ) : (
                    'Upload LoRA'
                  )}
                </Button>
              </div>
            </form>
          </Form>
          
          {/* Video metadata editing dialog */}
          <Dialog open={isEditingVideo !== null} onOpenChange={(open) => !open && setIsEditingVideo(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Video Details</DialogTitle>
              </DialogHeader>
              
              <Form {...videoForm}>
                <form onSubmit={videoForm.handleSubmit(saveVideoMetadata)} className="space-y-4">
                  {/* Video title */}
                  <FormField
                    control={videoForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Video title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Video description */}
                  <FormField
                    control={videoForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe this specific video" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Video creator */}
                  <FormField
                    control={videoForm.control}
                    name="creator"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Was this video made by you or someone else?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="self" id="video-creator-self" />
                              <Label htmlFor="video-creator-self">I made this</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="other" id="video-creator-other" />
                              <Label htmlFor="video-creator-other">Someone else made this</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Video creator name */}
                  {videoCreatorType === "other" && (
                    <FormField
                      control={videoForm.control}
                      name="creatorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Who made this video?</FormLabel>
                          <FormControl>
                            <Input placeholder="Creator's name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <DialogFooter className="mt-6">
                    <Button type="button" variant="outline" onClick={() => setIsEditingVideo(null)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
};

export default Upload;
