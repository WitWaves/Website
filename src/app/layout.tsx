import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google'; // Lora removed
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { cn } from '@/lib/utils';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Lora font removed to use Geist Sans for body text by default as per globals.css update

export const metadata: Metadata = {
  title: 'WitWaves - Diverse Thoughts, One Ocean', // Updated tagline
  description: 'Dive into a sea of diverse content, where every wave brings new insights and endless exploration.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn(geistSans.variable, geistMono.variable)}>
      <body className="min-h-screen flex flex-col antialiased">
        <Header />
        {/* Main content area expanded and padding adjusted */}
        <main className="flex-grow w-full">
          {children}
        </main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
