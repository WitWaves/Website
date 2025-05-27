
import { getPost, type Post } from '@/lib/posts';
import { notFound } from 'next/navigation';
import TagBadge from '@/components/posts/tag-badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { CalendarDays, Edit3, ArrowLeft, Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
// Import AuthorProfile types if you want to display author info here
// import { getUserProfile, AuthorProfileForCard } from '@/lib/userProfile'; 
// For now, author info isn't explicitly shown on this page, but could be added.

type PostPageProps = {
  params: {
    id: string;
  };
};

export async function generateMetadata({ params }: PostPageProps) {
  const post = await getPost(params.id);
  if (!post) {
    return { title: 'Post Not Found' };
  }
  return {
    title: `${post.title} | WitWaves`,
    description: post.content.substring(0, 160), // Consider generating a better summary from HTML
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await getPost(params.id);

  if (!post) {
    notFound();
  }
  
  // Example: Fetch author details if needed here
  // let author: AuthorProfileForCard | null = null;
  // if (post.userId) {
  //   author = await getUserProfile(post.userId); // This fetches full profile, might want a leaner version
  // }

  return (
    <article className="py-8 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-between items-center">
        <Button variant="outline" asChild>
          <Link href="/blog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to all posts
          </Link>
        </Button>
        <Button asChild variant="default">
            <Link href={`/posts/${post.id}/edit`}>
              <Edit3 className="mr-2 h-4 w-4" />
              Edit Post
            </Link>
          </Button>
      </div>

      <header className="mb-6">
        <h1 className="text-4xl lg:text-5xl font-bold mb-4 tracking-tight text-foreground">{post.title}</h1>
        <div className="text-md text-muted-foreground flex items-center mb-3">
          <CalendarDays className="mr-2 h-4 w-4" />
          <span>Published on {format(new Date(post.createdAt), 'MMMM d, yyyy')}</span>
        </div>
        {/* Placeholder for author name if fetched: 
        {author && <p className="text-md text-muted-foreground mb-3">By {author.displayName}</p>} 
        */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {post.tags.map(tag => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
      </header>
      
      <Separator className="my-6" />

      {/* Interaction buttons */}
      <div className="flex items-center space-x-3 sm:space-x-4 my-6 py-3 border-y border-border">
        <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-sm" title="Like">
          <Heart className="h-4 w-4 text-destructive" /> Like <span className="text-xs text-muted-foreground">(e.g., 1.2k)</span>
        </Button>
        <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-sm" title="Comment">
          <MessageCircle className="h-4 w-4 text-primary" /> Comment <span className="text-xs text-muted-foreground">(e.g., 87)</span>
        </Button>
        <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-sm" title="Save">
          <Bookmark className="h-4 w-4 text-blue-500" /> Save
        </Button>
        <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-sm" title="Share">
          <Share2 className="h-4 w-4 text-green-500" /> Share
        </Button>
      </div>
      
      <div
        className="prose prose-lg dark:prose-invert max-w-none leading-relaxed selection:bg-primary/20"
        // Using prose- classes would require @tailwindcss/typography plugin
        // Basic styling and improved line height for readability
        style={{ fontSize: '1.125rem', lineHeight: '1.85' }} 
        dangerouslySetInnerHTML={{ __html: post.content }} // Assuming post.content is HTML from Quill
      />
      
      <Separator className="my-10" />

      {/* You might want to add a comment section component here in the future */}
      {/* <CommentsSection postId={post.id} /> */}

      <div className="mt-12 flex justify-center">
         <Button variant="ghost" asChild>
          <Link href="/blog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Explore more posts
          </Link>
        </Button>
      </div>
    </article>
  );
}
