import Link from 'next/link';
import { MessageSquare, Instagram, Linkedin, Facebook } from 'lucide-react';

const socials = [
  { name: 'Whatsapp', href: '#', icon: MessageSquare },
  { name: 'Instagram', href: '#', icon: Instagram },
  { name: 'Linkedin', href: '#', icon: Linkedin },
  { name: 'Facebook', href: '#', icon: Facebook },
];

const mainLinks = [
  { name: 'Home', href: '/' },
  { name: 'About us', href: '/#about' },
  { name: 'Blog', href: '/#blog' },
  { name: 'Events', href: '/#events' },
  { name: 'Publication', href: '/#publication' },
];

const otherLinks = [
  { name: 'Privacy policy', href: '/#privacy' },
  { name: 'Refund policy', href: '/#refund' },
  { name: 'FAQ\'s', href: '/#faq' },
  { name: 'Site map', href: '/#sitemap' },
  { name: 'Contact us', href: '/#contact' },
];

export default function Footer() {
  return (
    <footer className="bg-muted/30 border-t border-border/50 mt-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Column 1: Logo and Copyright */}
          <div className="lg:col-span-1">
             <Link href="/" className="flex flex-col mb-4">
                <span className="text-2xl font-bold tracking-tight text-gray-800 dark:text-gray-100">WitWaves.</span>
                <span className="text-xs text-muted-foreground -mt-1">/ Diverse Thoughts, One Ocean</span>
              </Link>
            <p className="text-sm text-muted-foreground mt-4">
              Copyright &copy; {new Date().getFullYear()} WitWaves.in
            </p>
          </div>

          {/* Column 2: Socials */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Socials</h3>
            <ul className="space-y-3">
              {socials.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center">
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Main Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Main</h3>
            <ul className="space-y-3">
              {mainLinks.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Other Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Others</h3>
            <ul className="space-y-3">
              {otherLinks.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
