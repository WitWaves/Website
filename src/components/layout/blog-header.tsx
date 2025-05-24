
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Menu, Search, Bell } from 'lucide-react';
import Image from 'next/image';

export default function BlogHeader() {
  return (
    <header className="bg-background border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-xl">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="md:hidden"> {/* Hidden on md and up, shown on mobile */}
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
            <Link href="/blog" className="flex flex-col">
              <span className="text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">WitWaves.</span>
              <span className="text-xs text-muted-foreground -mt-1">/ Diverse Thoughts, One Ocean</span>
            </Link>
          </div>

          <div className="flex-1 max-w-xl mx-4 hidden md:flex"> {/* Hidden on sm, shown on md and up */}
            <div className="relative w-full">
              <Input
                type="search"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 w-full rounded-full border-border bg-muted/50 focus:bg-background"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
          </div>

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
      </div>
    </header>
  );
}
