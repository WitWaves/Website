
'use client';

import { useEffect, useState, useTransition, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { createPostAction, updatePostAction, getAISuggestedTagsAction, type FormState } from '@/app/actions';
import type { Post } from '@/lib/postsStore';
import { AlertCircle, Loader2, Wand2, CheckCircle, TagsIcon, Info } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import TagBadge from './tag-badge'; // For displaying selected tags

interface PostFormProps {
  post?: Post;
}

function SubmitButton({isUpdate}: {isUpdate: boolean}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isUpdate ? 'Updating...' : 'Creating...'}
        </>
      ) : (
        isUpdate ? 'Update Post' : 'Create Post'
      )}
    </Button>
  );
}

export default function PostForm({ post }: PostFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isAISuggesting, startAITransition] = useTransition();
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [currentTags, setCurrentTags] = useState<string[]>(post?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [contentForAI, setContentForAI] = useState(post?.content || '');

  const action = post ? updatePostAction.bind(null, post.id) : createPostAction;
  const [state, formAction] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.success) {
      toast({
        title: state.message,
        variant: 'default',
        description: post ? `Post "${post.title}" updated.` : `Post created.`,
        action: <CheckCircle className="text-green-500" />,
      });
      if (!post && (state as any).newPostId) { // If it's a new post, redirect to its page
        router.push(`/posts/${(state as any).newPostId}`);
      } else if (post) {
        router.push(`/posts/${post.id}`); // For updated post, redirect to its page
      } else {
        router.push('/'); // Fallback redirect
      }
    } else if (state?.message && !state.success) {
      toast({
        title: 'Error',
        description: state.message,
        variant: 'destructive',
        action: <AlertCircle className="text-red-500" />,
      });
    }
  }, [state, router, toast, post]);

  const handleSuggestTags = () => {
    startAITransition(async () => {
      const tags = await getAISuggestedTagsAction(contentForAI);
      setSuggestedTags(tags.filter(tag => !currentTags.includes(tag))); // Filter out already added tags
    });
  };
  
  const addTag = (tagToAdd: string) => {
    const newTag = tagToAdd.trim().toLowerCase();
    if (newTag && !currentTags.includes(newTag)) {
      setCurrentTags([...currentTags, newTag]);
    }
    setTagInput(''); // Clear input after adding
    setSuggestedTags(prev => prev.filter(t => t !== newTag)); // Remove from suggestions if it was there
  };

  const removeTag = (tagToRemove: string) => {
    setCurrentTags(currentTags.filter(tag => tag !== tagToRemove));
  };
  
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl">{post ? 'Edit Post' : 'Create New Post'}</CardTitle>
        <CardDescription>
          {post ? 'Modify the details of your existing post.' : 'Share your thoughts with the world.'}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-lg">Title</Label>
            <Input
              id="title"
              name="title"
              defaultValue={post?.title}
              placeholder="Enter a captivating title"
              className="text-base"
              required
            />
            {state?.errors?.title && <p className="text-sm text-destructive">{state.errors.title.join(', ')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content" className="text-lg">Content</Label>
            <Textarea
              id="content"
              name="content"
              defaultValue={post?.content}
              placeholder="Write your masterpiece here..."
              rows={15}
              className="text-base leading-relaxed"
              onChange={(e) => setContentForAI(e.target.value)}
              required
            />
            {state?.errors?.content && <p className="text-sm text-destructive">{state.errors.content.join(', ')}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags" className="text-lg">Tags</Label>
            <div className="flex items-center gap-2">
              <Input
                id="tags-input"
                value={tagInput}
                onChange={handleTagInputChange}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Add tags (comma or Enter separated)"
                className="text-base flex-grow"
              />
               <Button type="button" variant="outline" onClick={() => addTag(tagInput)} disabled={!tagInput.trim()}>Add Tag</Button>
            </div>
             <input type="hidden" name="tags" value={currentTags.join(',')} />
            <p className="text-xs text-muted-foreground">Current tags (click to remove):</p>
            {currentTags.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {currentTags.map(tag => (
                   <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground" onClick={() => removeTag(tag)}>
                   {tag} &times;
                 </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No tags added yet.</p>
            )}
            {state?.errors?.tags && <p className="text-sm text-destructive">{state.errors.tags.join(', ')}</p>}
          </div>
          
          <div className="space-y-2">
            <Button type="button" variant="outline" onClick={handleSuggestTags} disabled={isAISuggesting || !contentForAI.trim()}>
              {isAISuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Suggest Tags with AI
            </Button>
            {suggestedTags.length > 0 && (
              <div className="mt-2 p-3 border rounded-md bg-secondary/50">
                <p className="text-sm font-medium mb-2 text-secondary-foreground flex items-center"><Info className="w-4 h-4 mr-1.5"/>AI Suggested Tags (click to add):</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.map(tag => (
                     <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-accent hover:text-accent-foreground" onClick={() => addTag(tag)}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
             {isAISuggesting && <p className="text-sm text-muted-foreground">AI is thinking...</p>}
          </div>

        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-6 border-t">
           {state?.message && !state.success && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-4 w-4" /> {state.message.replace('Validation Error: ', '')}
            </p>
          )}
          <SubmitButton isUpdate={!!post} />
        </CardFooter>
      </form>
    </Card>
  );
}
