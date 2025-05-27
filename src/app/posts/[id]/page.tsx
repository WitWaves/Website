
'use client'; // Make this a client component to use hooks for interactions

import { getPost, type Post } from '@/lib/posts';
import { notFound, useParams } from 'next/navigation'; // useParams for client components
import TagBadge from '@/components/posts/tag-badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { CalendarDays, Edit3, ArrowLeft, Heart, MessageCircle, Bookmark, Share2, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState, useActionState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { toggleLikePostAction, type FormState as LikeFormState } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';


// This page now fetches data on the client side due to interactive elements like 'Like'
export default function PostPage() {
  const params = useParams();
  const postId = params.id as string;
  const { user } = useAuth();
  const { toast } = useToast();

  const [post, setPost] = useState<Post | null | undefined>(undefined); // undefined for loading, null for not found
  const [isLoading, setIsLoading] = useState(true);

  // State for like button interaction
  const [optimisticLiked, setOptimisticLiked] = useState(false);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(0);

  const [likeState, handleLikeAction, isLikePending] = useActionState<LikeFormState, FormData>(
    toggleLikePostAction,
    undefined
  );
  
  useEffect(() => {
    async function fetchPost() {
      if (postId) {
        setIsLoading(true);
        const fetchedPost = await getPost(postId);
        setPost(fetchedPost);
        if (fetchedPost) {
          setOptimisticLiked(fetchedPost.likedBy?.includes(user?.uid || '') || false);
          setOptimisticLikeCount(fetchedPost.likeCount || 0);
        }
        setIsLoading(false);
      }
    }
    fetchPost();
  }, [postId, user?.uid]); // Re-fetch if postId changes or user changes (for like status)


  useEffect(() => {
    if (likeState?.success && likeState.updatedLikeStatus?.postId === postId) {
      setOptimisticLiked(likeState.updatedLikeStatus.liked);
      setOptimisticLikeCount(likeState.updatedLikeStatus.newCount);
       // toast({ title: likeState.message }); // Optional success toast
    } else if (likeState?.message && !likeState.success) {
      toast({ title: 'Error', description: likeState.message, variant: 'destructive' });
      // Revert optimistic update on error
      if (post) {
        setOptimisticLiked(post.likedBy?.includes(user?.uid || '') || false);
        setOptimisticLikeCount(post.likeCount || 0);
      }
    }
  }, [likeState, postId, toast, user?.uid, post]);


  const handleLikeSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      toast({ title: 'Authentication Required', description: 'Please log in to like posts.', variant: 'destructive'});
      return;
    }
    if (!post) return;

    const formData = new FormData(event.currentTarget);
    formData.set('userId', user.uid);

    // Optimistic update
    setOptimisticLiked(!optimisticLiked);
    setOptimisticLikeCount(optimisticLiked ? optimisticLikeCount - 1 : optimisticLikeCount + 1);
    
    handleLikeAction(formData);
  };


  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-3">Loading post...</p></div>;
  }

  if (post === null) { // Explicitly check for null (not found) after loading
    notFound();
  }
  
  if (!post) { // Should be caught by isLoading or notFound, but as a fallback
      return <div className="text-center py-10">Post could not be loaded.</div>;
  }


  return (
    <article className="py-8 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-between items-center">
        <Button variant="outline" asChild>
          <Link href="/blog">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to all posts
          </Link>
        </Button>
        {post.userId === user?.uid && ( // Show edit button only to the post owner
            <Button asChild variant="default">
                <Link href={`/posts/${post.id}/edit`}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Post
                </Link>
            </Button>
        )}
      </div>

      <header className="mb-6">
        <h1 className="text-4xl lg:text-5xl font-bold mb-4 tracking-tight text-foreground">{post.title}</h1>
        <div className="text-md text-muted-foreground flex items-center mb-3">
          <CalendarDays className="mr-2 h-4 w-4" />
          <span>Published on {format(new Date(post.createdAt), 'MMMM d, yyyy')}</span>
        </div>
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {post.tags.map(tag => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}
      </header>
      
      <Separator className="my-6" />

      <div className="flex items-center space-x-3 sm:space-x-4 my-6 py-3 border-y border-border">
         <form onSubmit={handleLikeSubmit} className="contents">
            <input type="hidden" name="postId" value={post.id} />
            {user && <input type="hidden" name="userId" value={user.uid} />}
            <Button 
                type="submit"
                variant="outline" 
                size="sm" 
                className={`flex items-center gap-1.5 text-sm ${optimisticLiked ? 'text-destructive border-destructive hover:bg-destructive/10' : 'hover:text-destructive'}`} 
                title="Like"
                disabled={isLikePending || !user}
            >
                {isLikePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${optimisticLiked ? 'fill-current text-destructive' : 'text-destructive'}`} />} 
                Like <span className="text-xs text-muted-foreground">({optimisticLikeCount})</span>
            </Button>
        </form>
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
        style={{ fontSize: '1.125rem', lineHeight: '1.85' }} 
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
      
      <Separator className="my-10" />

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

// Removed generateMetadata as this is now a client component.
// Metadata for dynamic routes with client-side fetching would typically
// be handled differently, e.g. by fetching in a server component parent
// or using `generateMetadata` with params if the core data needed for meta tags
// can still be fetched on the server. For now, focusing on functionality.
