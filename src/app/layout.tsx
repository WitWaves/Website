
import type { Metadata } from 'next';
// Removed Jost font import
import Script from 'next/script'; // Import Script
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/contexts/auth-context';

// Removed jost constant

export const metadata: Metadata = {
  title: 'WitWaves - Diverse Thoughts, One Ocean',
  description: 'Dive into a sea of diverse content, where every wave brings new insights and endless exploration.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn('')}> {/* Removed jost.variable */}
      <head>
        {/* Quill Snow Theme CSS from CDN */}
        <link
          href="https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <AuthProvider>
          <Header />
          <main className="flex-grow w-full">
            {children}
          </main>
          <Footer />
          <Toaster />
        </AuthProvider>
        {/* Quill Library JS from CDN */}
        <Script
          src="https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
