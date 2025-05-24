import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import type { Post } from '@/lib/posts';
import TagBadge from './tag-badge';
import { format } from 'date-fns';
import { CalendarDays, MessageSquareText, Edit3 } from 'lucide-react'; // Added Edit3
import { Button } from '../ui/button'; // Added Button import

type PostCardProps = {
  post: Post;
};

export default function PostCard({ post }: PostCardProps) {
  const summary = post.content.substring(0, 180) + (post.content.length > 180 ? '...' : '');

  return (
    <Card className="mb-10 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-3xl hover:text-primary transition-colors">
          <Link href={`/posts/${post.id}`}>{post.title}</Link>
        </CardTitle>
        <div className="text-sm text-muted-foreground flex items-center mt-2">
          <CalendarDays className="mr-2 h-4 w-4" />
          <span>{format(new Date(post.createdAt), 'MMMM d, yyyy')}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4">
        <p className="text-foreground/80 leading-relaxed text-md">{summary}</p>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 py-4 px-6">
        <div className="flex flex-wrap gap-2">
          {post.tags.map(tag => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/posts/${post.id}/edit`}>
              <Edit3 className="mr-1.5 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button asChild variant="link" size="sm" className="text-primary hover:text-primary/80">
            <Link href={`/posts/${post.id}`}>
              Read more <MessageSquareText className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
