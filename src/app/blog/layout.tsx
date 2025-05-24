
import type { Metadata } from 'next';
import { Jost } from 'next/font/google';
import '../globals.css'; // Import global styles relative to this layout
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import BlogHeader from '@/components/layout/blog-header';
import BlogLeftSidebar from '@/components/layout/blog-left-sidebar';
import BlogRightSidebar from '@/components/layout/blog-right-sidebar';
import Link from 'next/link';

const jost = Jost({
  variable: '--font-jost',
  subsets: ['latin'],
  weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900']
});

export const metadata: Metadata = {
  title: 'Blog | WitWaves',
  description: 'Explore articles and insights on WitWaves.',
};

// This layout defines its own <html> and <body> tags,
// making it a new root layout for the /blog segment.
// It will NOT inherit from src/app/layout.tsx.
export default function BlogLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(jost.variable)}>
      {/* Ensure the <body /> tag directly follows, without any intermediate text nodes (spaces/newlines)
          that could be misinterpreted. Next.js injects <head /> automatically. */}
      <body className="min-h-screen flex flex-col antialiased"> {/* Removed bg-background text-foreground to fix hydration */}
        <BlogHeader />
        <div className="flex-grow container mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-row gap-6">
            <BlogLeftSidebar />
            <main className="flex-1 min-w-0"> {/* This main is for content *within* the blog section */}
              {children} {/* This will be /blog/page.tsx or other blog sub-pages */}
            </main>
            <BlogRightSidebar />
          </div>
        </div>
        {/* Footer removed as per user request */}
        <Toaster />
      </body>
    </html>
  );
}
