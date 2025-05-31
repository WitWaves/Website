
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home, User, Bell } from 'lucide-react'; // Added Bell
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/blog', label: 'Home', icon: Home },
  { href: '/blog/notifications', label: 'Notifications', icon: Bell }, // Added Bell item
  { href: '/blog/profile', label: 'Profile', icon: User },
];

export default function BlogLeftSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 md:w-20 lg:w-24 hidden md:flex flex-col space-y-3 items-center py-4 sticky top-20 h-[calc(100vh-5rem-env(safe-area-inset-bottom))]">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/blog') || (item.href === '/blog' && (pathname === '/blog' || pathname === '/')); // Adjusted active logic
        return (
          <Link
            href={item.href}
            key={item.label}
            title={item.label}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors w-full",
              isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-6 w-6" />
            {/* <span className="text-xs mt-1 hidden lg:block">{item.label}</span> */}
          </Link>
        );
      })}
    </aside>
  );
}
