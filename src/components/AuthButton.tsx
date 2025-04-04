
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LogOut, LogIn, User, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import { getCurrentUserProfile } from '@/lib/auth';
import { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const logger = new Logger('AuthButton');

const AuthButton: React.FC = () => {
  const { user, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Set a maximum timeout for loading state to prevent indefinite greyed-out button
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 3000); // Set timeout to 3 seconds
      
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading]);
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        setIsLoadingProfile(true);
        try {
          const profile = await getCurrentUserProfile();
          setUserProfile(profile);
        } catch (error) {
          logger.error('Error fetching user profile:', error);
        } finally {
          setIsLoadingProfile(false);
        }
      } else {
        setUserProfile(null);
      }
    };
    
    fetchUserProfile();
  }, [user]);
  
  const handleSignIn = () => {
    navigate('/auth');
  };
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      logger.error('Error signing out:', error);
    }
  };

  const handleSettings = () => {
    navigate('/profile');
  };
  
  const getDisplayName = () => {
    if (userProfile) {
      return userProfile.display_name || userProfile.username;
    }
    return user?.user_metadata.preferred_username || user?.email || 'User';
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // If loading but timeout occurred, show sign-in button instead of greyed out state
  if (isLoading && !loadingTimeout) {
    return (
      <Button variant="ghost" disabled className="animate-pulse">
        <div className="h-5 w-20 bg-muted rounded" />
      </Button>
    );
  }
  
  if (!user) {
    return (
      <Button 
        variant="outline" 
        onClick={handleSignIn}
        className="flex items-center gap-2 border-olive/30 text-olive"
      >
        <LogIn className="h-4 w-4" />
        Sign In
      </Button>
    );
  }
  
  const displayName = getDisplayName();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 border-2 border-olive/40 text-olive shadow-sm hover:bg-cream pl-2 pr-3"
        >
          {userProfile?.avatar_url ? (
            <Avatar className="h-6 w-6 mr-1">
              <AvatarImage src={userProfile.avatar_url} alt={displayName} />
              <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            </Avatar>
          ) : (
            <User className="h-4 w-4" />
          )}
          {isLoadingProfile ? '...' : displayName}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 border border-olive/20">
        <DropdownMenuLabel className="font-heading">My Account</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-olive/10" />
        <DropdownMenuItem 
          onClick={handleSettings}
          className="flex items-center cursor-pointer"
        >
          <Settings className="h-4 w-4 mr-2" />
          Profile Settings
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleSignOut} 
          className="text-destructive flex items-center cursor-pointer font-medium hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AuthButton;
