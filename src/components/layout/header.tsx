
'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, LogOut, UserPlus, LogIn, Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { useState, useEffect } from 'react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/#about', label: 'About us' },
  { href: '/blog', label: 'Blog' },
];

export default function Header() {
  const { user, loading, logout } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header className="bg-background border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between h-20">
          <Link href="/">
            <Image
              src="https://firebasestorage.googleapis.com/v0/b/witwaves.firebasestorage.app/o/WebsiteElements%2FWitWaves.png?alt=media&token=06288ce8-1eb2-4fb2-b3a8-e4deb9de05ff"
              alt="WitWaves Logo"
              width={180}
              height={43}
              // priority prop removed to address hydration issue
              className="h-auto"
              data-ai-hint="logo wordmark"
            />
          </Link>

          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center">
              <div className="relative max-w-xs">
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-9 pr-3 py-2 w-full rounded-full border-border bg-muted/50 focus:bg-background h-9 text-sm"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {isMounted ? (
              loading ? (
                <div className="h-9 w-24 bg-muted rounded-md animate-pulse"></div>
              ) : user ? (
                <>
                  {/* Bell icon moved to blog sidebar */}
                  <Link href="/blog/profile">
                    <Avatar className="h-9 w-9 cursor-pointer">
                      <AvatarImage src={user.photoURL || `https://placehold.co/40x40.png?text=${(user.displayName || user.email || 'U').substring(0,1).toUpperCase()}`} alt={user.displayName || "User Profile"} data-ai-hint="person face"/>
                      <AvatarFallback>{user.displayName ? user.displayName.substring(0,1).toUpperCase() : (user.email ? user.email.substring(0,1).toUpperCase() : 'U')}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={logout} title="Logout" className="rounded-full">
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Logout</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/login">
                      <LogIn className="mr-2 h-4 w-4" />
                      Login
                    </Link>
                  </Button>
                  <Button variant="default" asChild>
                    <Link href="/signup">
                       <UserPlus className="mr-2 h-4 w-4" />
                      Sign Up
                    </Link>
                  </Button>
                </>
              )
            ) : (
              <div className="h-9 w-24 bg-muted rounded-md animate-pulse"></div> // Placeholder for non-mounted state
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
