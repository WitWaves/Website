
import type { Metadata } from 'next';
// Removed Jost import, globals.css import, and Toaster as they will come from the root src/app/layout.tsx
// This layout is now a standard layout component, not a new root layout.
// This means it will be nested within src/app/layout.tsx and will inherit its header/footer.

import BlogLeftSidebar from '@/components/layout/blog-left-sidebar';
import BlogRightSidebar from '@/components/layout/blog-right-sidebar';

// Metadata can still be defined for this segment
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
    // This div structure will be injected into the <main> tag of the parent layout (src/app/layout.tsx)
    <div className="flex-grow container mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-row gap-6">
        <BlogLeftSidebar />
        <main className="flex-1 min-w-0"> {/* This main is for content *within* the blog section */}
          {children} {/* This will be /blog/page.tsx or other blog sub-pages */}
        </main>
        <BlogRightSidebar />
      </div>
    </div>
    // Removed Toaster, it should be in the root layout if needed globally
  );
}
