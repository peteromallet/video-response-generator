
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Logger } from '@/lib/logger';

const logger = new Logger('AuthCallback');

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [processingComplete, setProcessingComplete] = useState(false);
  
  useEffect(() => {
    let isActive = true; // For cleanup
    let timeoutId: number | null = null;
    
    const handleAuthCallback = async () => {
      if (processingComplete) return;
      
      try {
        logger.log('In AuthCallback, processing...');
        
        // Parse the URL parameters to get the returnUrl if present
        const searchParams = new URLSearchParams(location.search);
        const returnUrl = searchParams.get('returnUrl') || '/';
        logger.log(`AuthCallback: Return URL is ${returnUrl}`);
        
        // Check for hash in URL (from OAuth redirect)
        if (window.location.hash) {
          logger.log('AuthCallback: Found hash in URL');
          
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          if (hashParams.get('error')) {
            throw new Error(hashParams.get('error_description') || 'Authentication error');
          }
        }
        
        // Check if we're already authenticated
        logger.log('AuthCallback: Checking for existing session');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (data?.session) {
          // Authentication successful
          logger.log('AuthCallback: Found session, authentication successful');
          
          if (isActive) {
            setProcessingComplete(true);
            toast.success('Successfully signed in!');
            
            // Delay redirect slightly to ensure state updates are processed
            timeoutId = window.setTimeout(() => {
              if (isActive) {
                logger.log(`AuthCallback: Redirecting to ${returnUrl}`);
                navigate(returnUrl, { replace: true });
              }
            }, 500);
          }
        } else {
          // No session found, redirect to auth page with return URL preserved
          logger.log('AuthCallback: No session found, redirecting to auth');
          
          if (isActive) {
            setProcessingComplete(true);
            
            timeoutId = window.setTimeout(() => {
              if (isActive) {
                navigate(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
              }
            }, 300);
          }
        }
      } catch (err: any) {
        logger.error('Error during auth callback:', err);
        
        if (isActive) {
          setProcessingComplete(true);
          setError(err.message || 'An error occurred during authentication');
          toast.error(`Authentication error: ${err.message}`);
          
          // Redirect to auth page after a short delay
          timeoutId = window.setTimeout(() => {
            if (isActive) {
              navigate('/auth', { replace: true });
            }
          }, 2000);
        }
      } finally {
        if (isActive) {
          setIsProcessing(false);
        }
      }
    };
    
    // Only run once
    if (!processingComplete) {
      handleAuthCallback();
    }
    
    return () => {
      logger.log('AuthCallback: Cleaning up');
      isActive = false;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [navigate, location.search, processingComplete]);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      {error ? (
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Authentication Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <p>Redirecting to login page...</p>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h1 className="text-2xl font-bold">Finalizing Authentication</h1>
          <p className="text-muted-foreground">Please wait while we complete the sign-in process...</p>
        </div>
      )}
    </div>
  );
};

export default AuthCallback;
