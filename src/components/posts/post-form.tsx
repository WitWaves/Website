
'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { useActionState } from 'react'; // Corrected import
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // For Next/Image
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createPostAction, updatePostAction, getAISuggestedTagsAction, type FormState }
  from '@/app/actions';
import type { Post } from '@/lib/posts';
import { AlertCircle, Loader2, Wand2, CheckCircle, ImageUp, Minus, Image as ImageIcon, Code2 }
  from 'lucide-react';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Quill is loaded via CDN in src/app/layout.tsx

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
  
  const [quillContent, setQuillContent] = useState(post?.content || '');
  const [titleValue, setTitleValue] = useState(post?.title || '');

  const [isClient, setIsClient] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<any>(null); 

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && editorRef.current && typeof window.Quill !== 'undefined') {
      if (quillInstanceRef.current) {
        if (post?.content && quillInstanceRef.current.root.innerHTML !== post.content) {
          const editorContents = quillInstanceRef.current.getContents();
          if (editorContents.ops && editorContents.ops.length === 1 && editorContents.ops[0].insert === '\n') {
            quillInstanceRef.current.clipboard.dangerouslyPasteHTML(0, post.content);
          } else {
            try {
                const delta = quillInstanceRef.current.clipboard.convert(post.content);
                quillInstanceRef.current.setContents(delta, 'silent');
            } catch (e) {
                console.warn("Could not convert HTML to Delta, falling back to pasteHTML:", e);
                quillInstanceRef.current.clipboard.dangerouslyPasteHTML(0, post.content);
            }
          }
        }
        return;
      }

      const quill = new window.Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'], 
            ['blockquote', 'code-block'],
            [{'list': 'ordered'}, {'list': 'bullet'}],
            [{ 'script': 'sub'}, { 'script': 'super' }],      
            [{ 'indent': '-1'}, { 'indent': '+1' }],          
            [{ 'direction': 'rtl' }],                         
            [{ 'size': ['small', false, 'large', 'huge'] }], 
            [{ 'color': [] }, { 'background': [] }],          
            [{ 'font': [] }],
            [{ 'align': [] }],
            ['link', 'image', 'video'],
            ['clean']                                         
          ],
        },
        placeholder: "Start writing your stunning piece here...",
      });
      quillInstanceRef.current = quill;

      if (post?.content) {
        quill.clipboard.dangerouslyPasteHTML(0, post.content);
      }
      
      quill.on('text-change', (delta, oldDelta, source) => {
        if (source === 'user') {
          setQuillContent(quill.root.innerHTML);
        }
      });

      if (post?.content) {
        setQuillContent(post.content);
      }

      return () => {
        if (quillInstanceRef.current) {
          quillInstanceRef.current.off('text-change');
          if (editorRef.current) editorRef.current.innerHTML = ''; 
          quillInstanceRef.current = null;
        }
      };
    }
  }, [isClient, post?.content]);


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
    if (!isClient || !quillInstanceRef.current) return; 
    let textContentForAI = quillInstanceRef.current.getText(); 
    if (titleValue) {
        textContentForAI = titleValue + "\n\n" + textContentForAI;
    }
    
    startAITransition(async () => {
      const tags = await getAISuggestedTagsAction(textContentForAI);
      setSuggestedTags(tags.filter(tag => !currentTags.includes(tag) && tag.length > 0));
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

  if (authLoading && !post) { 
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2">Loading form...</p></div>;
  }

  if (!user && !post) { 
    return (
      <div className="text-center py-10">
        <p className="text-lg text-muted-foreground">Please <Link href="/login" className="text-primary hover:underline">log in</Link> to create a post.</p>
      </div>
    );
  }
  
  if (post && post.userId && user && post.userId !== user.uid) {
      return (
          <div className="text-center py-10">
              <p className="text-lg text-destructive">You are not authorized to edit this post.</p>
              <Button asChild variant="link" className="mt-4">
                  <Link href="/blog">Back to Blog</Link>
              </Button>
          </div>
      );
  }

  return (
    <form action={formAction} className="w-full max-w-6xl mx-auto"> {/* Increased max-width */}
      {user && (
        <input type="hidden" name="userId" value={user.uid} />
      )}
      <input type="hidden" name="content" value={quillContent} />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Main Content Area */}
        <div className="flex-grow lg:w-2/3 space-y-6">
          {/* Title Input with Red Bar */}
          <div className="flex items-start space-x-3">
            <div className="w-1.5 bg-destructive h-10 mt-1 shrink-0 rounded-full"></div> {/* Red bar */}
            <Input
              id="title"
              name="title"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              placeholder="Post Title..."
              className="text-3xl md:text-4xl lg:text-5xl font-bold border-0 focus:ring-0 focus-visible:ring-0 p-0 h-auto shadow-none leading-tight bg-transparent focus:border-transparent placeholder:text-muted-foreground/50 flex-1 min-w-0"
              required
            />
          </div>
           {state?.errors?.title && <p className="text-sm text-destructive mt-1 ml-4">{state.errors.title.join(', ')}</p>}
          
          {/* Featured Image Placeholder */}
          <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center text-muted-foreground border border-dashed border-border">
             <Image 
                src="https://placehold.co/600x338.png" 
                alt="Featured image placeholder" 
                width={600} 
                height={338} 
                className="object-cover rounded-md w-full h-full"
                data-ai-hint="abstract design"
              />
          </div>
         
          {/* Quill Editor Section */}
          <div className="bg-card border-0 rounded-md shadow-none"> {/* Removed border and shadow for cleaner look */}
            {isClient ? (
              <div ref={editorRef} className="min-h-[300px] [&_.ql-editor]:min-h-[250px] [&_.ql-editor]:text-base [&_.ql-editor]:leading-relaxed [&_.ql-toolbar]:rounded-t-md [&_.ql-container]:rounded-b-md [&_.ql-toolbar]:border-border [&_.ql-container]:border-border">
                {/* Quill will attach here */}
              </div>
            ) : (
              <div className="min-h-[300px] border-border rounded-md bg-muted/50 flex items-center justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Initializing editor...</p>
              </div>
            )}
          </div>
          {state?.errors?.content && <p className="text-sm text-destructive mt-1">{state.errors.content.join(', ')}</p>}

          {/* Mini Toolbar */}
          {isClient && (
            <div className="mt-2 flex items-center space-x-2 border-t border-border pt-3">
              <Button variant="ghost" size="icon" type="button" className="text-muted-foreground hover:text-foreground" title="Add Divider (placeholder)">
                <Minus className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" type="button" className="text-muted-foreground hover:text-foreground" title="Add Image (placeholder)">
                <ImageUp className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" type="button" className="text-muted-foreground hover:text-foreground" title="Add Code Block (placeholder)">
                <Code2 className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Sidebar */}
        <div className="lg:w-1/3 space-y-8 lg:sticky lg:top-24 h-max pt-2"> {/* Added pt-2 for alignment */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Upload Thumbnail</label>
            <div className="flex items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors bg-muted/30">
              <div className="text-center">
                <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">upload thumbnail</p>
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

            <Button type="button" variant="outline" size="sm" onClick={handleSuggestTags} disabled={isAISuggesting || !isClient || (!quillContent.trim() && !titleValue.trim()) } className="w-full text-xs py-2">
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
