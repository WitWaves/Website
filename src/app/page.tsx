
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
                  src="https://firebasestorage.googleapis.com/v0/b/witwaves.firebasestorage.app/o/WebsiteElements%2FExploreImage.svg?alt=media&token=def9967b-2824-4cfe-897e-cc749dd082e2"
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
            <Button size="lg" variant="destructive" asChild className="rounded-full">
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
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full" asChild>
              <Link href="/blog">
                Discover Blogs <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          <div className="order-1 md:order-2">
            <Image
              src="https://firebasestorage.googleapis.com/v0/b/witwaves.firebasestorage.app/o/WebsiteElements%2FBlogImage.png?alt=media&token=202c8670-c370-4aee-bdb8-d2558ea7abeb"
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
      <section className="py-12 md:py-20">
        <div className="w-full md:w-4/5 mx-auto px-4 md:px-0"> {/* This div is already 80% on md+ */}
          <div className="bg-accent rounded-3xl p-8 md:p-12 lg:p-16 text-center shadow-xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Subscribe to our newsletter!
            </h2>
            <p className="text-lg text-white/90 mb-8 w-4/5 mx-auto"> {/* Changed max-w-2xl to w-4/5 */}
              Stay connected and never miss an update! Subscribe to our newsletter for the latest
              news, insights, and exclusive content delivered straight to your inbox.
            </p>
            <form className="w-4/5 mx-auto"> {/* Changed max-w-lg to w-4/5 */}
              <div className="flex items-center bg-white rounded-full p-1 shadow-md focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-accent">
                <Input
                  type="email"
                  placeholder="jhon@gmail.com"
                  className="bg-transparent text-foreground placeholder:text-muted-foreground flex-grow text-base py-3 px-5 border-none focus:ring-0 h-auto"
                  aria-label="Email for newsletter"
                />
                <Button
                  type="submit"
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full py-3 px-6 shrink-0 text-base font-semibold"
                  style={{ backgroundColor: 'hsl(var(--brand-yellow-orange))', color: 'hsl(var(--brand-yellow-orange-foreground))' }}
                >
                  Discover
                </Button>
              </div>
            </form>
          </div>
          <div className="mt-10 flex justify-center items-center space-x-6">
            <Link href="#" aria-label="Whatsapp" className="text-muted-foreground hover:text-primary"><MessageSquare size={28} /></Link>
            <Link href="#" aria-label="Instagram" className="text-muted-foreground hover:text-primary"><Instagram size={28} /></Link>
            <Link href="#" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary"><Linkedin size={28} /></Link>
            <Link href="#" aria-label="Facebook" className="text-muted-foreground hover:text-primary"><Facebook size={28} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
