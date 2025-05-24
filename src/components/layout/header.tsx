'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PenSquare } from 'lucide-react'; 

export default function Header() {
  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-2xl font-bold tracking-tight text-primary hover:opacity-80 transition-opacity">
            WitWaves
          </Link>
          <nav>
            <Button asChild variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link href="/posts/new">
                <PenSquare className="mr-2 h-5 w-5" />
                New Post
              </Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
