
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { UploadCloud, Play, LayoutDashboard } from 'lucide-react';
import AuthButton from './AuthButton';
import { getCurrentUser, checkIsAdmin } from '@/lib/auth';

const Navigation: React.FC = () => {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          const adminStatus = await checkIsAdmin(user.id);
          setIsAdmin(adminStatus);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminStatus();
  }, []);
  
  const isActive = (path: string) => location.pathname === path;
  const isAuthPage = location.pathname === '/auth';
  
  return (
    <nav className="w-full max-w-screen-xl mx-auto px-4 py-4 flex justify-between items-center">
      <div className="flex items-center">
        <Link to="/" className="text-2xl font-medium tracking-tight transition-opacity hover:opacity-80 mr-8">
          VideoResponse
        </Link>
        
        {!isAuthPage && (
          <div className="flex space-x-2">
            <NavLink to="/" active={isActive('/')}>
              <Play className="w-4 h-4 mr-2" />
              Respond
            </NavLink>
            <NavLink to="/upload" active={isActive('/upload')}>
              <UploadCloud className="w-4 h-4 mr-2" />
              Upload
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" active={isActive('/admin')}>
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Admin
              </NavLink>
            )}
          </div>
        )}
      </div>
      
      <AuthButton />
    </nav>
  );
};

interface NavLinkProps {
  to: string;
  active: boolean;
  children: React.ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({ to, active, children }) => {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
        active 
          ? "bg-primary text-primary-foreground shadow-subtle" 
          : "bg-transparent hover:bg-secondary text-foreground"
      )}
    >
      {children}
    </Link>
  );
};

export default Navigation;
