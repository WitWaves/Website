
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/lib/posts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, MoreHorizontal, Share2, Loader2, Edit3, Archive, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { AuthorProfileForCard } from '@/lib/userProfile';
import { useState, useEffect, useActionState, useTransition } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { toggleLikePostAction, type FormState } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import TagBadge from './tag-badge'; // Import TagBadge

type BlogPostCardProps = {
  post: Post;
  author: AuthorProfileForCard;
};

export default function BlogPostCard({ post, author }: BlogPostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLikePendingTransition, startLikeTransition] = useTransition();

  const [formattedDateDisplay, setFormattedDateDisplay] = useState<string>('...');

  useEffect(() => {
    if (post.createdAt) {
      setFormattedDateDisplay(format(new Date(post.createdAt), 'dd MMM yyyy'));
    }
  }, [post.createdAt]);

  const generateSummary = (content: string, length: number = 100) => {
    if (!content) return '';
    const strippedContent = content.replace(/<[^>]+>/g, '');
    if (strippedContent.length <= length) return strippedContent;
    return strippedContent.substring(0, length) + '...';
  };

  const postSummary = generateSummary(post.content, 150);

  const [optimisticLiked, setOptimisticLiked] = useState(post.likedBy?.includes(user?.uid || '') || false);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(post.likeCount || 0);
  const [optimisticCommentCount, setOptimisticCommentCount] = useState(post.commentCount || 0);

  const [likeState, handleLikeAction, isLikePending] = useActionState<FormState, FormData>(
    toggleLikePostAction,
    undefined
  );

  useEffect(() => {
    setOptimisticLiked(post.likedBy?.includes(user?.uid || '') || false);
    setOptimisticLikeCount(post.likeCount || 0);
    setOptimisticCommentCount(post.commentCount || 0);
  }, [post.likedBy, post.likeCount, post.commentCount, user?.uid]);

  useEffect(() => {
    if (likeState?.success && likeState.updatedLikeStatus?.postId === post.id) {
      setOptimisticLiked(likeState.updatedLikeStatus.liked);
      setOptimisticLikeCount(likeState.updatedLikeStatus.newCount);
    } else if (likeState?.message && !likeState.success && likeState?.updatedLikeStatus?.postId === post.id) {
      toast({ title: 'Error', description: likeState.message, variant: 'destructive' });
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
    setOptimisticLiked(!optimisticLiked);
    setOptimisticLikeCount(optimisticLiked ? optimisticLikeCount - 1 : optimisticLikeCount + 1);
    startLikeTransition(() => handleLikeAction(formData));
  };

  const authorDisplayName = author?.displayName || 'WitWaves User';
  const authorAvatarUrl = author?.photoURL;
  const authorFallback = authorDisplayName.substring(0, 1).toUpperCase();
  const isOwner = user && post.userId && user.uid === post.userId;

  const handleArchive = () => {
    toast({ title: 'Archive Clicked (Not Implemented)', description: `Archive action for post "${post.title}"`});
    console.log('Archive clicked for post:', post.id);
  };

  const handleDelete = () => {
    toast({ title: 'Delete Clicked (Not Implemented)', description: `Delete action for post "${post.title}" - Confirmation needed.`});
    console.log('Delete clicked for post:', post.id);
  };

  return (
    <article className="flex flex-col md:flex-row gap-6 p-4 border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-card">
      <Link href={`/posts/${post.id}`} className="md:w-1/3 aspect-[4/3] md:aspect-video overflow-hidden rounded-md block shrink-0">
        <Image
          src={post.imageUrl || `https://placehold.co/400x300.png?text=${encodeURIComponent(post.title.substring(0,10))}`}
          alt={post.title}
          width={400}
          height={300}
          className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
          data-ai-hint="article preview"
        />
      </Link>
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <Link href={`/posts/${post.id}`}>
            <h2 className="text-xl font-semibold text-foreground hover:text-primary transition-colors mb-1 leading-tight">
              {post.title}
            </h2>
          </Link>
          {postSummary && (
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{postSummary}</p>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {post.tags.map(tag => (
                <TagBadge key={tag} tag={tag} className="text-xs px-2 py-0.5" />
              ))}
            </div>
          )}
           <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1 mb-3">
            <form onSubmit={handleLikeSubmit} className="contents">
                <input type="hidden" name="postId" value={post.id} />
                {user && <input type="hidden" name="userId" value={user.uid} />}
                <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className={`flex items-center p-0 h-auto hover:bg-transparent ${optimisticLiked ? 'text-destructive hover:text-destructive/80' : 'text-muted-foreground hover:text-destructive'}`}
                    title="Like"
                    disabled={isLikePending || isLikePendingTransition || !user}
                >
                    {(isLikePending || isLikePendingTransition) ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : <Heart className={`h-4 w-4 mr-1 ${optimisticLiked ? 'fill-current' : ''}`} />}
                    {optimisticLikeCount}
                </Button>
            </form>

            <Link href={`/posts/${post.id}#comments`} className="flex items-center hover:text-primary disabled:opacity-70 p-0 h-auto" title="Comment">
              <MessageCircle className="h-4 w-4 mr-1" /> {optimisticCommentCount}
            </Link>

            <button className="flex items-center hover:text-green-500 p-0 h-auto" title="Share">
              <Share2 className="h-4 w-4 mr-1" /> <span className="sr-only">Share</span>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
          <div className="flex items-center space-x-2">
             <Link href={`/blog/profile/${author.uid}`} className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <Avatar className="h-8 w-8">
                <AvatarImage src={authorAvatarUrl} alt={authorDisplayName} data-ai-hint="author avatar"/>
                <AvatarFallback>{authorFallback}</AvatarFallback>
                </Avatar>
                <div>
                <p className="text-sm font-medium text-foreground">{authorDisplayName}</p>
                </div>
            </Link>
          </div>
          <div className="flex items-center space-x-2"> 
            <p className="text-xs text-muted-foreground">
              {formattedDateDisplay}
            </p>
            {isOwner ? (
              <>
                <Link href={`/posts/${post.id}/edit`} passHref>
                  <Button variant="outline" size="icon" className="h-7 w-7 text-secondary border-secondary hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-ring" title="Edit Post">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </Link>
                <Button variant="outline" size="icon" className="h-7 w-7 text-accent border-accent hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring" title="Archive Post" onClick={handleArchive}>
                  <Archive className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground focus-visible:ring-ring" title="Delete Post" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="icon" className="h-7 w-7" title="More options">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
