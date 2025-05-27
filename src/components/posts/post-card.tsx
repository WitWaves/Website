
'use client'; 

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import type { Post } from '@/lib/posts';
import TagBadge from './tag-badge';
import { format } from 'date-fns';
import { CalendarDays, Edit3, Heart, MessageCircle, Bookmark, Share2, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { useAuth } from '@/contexts/auth-context';
import { toggleLikePostAction, type FormState as LikeFormState } from '@/app/actions';
import { useActionState, useEffect, useState, useTransition } from 'react'; // Added useTransition
import { useToast } from '@/hooks/use-toast';

type PostCardProps = {
  post: Post;
};

export default function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPendingTransition, startTransition] = useTransition(); // Added for startTransition
  const summary = post.content.substring(0, 180) + (post.content.length > 180 ? '...' : '');

  // State for like button interaction
  const [optimisticLiked, setOptimisticLiked] = useState(post.likedBy?.includes(user?.uid || '') || false);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(post.likeCount || 0);

  const [likeState, handleLikeAction, isLikePending] = useActionState<LikeFormState, FormData>(
    toggleLikePostAction,
    undefined
  );

  useEffect(() => {
    setOptimisticLiked(post.likedBy?.includes(user?.uid || '') || false);
    setOptimisticLikeCount(post.likeCount || 0);
  }, [post.likedBy, post.likeCount, user?.uid]);

  useEffect(() => {
    if (likeState?.success && likeState.updatedLikeStatus?.postId === post.id) {
      setOptimisticLiked(likeState.updatedLikeStatus.liked);
      setOptimisticLikeCount(likeState.updatedLikeStatus.newCount);
    } else if (likeState?.message && !likeState.success && likeState?.updatedLikeStatus?.postId === post.id) {
      toast({ title: 'Error', description: likeState.message, variant: 'destructive' });
      // Revert optimistic update on error
      setOptimisticLiked(post.likedBy?.includes(user?.uid || '') || false);
      setOptimisticLikeCount(post.likeCount || 0);
    }
  }, [likeState, post.id, toast, user?.uid, post.likedBy, post.likeCount]);

  const handleLikeSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      toast({ title: 'Authentication Required', description: 'Please log in to like posts.', variant: 'destructive'});
      return;
    }
    const formData = new FormData(event.currentTarget);
    formData.set('userId', user.uid); 

    setOptimisticLiked(!optimisticLiked);
    setOptimisticLikeCount(optimisticLiked ? optimisticLikeCount - 1 : optimisticLikeCount + 1);
    
    startTransition(() => {
      handleLikeAction(formData);
    });
  };


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
        {/* Ensure content is not dangerouslySetInnerHTML unless it's sanitized HTML */}
        <p className="text-foreground/80 leading-relaxed text-md">{summary.replace(/<[^>]+>/g, '')}</p>
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
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <form onSubmit={handleLikeSubmit} className="contents">
                    <input type="hidden" name="postId" value={post.id} />
                    {user && <input type="hidden" name="userId" value={user.uid} />}
                    <Button 
                        type="submit"
                        variant="ghost" 
                        size="sm" 
                        className={`px-2 ${optimisticLiked ? 'text-destructive hover:text-destructive/80' : 'hover:text-destructive'}`}
                        title="Like"
                        disabled={isLikePending || isPendingTransition || !user}
                    >
                        {(isLikePending || isPendingTransition) ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Heart className={`mr-1 h-4 w-4 ${optimisticLiked ? 'fill-current' : ''}`} />}
                        <span className="hidden sm:inline">Like</span> ({optimisticLikeCount})
                    </Button>
                </form>
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
                {post.userId === user?.uid && ( // Show Edit button only to post owner
                    <Button asChild variant="outline" size="sm">
                        <Link href={`/posts/${post.id}/edit`}>
                        <Edit3 className="mr-1.5 h-4 w-4" />
                        Edit
                        </Link>
                    </Button>
                )}
                <Button asChild variant="link" size="sm" className="text-primary hover:text-primary/80 px-2">
                    <Link href={`/posts/${post.id}`}>
                    Read more
                    </Link>
                </Button>
            </div>
        </div>
      </CardFooter>
    </Card>
  );
}
