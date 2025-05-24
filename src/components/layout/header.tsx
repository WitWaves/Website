'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PenSquare } from 'lucide-react'; // Changed from PlusCircle to PenSquare for "New Post"

export default function Header() {
  return (
    <header className="bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-2xl font-bold tracking-tight hover:opacity-80 transition-opacity">
            WitWaves
          </Link>
          <nav>
            <Button asChild variant="ghost" className="text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground">
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
