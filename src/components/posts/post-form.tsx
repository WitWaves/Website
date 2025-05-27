
'use client';

import { useEffect, useState, useTransition, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic'; // Import dynamic for client-side only components
import { Input } from '@/components/ui/input';
// Textarea is replaced by ReactQuill
import { Button } from '@/components/ui/button';
import { createPostAction, updatePostAction, getAISuggestedTagsAction, type FormState } from '@/app/actions';
import type { Post } from '@/lib/posts';
import { AlertCircle, Loader2, Wand2, CheckCircle, ImageUp, Minus, Image as ImageIcon, Code2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

// Dynamically import ReactQuill to ensure it's only loaded on the client-side
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css'; // Import Quill styles

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
  const { user, loading: authLoading } = useAuth();
  const [isAISuggesting, startAITransition] = useTransition();
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [currentTags, setCurrentTags] = useState<string[]>(post?.tags || []);
  const [tagInput, setTagInput] = useState('');
  
  const [quillContent, setQuillContent] = useState(post?.content || ''); // State for Quill editor content
  const [titleValue, setTitleValue] = useState(post?.title || '');

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
      if (!post && state.newPostId) {
        router.push(`/posts/${state.newPostId}`);
      } else if (post) {
        router.push(`/posts/${post.id}`);
      } else {
        router.push('/blog');
      }
    } else if (state?.message && !state.success) {
      toast({
        title: 'Error',
        description: state.errors ? JSON.stringify(state.errors) : state.message,
        variant: 'destructive',
        action: <AlertCircle className="text-red-500" />,
      });
    }
  }, [state, router, toast, post, titleValue]);

  const handleSuggestTags = () => {
    // Basic tag stripping for AI suggestion (more robust stripping might be needed for complex HTML)
    const textContentForAI = quillContent.replace(/<[^>]*>?/gm, ' '); 
    startAITransition(async () => {
      const tags = await getAISuggestedTagsAction(textContentForAI);
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

  // Quill editor modules configuration (optional, for customization)
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image'], // 'image' can be added if image handling is set up
      ['clean']
    ],
  };

  // Quill editor formats (optional)
  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image'
  ];


  if (authLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2">Loading form...</p></div>;
  }

  if (!user && !post) {
    return (
      <div className="text-center py-10">
        <p className="text-lg text-muted-foreground">Please <a href="/login" className="text-primary hover:underline">log in</a> to create a post.</p>
      </div>
    );
  }
  if (post && post.userId && user && post.userId !== user.uid) {
      return (
          <div className="text-center py-10">
              <p className="text-lg text-destructive">You are not authorized to edit this post.</p>
              <Button asChild variant="link" className="mt-4">
                  <a href="/blog">Back to Blog</a>
              </Button>
          </div>
      );
  }


  return (
    <form action={formAction} className="w-full max-w-5xl mx-auto">
      {!post && user && (
        <input type="hidden" name="userId" value={user.uid} />
      )}
      
      {/* Hidden input to send Quill content to the server action */}
      <input type="hidden" name="content" value={quillContent} />


      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-grow lg:w-2/3 space-y-6">
          <div className="relative flex items-start">
            <div className="absolute left-0 top-2 bottom-2 w-1 bg-destructive rounded-full -ml-4 md:-ml-6"></div>
            <Input // Using Input for title, Textarea was too similar to Quill
              id="title"
              name="title"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              placeholder="The Timeless Beauty of Floral Patterns..."
              className="text-3xl md:text-4xl lg:text-5xl font-bold border-none focus:ring-0 focus-visible:ring-0 p-0 h-auto shadow-none leading-tight bg-transparent"
              required
            />
          </div>
          {state?.errors?.title && <p className="text-sm text-destructive mt-1">{state.errors.title.join(', ')}</p>}

          {/* ReactQuill editor replacing Textarea */}
          <div className="bg-card border border-input rounded-md"> {/* Added a wrapper for Quill for potential styling consistency */}
            <ReactQuill 
              theme="snow" 
              value={quillContent} 
              onChange={setQuillContent}
              modules={quillModules}
              formats={quillFormats}
              placeholder="This stunning image showcases an intricate floral pattern..."
              className="min-h-[400px] [&_.ql-editor]:min-h-[400px] [&_.ql-editor]:text-base [&_.ql-editor]:leading-relaxed [&_.ql-toolbar]:rounded-t-md [&_.ql-container]:rounded-b-md" 
            />
          </div>
          {state?.errors?.content && <p className="text-sm text-destructive mt-1">{state.errors.content.join(', ')}</p>}

          <div className="flex items-center space-x-2 p-2 border border-border rounded-md bg-muted/50 sticky bottom-4 z-10">
            {/* These buttons are now placeholders as Quill provides its own toolbar */}
            <Button variant="ghost" size="icon" type="button" className="text-muted-foreground hover:text-foreground" title="Divider (handled by Quill)">
              <Minus className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" type="button" className="text-muted-foreground hover:text-foreground" title="Image (handled by Quill)">
              <ImageIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" type="button" className="text-muted-foreground hover:text-foreground" title="Code block (handled by Quill)">
              <Code2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="lg:w-1/3 space-y-8 lg:sticky lg:top-24 h-max">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Featured Image</label>
            <div className="flex items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
              <div className="text-center">
                <ImageUp className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">upload thumbnail</p>
              </div>
            </div>
          </div>

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

            <Button type="button" variant="outline" size="sm" onClick={handleSuggestTags} disabled={isAISuggesting || !quillContent.trim()} className="w-full text-xs py-2">
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

          {state?.errors?.userId && <p className="text-sm text-destructive mt-1">{state.errors.userId.join(', ')}</p>}
           {state?.message && !state.success && (!state.errors || Object.keys(state.errors).length === 0) && (
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
