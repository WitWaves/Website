
'use client'; 

import { getPost, type Post } from '@/lib/posts';
import { getCommentsForPost, type Comment } from '@/lib/comments';
import { isPostSavedByUser } from '@/lib/userProfile'; // Import isPostSavedByUser
import { notFound, useParams } from 'next/navigation'; 
import TagBadge from '@/components/posts/tag-badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { CalendarDays, Edit3, ArrowLeft, Heart, MessageCircle, Bookmark, Share2, Loader2, UserCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState, useActionState, useTransition, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { toggleLikePostAction, addCommentAction, toggleSavePostAction, type FormState } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function PostPage() {
  const params = useParams();
  const postId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLikePendingTransition, startLikeTransition] = useTransition();
  const [isCommentPendingTransition, startCommentTransition] = useTransition();
  const [isSavePendingTransition, startSaveTransition] = useTransition(); // For save action
  const commentFormRef = useRef<HTMLFormElement>(null);

  const [post, setPost] = useState<Post | null | undefined>(undefined); 
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);

  const [optimisticLiked, setOptimisticLiked] = useState(false);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(0);
  const [optimisticCommentCount, setOptimisticCommentCount] = useState(0);
  const [optimisticSaved, setOptimisticSaved] = useState(false); // For save status

  const [likeState, handleLikeAction, isLikeActionPending] = useActionState<FormState, FormData>(
    toggleLikePostAction,
    undefined
  );

  const [commentState, handleCommentAction, isCommentActionPending] = useActionState<FormState, FormData>(
    addCommentAction,
    undefined
  );

  const [saveState, handleSaveAction, isSaveActionPending] = useActionState<FormState, FormData>(
    toggleSavePostAction,
    undefined
  );
  
  useEffect(() => {
    async function fetchPostData() {
      if (postId) {
        setIsLoading(true);
        setIsLoadingComments(true);
        try {
            const fetchedPost = await getPost(postId);
            setPost(fetchedPost);
            if (fetchedPost) {
                setOptimisticLiked(fetchedPost.likedBy?.includes(user?.uid || '') || false);
                setOptimisticLikeCount(fetchedPost.likeCount || 0);
                setOptimisticCommentCount(fetchedPost.commentCount || 0);

                if (user?.uid) {
                    const saved = await isPostSavedByUser(user.uid, postId);
                    setOptimisticSaved(saved);
                }

                const fetchedComments = await getCommentsForPost(postId);
                setComments(fetchedComments);
            }
        } catch (error) {
            console.error("Error fetching post or comments: ", error);
            setPost(null); 
        } finally {
            setIsLoading(false);
            setIsLoadingComments(false);
        }
      }
    }
    fetchPostData();
  }, [postId, user?.uid]);


  useEffect(() => {
    if (likeState?.success && likeState.updatedLikeStatus?.postId === postId) {
      setOptimisticLiked(likeState.updatedLikeStatus.liked);
      setOptimisticLikeCount(likeState.updatedLikeStatus.newCount);
    } else if (likeState?.message && !likeState.success && likeState?.updatedLikeStatus?.postId === postId) {
      toast({ title: 'Error', description: likeState.message, variant: 'destructive' });
      if (post) { 
        setOptimisticLiked(post.likedBy?.includes(user?.uid || '') || false);
        setOptimisticLikeCount(post.likeCount || 0);
      }
    }
  }, [likeState, postId, toast, user?.uid, post]);

  useEffect(() => {
    if (saveState?.success && saveState.updatedSaveStatus?.postId === postId) {
        setOptimisticSaved(saveState.updatedSaveStatus.saved);
        toast({ title: saveState.updatedSaveStatus.saved ? 'Post Saved' : 'Post Unsaved', description: saveState.message});
    } else if (saveState?.message && !saveState.success && saveState?.updatedSaveStatus?.postId === postId) {
        toast({ title: 'Error saving post', description: saveState.message, variant: 'destructive' });
        // Optionally revert optimistic update
        // For simplicity, we might not revert here, or refetch saved status
    }
  }, [saveState, postId, toast]);

  useEffect(() => {
    if (commentState?.success) {
      toast({ title: 'Success', description: commentState.message });
      getCommentsForPost(postId).then(setComments);
      setOptimisticCommentCount(prev => prev + 1);
      commentFormRef.current?.reset(); 
    } else if (commentState?.message && !commentState.success) {
      toast({ title: 'Error adding comment', description: commentState.errors?.commentText?.join(', ') || commentState.message, variant: 'destructive' });
    }
  }, [commentState, postId, toast]);


  const handleLikeSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      toast({ title: 'Authentication Required', description: 'Please log in to like posts.', variant: 'destructive'});
      return;
    }
    if (!post) return;
    const formData = new FormData(event.currentTarget);
    setOptimisticLiked(!optimisticLiked);
    setOptimisticLikeCount(optimisticLiked ? optimisticLikeCount - 1 : optimisticLikeCount + 1);
    startLikeTransition(() => handleLikeAction(formData));
  };

  const handleSaveSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
        toast({ title: 'Authentication Required', description: 'Please log in to save posts.', variant: 'destructive'});
        return;
    }
    if (!post) return;
    const formData = new FormData(event.currentTarget);
    setOptimisticSaved(!optimisticSaved); // Optimistic update
    startSaveTransition(() => handleSaveAction(formData));
  };
  
  const handleCommentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
     if (!user) {
      toast({ title: 'Authentication Required', description: 'Please log in to comment.', variant: 'destructive'});
      return;
    }
    const formData = new FormData(event.currentTarget);
    startCommentTransition(() => handleCommentAction(formData));
  };


  if (isLoading || authLoading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-3">Loading post...</p></div>;
  }

  if (post === null) { 
    notFound();
  }
  
  if (!post) { 
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
        {post.userId === user?.uid && ( 
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
                disabled={isLikeActionPending || isLikePendingTransition || !user}
            >
                {(isLikeActionPending || isLikePendingTransition) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={`h-4 w-4 ${optimisticLiked ? 'fill-current text-destructive' : 'text-destructive'}`} />} 
                Like <span className="text-xs text-muted-foreground">({optimisticLikeCount})</span>
            </Button>
        </form>
        <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-sm" title="Comment" onClick={() => commentFormRef.current?.querySelector('textarea')?.focus()}>
          <MessageCircle className="h-4 w-4 text-primary" /> Comment <span className="text-xs text-muted-foreground">({optimisticCommentCount})</span>
        </Button>
        <form onSubmit={handleSaveSubmit} className="contents">
            <input type="hidden" name="postId" value={post.id} />
            {user && <input type="hidden" name="userId" value={user.uid} />}
            <Button 
                type="submit"
                variant="outline" 
                size="sm" 
                className={`flex items-center gap-1.5 text-sm ${optimisticSaved ? 'text-blue-500 border-blue-500 hover:bg-blue-500/10' : 'hover:text-blue-500'}`}
                title={optimisticSaved ? "Unsave" : "Save"}
                disabled={isSaveActionPending || isSavePendingTransition || !user}
            >
                {(isSaveActionPending || isSavePendingTransition) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className={`h-4 w-4 ${optimisticSaved ? 'fill-current text-blue-500' : 'text-blue-500'}`} />} 
                {optimisticSaved ? "Saved" : "Save"}
            </Button>
        </form>
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

      <section className="space-y-8">
        <h2 className="text-2xl font-semibold">Comments ({optimisticCommentCount})</h2>
        {user ? (
          <form onSubmit={handleCommentSubmit} ref={commentFormRef} className="space-y-3">
            <input type="hidden" name="postId" value={post.id} />
            {user.uid && <input type="hidden" name="userId" value={user.uid} />}
            {user.displayName && <input type="hidden" name="userDisplayName" value={user.displayName} />}
            {user.photoURL && <input type="hidden" name="userPhotoURL" value={user.photoURL} />}
            <div>
              <Textarea
                name="commentText"
                placeholder="Write your comment..."
                rows={4}
                required
                className="text-base"
              />
              {commentState?.errors?.commentText && (
                <p className="text-sm text-destructive mt-1">{commentState.errors.commentText.join(', ')}</p>
              )}
            </div>
            <Button type="submit" disabled={isCommentActionPending || isCommentPendingTransition}>
              {(isCommentActionPending || isCommentPendingTransition) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Post Comment
            </Button>
          </form>
        ) : (
          <p className="text-muted-foreground">
            Please <Link href="/login" className="text-primary hover:underline">log in</Link> to post a comment.
          </p>
        )}

        {isLoadingComments ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading comments...</p>
          </div>
        ) : comments.length > 0 ? (
          <div className="space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start space-x-3 p-4 border rounded-lg bg-card">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={comment.userPhotoURL || `https://placehold.co/40x40.png?text=${comment.userDisplayName.substring(0,1)}`} alt={comment.userDisplayName} data-ai-hint="person avatar"/>
                  <AvatarFallback>{comment.userDisplayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-foreground">{comment.userDisplayName}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(comment.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                  <p className="text-sm text-foreground/90 mt-1">{comment.text}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !isLoadingComments && <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
        )}
      </section>

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
