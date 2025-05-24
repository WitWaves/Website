
import { getPosts, type Post } from '@/lib/posts';
import BlogPostCard from '@/components/posts/blog-post-card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { getMockAuthors, type MockAuthor } from '@/lib/authors'; // Import author functions

// Mock filter tabs
const filterTabs = ["All", "For you", "Top reads", "Following", "Music", "Gaming"];

export default async function BlogPage() {
  const posts = await getPosts();
  const mockAuthors = await getMockAuthors();

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
        <p className="text-center text-muted-foreground text-lg py-12">
          No posts found. Start by creating one!
        </p>
      ) : (
        <div className="space-y-8">
          {posts.map((post, index) => {
            // Cycle through mock authors for variety
            const author = mockAuthors.length > 0 ? mockAuthors[index % mockAuthors.length] : { id: '0', name: 'WitWaves User', role: 'Author', avatarUrl: 'https://placehold.co/40x40.png?text=WW' };
            return (
              <BlogPostCard key={post.id} post={post} author={author} />
            );
          })}
        </div>
      )}
    </div>
  );
}
