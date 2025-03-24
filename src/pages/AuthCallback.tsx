
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
  
  useEffect(() => {
    let isActive = true; // For cleanup
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Set a timeout to avoid infinite loading state
    const maxWaitTimeoutId = setTimeout(() => {
      if (isActive && isProcessing) {
        logger.error('Auth callback timed out after 15 seconds');
        setError('Authentication timed out. Please try again.');
        toast.error('Authentication timed out. Please try again.');
        navigate('/auth', { replace: true });
      }
    }, 15000); // 15 second timeout
    
    const handleAuthCallback = async () => {
      try {
        logger.log('AuthCallback: Processing authentication callback', { 
          hash: !!window.location.hash,
          hashLength: window.location.hash.length,
          query: window.location.search
        });
        
        // Parse the URL parameters to get the returnUrl if present
        const searchParams = new URLSearchParams(location.search);
        const returnUrl = searchParams.get('returnUrl') || '/';
        logger.log(`AuthCallback: Return URL is ${returnUrl}`);
        
        // Force a storage sync to ensure session tokens are saved correctly
        try {
          await localStorage.setItem('test-storage', 'test');
          localStorage.removeItem('test-storage');
        } catch (storageErr) {
          logger.error('Storage test failed:', storageErr);
        }
        
        // Handle hash fragment if present (implicit flow)
        if (window.location.hash) {
          logger.log('AuthCallback: Found hash fragment, processing...');
          
          // Let Supabase handle the hash fragment
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            logger.error('Error processing auth callback with hash:', error);
            throw error;
          }
          
          if (data.session) {
            logger.log('AuthCallback: Session established from hash fragment');
            
            if (isActive) {
              toast.success('Successfully signed in!');
              
              timeoutId = setTimeout(() => {
                if (isActive) {
                  logger.log(`AuthCallback: Redirecting to ${returnUrl}`);
                  navigate(returnUrl, { replace: true });
                }
              }, 1000);
            }
            return;
          }
        }
        
        // If no session yet, try to get it again after a delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        const { data: retrySession, error: retryError } = await supabase.auth.getSession();
        
        if (retryError) {
          logger.error('Error in retry getSession:', retryError);
          throw retryError;
        }
        
        if (retrySession?.session) {
          logger.log('AuthCallback: Session found in retry getSession');
          
          if (isActive) {
            toast.success('Successfully signed in!');
            
            timeoutId = setTimeout(() => {
              if (isActive) {
                logger.log(`AuthCallback: Redirecting to ${returnUrl}`);
                navigate(returnUrl, { replace: true });
              }
            }, 1000);
          }
          return;
        }
        
        // If we still don't have a session, throw an error
        logger.error('AuthCallback: No session could be established after all attempts');
        throw new Error('Failed to establish session after authentication callback');
        
      } catch (err: any) {
        logger.error('Error during auth callback:', err);
        
        if (isActive) {
          setError(err.message || 'An error occurred during authentication');
          toast.error(`Authentication error: ${err.message || 'Failed to sign in'}`);
          
          // Redirect to auth page after a short delay
          timeoutId = setTimeout(() => {
            if (isActive) {
              navigate('/auth', { replace: true });
            }
          }, 1500);
        }
      } finally {
        if (isActive) {
          setIsProcessing(false);
        }
        
        if (maxWaitTimeoutId) {
          clearTimeout(maxWaitTimeoutId);
        }
      }
    };
    
    // Run the auth callback handler
    handleAuthCallback();
    
    return () => {
      logger.log('AuthCallback: Cleaning up');
      isActive = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (maxWaitTimeoutId) clearTimeout(maxWaitTimeoutId);
    };
  }, [navigate, location.search]);
  
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
