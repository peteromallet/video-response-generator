
export interface VideoEntry {
  id: string;
  video_location: string;
  reviewer_name: string;
  acting_video_location: string | null;
  skipped: boolean;
  created_at: string;
  admin_approved: boolean;
}

export interface RecordedVideo {
  blob: Blob;
  url: string;
}

export interface VideoFile {
  id: string;
  blob: Blob;
}

// Storage configuration options
export interface StorageConfig {
  type: 'local' | 'remote';
  remoteUrl?: string;
  apiKey?: string;
}

// Add custom event type for TypeScript
declare global {
  interface MediaRecorderEventMap {
    dataavailable: BlobEvent;
  }
  
  // The issue was here - we don't need to redeclare BlobEvent as it's already
  // defined in the DOM lib. Just extending the existing type as needed.
}
