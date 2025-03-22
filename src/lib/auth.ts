
import { supabase } from './supabase';
import { UserProfile, UserRole } from './types';
import { Logger } from './logger';

const logger = new Logger('Auth');

export const signInWithDiscord = async () => {
  // Get the current URL but replace 'localhost:3000' with the actual origin if needed
  let redirectUrl = `${window.location.origin}/auth/callback`;
  
  // If we're in development and using localhost, add a fallback for when
  // Supabase redirects to localhost:3000 instead of our actual URL
  if (!window.location.origin.includes('localhost:3000')) {
    logger.log('Setting up for potential localhost redirect...');
    // Store the actual origin to check for it in Auth.tsx
    localStorage.setItem('actual_auth_origin', window.location.origin);
  }
  
  logger.log('Sign in with Discord, redirect URL:', redirectUrl);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: redirectUrl
    }
  });
  
  if (error) {
    logger.error('Error signing in with Discord:', error);
    throw error;
  }
  
  return data;
};

export const signOut = async () => {
  logger.log('Signing out');
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    logger.error('Error signing out:', error);
    throw error;
  }
  
  logger.log('Sign out successful');
};

export const getCurrentUser = async () => {
  try {
    logger.log('Getting current session');
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      logger.error('Error getting session:', error);
      return null;
    }
    
    if (session?.user) {
      logger.log('User found in session:', session.user.id);
    } else {
      logger.log('No user in session');
    }
    
    return session?.user || null;
  } catch (error) {
    logger.error('Error in getCurrentUser:', error);
    return null;
  }
};

export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (error) {
      logger.error('Error getting user profile:', error);
      return null;
    }
    
    return data as UserProfile;
  } catch (error) {
    logger.error('Error in getCurrentUserProfile:', error);
    return null;
  }
};

export const getUserRoles = async (userId: string): Promise<string[]> => {
  // Cache user roles in memory to avoid excessive calls
  const cacheKey = `user_roles_${userId}`;
  const cachedRoles = sessionStorage.getItem(cacheKey);
  
  if (cachedRoles) {
    try {
      return JSON.parse(cachedRoles);
    } catch (e) {
      logger.error('Error parsing cached roles:', e);
    }
  }
  
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  
  if (error) {
    logger.error('Error getting user roles:', error);
    return [];
  }
  
  const roles = data.map(role => role.role);
  
  // Cache roles for 5 minutes
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(roles));
  } catch (e) {
    logger.error('Error caching roles:', e);
  }
  
  return roles;
};

export const checkIsAdmin = async (userId: string): Promise<boolean> => {
  logger.log(`Checking if user ${userId} is admin`);
  const roles = await getUserRoles(userId);
  logger.log(`User roles:`, roles);
  return roles.includes('admin');
};

export const addUserRole = async (userId: string, role: string): Promise<void> => {
  const { error } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role });
  
  if (error) {
    logger.error('Error adding user role:', error);
    throw error;
  }
  
  // Clear role cache
  sessionStorage.removeItem(`user_roles_${userId}`);
};
