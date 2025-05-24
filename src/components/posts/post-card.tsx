import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import type { Post } from '@/lib/posts';
import TagBadge from './tag-badge';
import { format } from 'date-fns';
import { CalendarDays, MessageSquareText } from 'lucide-react';

type PostCardProps = {
  post: Post;
};

export default function PostCard({ post }: PostCardProps) {
  const summary = post.content.substring(0, 150) + (post.content.length > 150 ? '...' : '');

  return (
    <Card className="mb-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-2xl hover:text-primary transition-colors">
          <Link href={`/posts/${post.id}`}>{post.title}</Link>
        </CardTitle>
        <div className="text-sm text-muted-foreground flex items-center mt-1">
          <CalendarDays className="mr-2 h-4 w-4" />
          <span>{format(new Date(post.createdAt), 'MMMM d, yyyy')}</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-foreground/90 leading-relaxed">{summary}</p>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div className="flex flex-wrap gap-2 mb-4 sm:mb-0">
          {post.tags.map(tag => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
        <Link href={`/posts/${post.id}`} className="text-sm text-primary hover:underline flex items-center">
          Read more <MessageSquareText className="ml-1 h-4 w-4" />
        </Link>
      </CardFooter>
    </Card>
  );
}
