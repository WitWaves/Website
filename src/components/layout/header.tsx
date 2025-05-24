
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/#about', label: 'About us' }, // Placeholder links
  { href: '/blog', label: 'Blog' },
  { href: '/#events', label: 'Events' },
  { href: '/#publication', label: 'Publication' },
];

export default function Header() {
  return (
    <header className="bg-background border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex flex-col">
            <span className="text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">WitWaves.</span>
            <span className="text-xs text-muted-foreground -mt-1">/ Diverse Thoughts, One Ocean</span>
          </Link>
          <div className="flex items-center space-x-6">
            {/* Search Input - Moved to the left */}
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
            
            {/* Added Notifications Button and Avatar */}
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
              </Button>
              <Avatar className="h-9 w-9">
                <AvatarImage src="https://placehold.co/40x40.png" alt="User avatar" data-ai-hint="person face"/>
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </div>
          </div>
          {/* Mobile menu button (optional, can be added later) */}
          {/* <div className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </div> */}
        </div>
      </div>
    </header>
  );
}
