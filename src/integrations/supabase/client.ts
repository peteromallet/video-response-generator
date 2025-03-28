
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { Logger } from '@/lib/logger';

const logger = new Logger('SupabaseClient');

const SUPABASE_URL = "https://ujlwuvkrxlvoswwkerdf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqbHd1dmtyeGx2b3N3d2tlcmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE3ODM1MDYsImV4cCI6MjA1NzM1OTUwNn0.htwJHr4Z4NlMZYVrH1nNGkU53DyBTWgMeOeUONYFy_4";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? localStorage : undefined,
  }
});

// Log initialization for debugging
logger.log('Supabase client initialized with auth configuration');
logger.log('supabase.ts: Re-exporting the main Supabase client');

// Check if the videos bucket exists but don't try to create it
// This fixes the "maximum allowed size" error
export const checkVideoBucket = async () => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const videoBucket = buckets?.find(bucket => bucket.name === 'videos');
    
    if (!videoBucket) {
      logger.log('Videos bucket does not exist. Please create it in the Supabase dashboard.');
    } else {
      logger.log('Videos bucket exists');
    }
  } catch (error) {
    logger.error('Error checking if videos bucket exists:', error);
  }
};

// Function to check if RLS (Row Level Security) permissions are working
export const testRLSPermissions = async () => {
  try {
    logger.log('Testing RLS permissions...');
    const { data: session } = await supabase.auth.getSession();
    const isAuthenticated = !!session?.session?.user;
    
    logger.log(`Auth status: ${isAuthenticated ? 'Authenticated' : 'Not authenticated'}`);
    
    // Try to fetch assets
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('*')
      .limit(1);
      
    if (assetsError) {
      logger.error('Error testing assets access:', assetsError);
    } else {
      logger.log(`Assets access test result: ${assets ? 'Success' : 'No data'}`);
    }
    
    // Try to fetch media
    const { data: media, error: mediaError } = await supabase
      .from('media')
      .select('*')
      .limit(1);
      
    if (mediaError) {
      logger.error('Error testing media access:', mediaError);
    } else {
      logger.log(`Media access test result: ${media ? 'Success' : 'No data'}`);
    }
    
    return {
      isAuthenticated,
      assetsAccess: !assetsError,
      mediaAccess: !mediaError
    };
  } catch (error) {
    logger.error('Error testing RLS permissions:', error);
    return {
      isAuthenticated: false,
      assetsAccess: false,
      mediaAccess: false
    };
  }
};

// Call bucket check and RLS test on startup
if (typeof window !== 'undefined') {
  checkVideoBucket().catch(logger.error);
  testRLSPermissions().catch(logger.error);
}
