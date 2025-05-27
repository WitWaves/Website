
'use client'; // Add 'use client' for usePathname

import type { Metadata } from 'next';
import { usePathname } from 'next/navigation'; // Import usePathname

import BlogLeftSidebar from '@/components/layout/blog-left-sidebar';
import BlogRightSidebar from '@/components/layout/blog-right-sidebar';

// Metadata can still be defined for this segment
// export const metadata: Metadata = { // Metadata cannot be exported from client components. Consider moving to a parent Server Component or page.
//   title: 'Blog | WitWaves',
//   description: 'Explore articles and insights on WitWaves.',
// };

export default function BlogLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const showRightSidebar = pathname !== '/blog/profile'; // Hide on profile page

  return (
    // This div structure will be injected into the <main> tag of the parent layout (src/app/layout.tsx)
    <div className="flex-grow container mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-row gap-6">
        <BlogLeftSidebar />
        <main className="flex-1 min-w-0"> {/* This main is for content *within* the blog section */}
          {children} {/* This will be /blog/page.tsx or other blog sub-pages */}
        </main>
        {showRightSidebar && <BlogRightSidebar />}
      </div>
    </div>
    // Removed Toaster, it should be in the root layout if needed globally
  );
}
