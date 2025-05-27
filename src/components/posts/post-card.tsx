
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import type { Post } from '@/lib/posts';
import TagBadge from './tag-badge';
import { format } from 'date-fns';
import { CalendarDays, Edit3, Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';

type PostCardProps = {
  post: Post;
};

export default function PostCard({ post }: PostCardProps) {
  const summary = post.content.substring(0, 180) + (post.content.length > 180 ? '...' : '');

  return (
    <Card className="mb-10 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-3xl hover:text-primary transition-colors">
          <Link href={`/posts/${post.id}`}>{post.title}</Link>
        </CardTitle>
        <div className="text-sm text-muted-foreground flex items-center mt-2">
          <CalendarDays className="mr-2 h-4 w-4" />
          <span>{format(new Date(post.createdAt), 'MMMM d, yyyy')}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4 flex-grow">
        <p className="text-foreground/80 leading-relaxed text-md">{summary}</p>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4 bg-muted/30 py-4 px-6 border-t">
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map(tag => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
        <Separator className="w-full my-2" />
        <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                <Button variant="ghost" size="sm" className="px-2 hover:text-destructive" title="Like">
                    <Heart className="mr-1 h-4 w-4" /> 
                    <span className="hidden sm:inline">Like</span>
                </Button>
                <Button variant="ghost" size="sm" className="px-2 hover:text-primary" title="Comment">
                    <MessageCircle className="mr-1 h-4 w-4" /> 
                    <span className="hidden sm:inline">Comment</span>
                </Button>
                <Button variant="ghost" size="sm" className="px-2 hover:text-blue-500" title="Save">
                    <Bookmark className="mr-1 h-4 w-4" /> 
                    <span className="hidden sm:inline">Save</span>
                </Button>
                 <Button variant="ghost" size="sm" className="px-2 hover:text-green-500" title="Share">
                    <Share2 className="mr-1 h-4 w-4" /> 
                    <span className="hidden sm:inline">Share</span>
                </Button>
            </div>
            <div className="flex gap-2 self-start sm:self-center">
                <Button asChild variant="outline" size="sm">
                    <Link href={`/posts/${post.id}/edit`}>
                    <Edit3 className="mr-1.5 h-4 w-4" />
                    Edit
                    </Link>
                </Button>
                <Button asChild variant="link" size="sm" className="text-primary hover:text-primary/80 px-2">
                    <Link href={`/posts/${post.id}`}>
                    Read more
                    {/* <MessageSquareText className="ml-1.5 h-4 w-4" /> Removed as MessageCircle is now used for comments */}
                    </Link>
                </Button>
            </div>
        </div>
      </CardFooter>
    </Card>
  );
}
