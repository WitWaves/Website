
import type { Metadata } from 'next';
import BlogHeader from '@/components/layout/blog-header';
import BlogLeftSidebar from '@/components/layout/blog-left-sidebar';
import BlogRightSidebar from '@/components/layout/blog-right-sidebar';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog | WitWaves',
  description: 'Explore articles and insights on WitWaves.',
};

export default function BlogLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <BlogHeader />
      <div className="flex-grow container mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-row gap-6">
          <BlogLeftSidebar />
          <main className="flex-1 min-w-0">
            {children}
          </main>
          <BlogRightSidebar />
        </div>
      </div>
      <footer className="border-t border-border/50 py-8 bg-muted/30">
        <div className="container mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <Link href="/" className="flex flex-col mb-4 md:mb-0">
            <span className="text-2xl font-bold tracking-tight text-gray-800 dark:text-gray-100">WitWaves.</span>
            <span className="text-xs text-muted-foreground -mt-1">/ Diverse Thoughts, One Ocean</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            Copyright &copy; {new Date().getFullYear()} WitWaves.in
          </p>
        </div>
      </footer>
    </div>
  );
}
