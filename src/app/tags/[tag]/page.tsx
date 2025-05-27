
import { getPostsByTag, type Post } from '@/lib/posts';
import PostCard from '@/components/posts/post-card';
import { ArrowLeft, Tag } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { use } from 'react'; // Import use

type TagPageProps = {
  params: {
    tag: string;
  };
};

export async function generateMetadata({ params }: TagPageProps) {
  const tagName = decodeURIComponent(params.tag);
  return {
    title: `Posts tagged with "${tagName}" | WitWaves`,
    description: `Browse all articles on WitWaves tagged with "${tagName}".`,
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const resolvedParams = use(params); // Use React.use to unwrap params
  const tagName = decodeURIComponent(resolvedParams.tag);
  const posts = await getPostsByTag(tagName);

  return (
    <div className="py-8">
      <Button variant="outline" asChild className="mb-8">
        <Link href="/blog"> {/* Updated link to /blog */}
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to all posts
        </Link>
      </Button>
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3 tracking-tight flex items-center justify-center">
          <Tag className="mr-3 h-8 w-8 text-primary" />
          Posts tagged with "{tagName}"
        </h1>
      </div>

      {posts.length === 0 ? (
        <p className="text-center text-muted-foreground text-lg py-12">
          No posts found with the tag "{tagName}".
        </p>
      ) : (
        <div className="space-y-8">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
