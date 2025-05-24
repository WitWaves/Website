
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { useActionState } from 'react'; // Corrected import
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card'; // Removed CardHeader, CardTitle, CardFooter, CardDescription
import { createPostAction, updatePostAction, getAISuggestedTagsAction, type FormState } from '@/app/actions';
import type { Post } from '@/lib/postsStore';
import { AlertCircle, Loader2, Wand2, CheckCircle, ImageUp, Minus, Image as ImageIcon, Code2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PostFormProps {
  post?: Post;
}

function PublishButton({isUpdate}: {isUpdate: boolean}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 py-3 text-base">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isUpdate ? 'Updating...' : 'Publishing...'}
        </>
      ) : (
        isUpdate ? 'Update Post' : 'Publish'
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
  const [titleValue, setTitleValue] = useState(post?.title || ''); // For controlled title textarea

  const action = post ? updatePostAction.bind(null, post.id) : createPostAction;
  const [state, formAction] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.success) {
      toast({
        title: state.message,
        variant: 'default',
        description: post ? `Post "${titleValue}" updated.` : `Post created.`,
        action: <CheckCircle className="text-green-500" />,
      });
      if (!post && (state as any).newPostId) {
        router.push(`/posts/${(state as any).newPostId}`);
      } else if (post) {
        router.push(`/posts/${post.id}`);
      } else {
        router.push('/');
      }
    } else if (state?.message && !state.success) {
      toast({
        title: 'Error',
        description: state.message,
        variant: 'destructive',
        action: <AlertCircle className="text-red-500" />,
      });
    }
  }, [state, router, toast, post, titleValue]);

  const handleSuggestTags = () => {
    startAITransition(async () => {
      const tags = await getAISuggestedTagsAction(contentForAI);
      setSuggestedTags(tags.filter(tag => !currentTags.includes(tag)));
    });
  };
  
  const addTag = (tagToAdd: string) => {
    const newTag = tagToAdd.trim().toLowerCase();
    if (newTag && !currentTags.includes(newTag)) {
      setCurrentTags([...currentTags, newTag]);
    }
    setTagInput('');
    setSuggestedTags(prev => prev.filter(t => t !== newTag));
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
    // Removed Card wrapper to allow form to take full width of its container if needed
    // or apply styling directly to the form or a new div.
    // For this redesign, we'll use a flex container to manage layout.
    <form action={formAction} className="w-full max-w-5xl mx-auto"> {/* Max width for content area */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Title, Content, Toolbar */}
        <div className="flex-grow lg:w-2/3 space-y-6">
          <div className="relative flex items-start">
            <div className="absolute left-0 top-2 bottom-2 w-1 bg-destructive rounded-full -ml-4 md:-ml-6"></div>
            <Textarea
              id="title"
              name="title"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              placeholder="The Timeless Beauty of Floral Patterns in Art and Design" // Placeholder from image
              className="text-3xl md:text-4xl lg:text-5xl font-bold border-none focus:ring-0 focus-visible:ring-0 p-0 h-auto resize-none overflow-hidden shadow-none leading-tight"
              rows={2} // Start with 2 rows, auto-expands
              required
              // Auto-resize textarea height for title
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
              onFocus={(e) => { // Ensure resize on focus in case of pre-filled content
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
          </div>
          {state?.errors?.title && <p className="text-sm text-destructive mt-1">{state.errors.title.join(', ')}</p>}

          <Textarea
            id="content"
            name="content"
            defaultValue={post?.content}
            placeholder="This stunning image showcases an intricate floral pattern..." // Placeholder from image
            className="text-base leading-relaxed min-h-[500px] border-border focus:ring-primary"
            onChange={(e) => setContentForAI(e.target.value)}
            required
          />
          {state?.errors?.content && <p className="text-sm text-destructive mt-1">{state.errors.content.join(', ')}</p>}

          {/* Placeholder Rich Text Toolbar */}
          <div className="flex items-center space-x-2 p-2 border border-border rounded-md bg-muted/50 sticky bottom-4 z-10">
            <Button variant="ghost" size="icon" type="button" className="text-muted-foreground hover:text-foreground">
              <Minus className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" type="button" className="text-muted-foreground hover:text-foreground">
              <ImageIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" type="button" className="text-muted-foreground hover:text-foreground">
              <Code2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Right Column: Thumbnail, Tags, Publish */}
        <div className="lg:w-1/3 space-y-8 lg:sticky lg:top-24 h-max"> {/* Sticky for desktop */}
          {/* Upload Thumbnail Placeholder */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Featured Image</label>
            <div className="flex items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
              <div className="text-center">
                <ImageUp className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">upload thumbnail</p>
              </div>
            </div>
          </div>

          {/* Tags Section */}
          <div className="space-y-3">
            <div>
                <label htmlFor="tags-input" className="block text-sm font-medium text-foreground mb-0.5">
                    Tags<span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground mb-1.5">Select relevant tags to get more accurate recommendations.</p>
            </div>
            <Input
              id="tags-input"
              value={tagInput}
              onChange={handleTagInputChange}
              onKeyDown={handleTagInputKeyDown}
              placeholder="e.g., technology, art"
              className="text-sm"
            />
            <input type="hidden" name="tags" value={currentTags.join(',')} />
            
            {currentTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {currentTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-destructive/80 hover:text-destructive-foreground text-xs" onClick={() => removeTag(tag)}>
                    {tag} &times;
                  </Badge>
                ))}
              </div>
            )}
             {state?.errors?.tags && <p className="text-sm text-destructive">{state.errors.tags.join(', ')}</p>}


            <Button type="button" variant="outline" size="sm" onClick={handleSuggestTags} disabled={isAISuggesting || !contentForAI.trim()} className="w-full text-xs py-2">
              {isAISuggesting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-1.5 h-3.5 w-3.5" />}
              Suggest Tags with AI
            </Button>
            {suggestedTags.length > 0 && (
              <div className="mt-2 p-2 border rounded-md bg-secondary/30 max-h-32 overflow-y-auto">
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">AI Suggestions (click to add):</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedTags.map(tag => (
                     <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-accent hover:text-accent-foreground text-xs" onClick={() => addTag(tag)}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
             {isAISuggesting && <p className="text-xs text-muted-foreground text-center mt-1">AI is thinking...</p>}
          </div>
          
          {state?.message && !state.success && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-4 w-4" /> {state.message.replace('Validation Error: ', '')}
            </p>
          )}
          <PublishButton isUpdate={!!post} />
        </div>
      </div>
    </form>
  );
}
