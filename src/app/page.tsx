
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import Link from 'next/link';
import { MessageSquare, Instagram, Linkedin, Facebook, ArrowRight } from 'lucide-react';

export default async function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-20"> {/* Reduced padding */}
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tighter">
              <span className="block text-destructive">Dive.</span>
              <span className="block text-primary relative">
                <Image 
                  src="https://firebasestorage.googleapis.com/v0/b/witwaves.firebasestorage.app/o/Website%20Elements%2FExploreImage.jpg?alt=media&token=36ab8659-f902-4cb6-bf68-2cb1664d042e" 
                  alt="Decorative illustration" 
                  width={100} 
                  height={100} 
                  className="inline-block mr-2 relative top-[-0.1em] lg:top-[-0.15em]" 
                  data-ai-hint="explore theme"
                />
                Explore.
              </span>
              <span className="block text-accent">Wonder.</span>
            </h1>
          </div>
          <div className="space-y-6">
            <p className="text-lg md:text-xl text-muted-foreground">
              Dive into a sea of diverse content, where every wave
              brings new insights and endless exploration.
            </p>
            <Button size="lg" variant="destructive" asChild>
              <Link href="/#get-started">
                Get started <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      
      {/* Blogs Section */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-20"> {/* Reduced padding */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Blogs</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Welcome to our vibrant community space! Share your thoughts, stories, and creativity with the world.
            </p>
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
              <Link href="/blog">
                Discover Blogs <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          <div className="order-1 md:order-2">
            <Image
              src="https://placehold.co/600x400.png"
              alt="Blog preview"
              width={600}
              height={400}
              className="rounded-lg shadow-xl"
              data-ai-hint="technology article"
            />
          </div>
        </div>
      </section>

      {/* Large Newsletter Subscription Section */}
      <section className="bg-accent py-12 md:py-20"> {/* Reduced padding */}
        <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-accent-foreground mb-4">
            Subscribe to our newsletter!
          </h2>
          <p className="text-lg text-accent-foreground/90 mb-8">
            Stay connected and never miss an update! Subscribe to our newsletter for the latest
            news, insights, and exclusive content delivered straight to your inbox.
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
            <Input
              type="email"
              placeholder="jhon@gmail.com"
              className="bg-background/90 text-foreground placeholder:text-muted-foreground flex-grow text-base"
              aria-label="Email for newsletter"
            />
            <Button type="submit" size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto w-full">
              Discover
            </Button>
          </form>
          <div className="mt-8 flex justify-center items-center space-x-6">
            <Link href="#" aria-label="Whatsapp" className="text-accent-foreground/80 hover:text-accent-foreground"><MessageSquare size={28} /></Link>
            <Link href="#" aria-label="Instagram" className="text-accent-foreground/80 hover:text-accent-foreground"><Instagram size={28} /></Link>
            <Link href="#" aria-label="LinkedIn" className="text-accent-foreground/80 hover:text-accent-foreground"><Linkedin size={28} /></Link>
            <Link href="#" aria-label="Facebook" className="text-accent-foreground/80 hover:text-accent-foreground"><Facebook size={28} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
