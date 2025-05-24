'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/#about', label: 'About us' }, // Placeholder links
  { href: '/#blog', label: 'Blog' },
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
