import { getPost, type Post } from '@/lib/posts';
import { notFound } from 'next/navigation';
import TagBadge from '@/components/posts/tag-badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { CalendarDays, Edit3, ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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
    description: post.content.substring(0, 160),
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await getPost(params.id);

  if (!post) {
    notFound();
  }

  return (
    <article className="py-8 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <Button variant="outline" asChild className="mb-8">
        <Link href="/blog"> {/* Updated link to /blog */}
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to all posts
        </Link>
      </Button>

      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-3 tracking-tight">{post.title}</h1>
        <div className="text-md text-muted-foreground flex items-center mb-4">
          <CalendarDays className="mr-2 h-4 w-4" />
          <span>{format(new Date(post.createdAt), 'MMMM d, yyyy')}</span>
        </div>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map(tag => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
      </header>
      
      <Separator className="my-8" />

      <div
        className="prose prose-lg dark:prose-invert max-w-none leading-relaxed"
        // Using prose- classes would require @tailwindcss/typography plugin
        // For now, basic styling:
        style={{ fontSize: '1.125rem', lineHeight: '1.75' }}
        dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }} // Basic rendering
      />
      
      <Separator className="my-12" />

      <div className="mt-12 flex justify-end">
        <Button asChild variant="default">
          <Link href={`/posts/${post.id}/edit`}>
            <Edit3 className="mr-2 h-4 w-4" />
            Edit Post
          </Link>
        </Button>
      </div>
    </article>
  );
}
