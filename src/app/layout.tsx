
import type { Metadata } from 'next';
import { Jost } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/contexts/auth-context'; // Import AuthProvider

const jost = Jost({
  variable: '--font-jost',
  subsets: ['latin'],
  weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900']
});

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
    <html lang="en" className={cn(jost.variable)}>
      <body className="min-h-screen flex flex-col antialiased">
        <AuthProvider> {/* Wrap with AuthProvider */}
          <Header />
          <main className="flex-grow w-full">
            {children}
          </main>
          <Footer />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
