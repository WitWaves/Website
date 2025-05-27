
import { getPosts, type Post } from '@/lib/posts';
import BlogPostCard from '@/components/posts/blog-post-card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { getAuthorProfilesForCards, type AuthorProfileForCard } from '@/lib/userProfile'; // Updated import

// Mock filter tabs
const filterTabs = ["All", "For you", "Top reads", "Following", "Music", "Gaming"];

export default async function BlogPage() {
  const posts = await getPosts();
  
  const authorIds = Array.from(new Set(posts.map(post => post.userId).filter(Boolean as any as (id: string | undefined) => id is string)));
  const authorProfilesMap = await getAuthorProfilesForCards(authorIds);

  const defaultAuthor: AuthorProfileForCard = { 
    uid: 'default-user', 
    displayName: 'WitWaves User', 
    // photoURL: 'https://placehold.co/40x40.png?text=WW' // Optional default avatar
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-1 border border-border rounded-lg p-1 bg-muted/50">
          {filterTabs.map((tab, index) => (
            <Button
              key={tab}
              variant={index === 0 ? "default" : "ghost"} // First tab active
              size="sm"
              className={index === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}
            >
              {tab}
            </Button>
          ))}
        </div>
        <Button variant="outline" asChild>
          <Link href="/posts/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Post
          </Link>
        </Button>
      </div>
      
      <Separator className="my-6" />

      {posts.length === 0 ? (
        <div className="text-center text-muted-foreground text-lg py-12">
          <p>No posts found. Start by creating one!</p>
           <Button asChild className="mt-4">
            <Link href="/posts/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Your First Post
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {posts.map((post) => {
            const author = post.userId ? (authorProfilesMap.get(post.userId) || defaultAuthor) : defaultAuthor;
            return (
              <BlogPostCard key={post.id} post={post} author={author} />
            );
          })}
        </div>
      )}
    </div>
  );
}
