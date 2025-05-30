
'use client'; // Add 'use client' for usePathname

import { usePathname } from 'next/navigation'; // Import usePathname
import { Jost } from 'next/font/google';
import Script from 'next/script';
import '../globals.css'; // Adjusted path
import { Toaster } from "@/components/ui/toaster";
// Removed main Header and Footer imports, as this layout is now self-contained for /blog
// import Header from '@/components/layout/header';
// import Footer from '@/components/layout/footer';
import BlogLeftSidebar from '@/components/layout/blog-left-sidebar';
import BlogRightSidebar from '@/components/layout/blog-right-sidebar';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/contexts/auth-context';

const jost = Jost({
  variable: '--font-jost',
  subsets: ['latin'],
  display: 'swap', // Added display: 'swap'
  // weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] // Removed specific weights to use variable font capabilities
});

// Metadata cannot be exported from client components. 
// Consider moving to a parent Server Component or page if this metadata is for /blog segment.
// export const metadata: Metadata = {
//   title: 'Blog | WitWaves',
//   description: 'Explore articles and insights on WitWaves.',
// };

export default function BlogLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  // Hide sidebars on the logged-in user's profile page AND on public user profile pages
  const showSidebars = !pathname.startsWith('/blog/profile'); 

  return (
    // This div structure will be injected into the <main> tag of the parent layout (src/app/layout.tsx)
    // OR, if this is meant to be a new root layout for /blog, it needs <html> and <body> tags.
    // Assuming for now it's a nested layout within the main app structure.
    <div className="flex-grow container mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-row gap-6">
        {showSidebars && <BlogLeftSidebar />}
        <main className="flex-1 min-w-0"> {/* This main is for content *within* the blog section */}
          {children} {/* This will be /blog/page.tsx or other blog sub-pages */}
        </main>
        {showSidebars && <BlogRightSidebar />}
      </div>
    </div>
    // Toaster should ideally be in the root layout (src/app/layout.tsx)
    // If this blog layout is a full root, then Toaster here is fine.
  );
}
