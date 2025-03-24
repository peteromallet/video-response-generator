
import { supabase } from '../supabase';
import { Logger } from '../logger';
import { userProfileCache, userRolesCache } from './cache';

const logger = new Logger('AuthMethods');

export const signInWithDiscord = async () => {
  try {
    // Get the current URL to use as redirect
    let redirectUrl = `${window.location.origin}/auth/callback`;
    
    // Clear the storage before signing in to prevent conflicts
    logger.log('Cleaning up local storage before Discord login');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
        logger.log(`Removing storage key: ${key}`);
        localStorage.removeItem(key);
      }
    }
    
    // Force a sign out to ensure a clean slate
    try {
      await supabase.auth.signOut({ scope: 'global' });
      // Allow time for sign out to complete
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (signOutError) {
      logger.log('Ignoring error during preventative sign out:', signOutError);
    }
    
    logger.log('Starting Discord sign in, redirect URL:', redirectUrl);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: redirectUrl,
        scopes: 'identify email guilds',
        queryParams: {
          prompt: 'consent' 
        }
      }
    });
    
    if (error) {
      logger.error('Error signing in with Discord:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    logger.error('Error in signInWithDiscord:', error);
    throw error;
  }
};

export const signOut = async () => {
  logger.log('Signing out');
  
  try {
    // Clear caches first
    userProfileCache.clear();
    userRolesCache.clear();
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut({
      scope: 'global'
    });
    
    if (error) {
      logger.error('Error signing out:', error);
      throw error;
    }
    
    logger.log('Sign out successful, clearing storage');
    
    // Clear session storage
    sessionStorage.clear();
    
    // Clear Supabase related localStorage items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
        logger.log(`Removing key: ${key}`);
        localStorage.removeItem(key);
      }
    }
    
    // Wait for auth state to update
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return true;
  } catch (error) {
    logger.error('Error in signOut:', error);
    throw error;
  }
};
