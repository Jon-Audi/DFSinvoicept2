
"use client";

import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { GlobalSearch } from "@/components/layout/global-search"; 

export function AppHeader() {
  const { toast } = useToast();
  const { user, logout, loading } = useAuth(); // Get user and logout function

  const handleLogoutClick = async () => {
    await logout();
    // Navigation is handled within the logout function in AuthContext
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur-md px-3 sm:px-4 md:px-6 transition-all duration-300 shadow-sm">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <div className="flex-1 flex items-center justify-center md:justify-start min-w-0">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        {user && ( // Only show dropdown if user is logged in
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:ring-2 hover:ring-primary/20 transition-all duration-200">
                <Avatar className="h-8 w-8 transition-transform duration-200 hover:scale-110">
                  <AvatarImage src={user.photoURL || "https://placehold.co/40x40.png"} alt="User Profile Picture" data-ai-hint="profile picture" />
                  <AvatarFallback>{user.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
              <DropdownMenuLabel className="font-semibold">{user.displayName || user.email || 'My Account'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/settings/profile" passHref>
                <DropdownMenuItem disabled={loading} className="cursor-pointer transition-colors">
                  <Icon name="UserCog" className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                  Profile
                </DropdownMenuItem>
              </Link>
              <Link href="/settings" passHref>
                <DropdownMenuItem disabled={loading} className="cursor-pointer transition-colors">
                  <Icon name="Settings" className="mr-2 h-4 w-4 transition-transform group-hover:rotate-45" />
                  Settings
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogoutClick} disabled={loading} className="cursor-pointer text-destructive focus:text-destructive transition-colors">
                <Icon name="LogOut" className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
