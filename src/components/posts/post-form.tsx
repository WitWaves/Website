
'use client';

import { useEffect, useState, useTransition, useRef } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createPostAction, updatePostAction, getAISuggestedTagsAction, type FormState }
  from '@/app/actions';
import type { Post } from '@/lib/posts';
import { getAllTags } from '@/lib/posts'; // For fetching existing tags
import { AlertCircle, Loader2, Wand2, CheckCircle, ImageIcon, Code2, PlusCircle, XIcon, ChevronsUpDown, Check, ImageUp } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';


// Quill is loaded via CDN in src/app/layout.tsx
declare global {
  interface Window {
    Quill: any;
  }
}

interface PostFormProps {
  post?: Post;
}

function PublishButton({isUpdate}: {isUpdate: boolean}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 py-3 text-base mt-auto">
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

  const [quillContent, setQuillContent] = useState(post?.content || '');
  const [titleValue, setTitleValue] = useState(post?.title || '');
  const contentHiddenInputRef = useRef<HTMLInputElement>(null);

  const [isClient, setIsClient] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<any>(null);

  // State for tags
  const [currentTags, setCurrentTags] = useState<string[]>(post?.tags || []);
  const [tagInputValue, setTagInputValue] = useState('');
  const [allSystemTags, setAllSystemTags] = useState<string[]>([]);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [aiSuggestedTags, setAISuggestedTags] = useState<string[]>([]);


  useEffect(() => {
    setIsClient(true);
    async function fetchAllSystemTagsData() {
      try {
        const tags = await getAllTags();
        setAllSystemTags(tags.sort());
      } catch (error) {
        console.error("PostForm: Error fetching all system tags:", error);
        setAllSystemTags([]);
        toast({
          title: "Error",
          description: "Could not load existing tags for suggestions.",
          variant: "destructive"
        });
      }
    }
    fetchAllSystemTagsData();
  }, [toast]);

  useEffect(() => {
    if (contentHiddenInputRef.current) {
      contentHiddenInputRef.current.value = quillContent;
    }
  }, [quillContent]);

  useEffect(() => {
    if (isClient && editorRef.current && typeof window.Quill !== 'undefined' && !quillInstanceRef.current) {
      const toolbarOptions = [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        ['blockquote', 'code-block'],
        [{'list': 'ordered'}, {'list': 'bullet'}],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'color': [] }, { 'background': [] }],
        // Removed font selection: [{ 'font': [] }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['clean']
      ];

      const quill = new window.Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: toolbarOptions,
        },
        placeholder: "Start writing your stunning piece here...",
      });
      quillInstanceRef.current = quill;

      if (post?.content) {
        try {
            // Attempt to convert HTML to Delta if Quill supports it well,
            // or directly paste HTML. For simplicity, pasting HTML is often more reliable
            // if the content is already well-formed HTML from a previous Quill session.
            quill.clipboard.dangerouslyPasteHTML(0, post.content);
            setQuillContent(post.content); // Ensure React state is also updated
        } catch (e) {
            console.warn("Could not set initial Quill content:", e);
            // Fallback if dangerouslyPasteHTML fails or isn't suitable
            quill.setText(post.content || ''); 
            setQuillContent(post.content || '');
        }
      } else {
        setQuillContent(''); // Initialize with empty for new posts
      }

      quill.on('text-change', (_delta: any, _oldDelta: any, source: string) => {
        if (source === 'user') {
          const currentHTML = quill.root.innerHTML;
           if (currentHTML === '<p><br></p>') { // Quill's representation of empty
             setQuillContent('');
          } else {
             setQuillContent(currentHTML);
          }
        }
      });
    }

    return () => {
      // Cleanup Quill instance on component unmount
      // Accessing quillInstanceRef.current directly might be an issue if this cleanup runs
      // after the ref is potentially nulled or changed. Consider if `quillInstanceRef.current?.destroy()` is safer
      // or if the instance needs to be captured in a variable within the effect scope.
      // For now, assuming quillInstanceRef.current remains valid during cleanup.
      if (quillInstanceRef.current && typeof quillInstanceRef.current.off === 'function') {
        quillInstanceRef.current.off('text-change');
      }
      // Note: Quill doesn't have a standard 'destroy' method. Manual cleanup of listeners and DOM might be needed
      // if memory leaks become an issue, but often unmounting the parent DOM node is sufficient.
      // For this example, we primarily care about removing the event listener.
      // quillInstanceRef.current = null; // Optional: explicitly nullify the ref after cleanup
    };
  }, [isClient, post?.content]); // Rerun if post.content changes for editing


  const actionToRun = post ? updatePostAction.bind(null, post.id) : createPostAction;
  const [state, formAction] = useActionState(actionToRun, undefined);

  // Client-side wrapper for form submission to include Quill content
  const clientSideFormAction = (formData: FormData) => {
    formData.set('content', quillContent); // Ensure latest Quill content is on FormData
    formAction(formData);
  };

  useEffect(() => {
    if (state?.success) {
      toast({
        title: state.message,
        variant: 'default',
        description: post ? `Post "${titleValue}" updated.` : `Post created.`,
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
      });
    }
  }, [state, router, toast, post, titleValue]);

  const handleSuggestTags = () => {
    if (!isClient || !quillInstanceRef.current) return;
    let textContentForAI = quillInstanceRef.current.getText(0, 2000); 
    if (titleValue) {
        textContentForAI = titleValue + "\n\n" + textContentForAI;
    }

    if (!textContentForAI.trim()) {
        toast({ title: "Empty Content", description: "Cannot suggest tags for empty title and content.", variant: "default" });
        return;
    }

    startAITransition(async () => {
      try {
        const tagsFromAI = await getAISuggestedTagsAction(textContentForAI);
        const newAISuggestions = tagsFromAI.filter(tag => !currentTags.includes(tag) && tag.length > 0 && tag !== 'ai-suggestion-error');
        setAISuggestedTags(newAISuggestions);
        if (newAISuggestions.length === 0 && tagsFromAI.includes('ai-suggestion-error')) {
          toast({ title: 'AI Suggestion Error', description: 'Could not get suggestions from AI.', variant: 'destructive' });
        } else if (newAISuggestions.length === 0 && tagsFromAI.length > 0) {
           toast({ title: 'AI Suggestions', description: 'No new tags suggested or all suggestions already added.', variant: 'default' });
        } else if (newAISuggestions.length > 0) {
            toast({ title: 'AI Suggestions', description: 'New tags suggested!', variant: 'default' });
        }
      } catch (error) {
        console.error("Error calling getAISuggestedTagsAction:", error);
        toast({ title: 'AI Error', description: 'Failed to fetch AI tag suggestions.', variant: 'destructive' });
        setAISuggestedTags([]);
      }
    });
  };

  const addTag = (tagToAdd: string) => {
    const newTag = tagToAdd.trim().toLowerCase();
    if (newTag && !currentTags.includes(newTag)) {
      setCurrentTags(prevTags => [...prevTags, newTag]);
    }
    setTagInputValue(''); // Clear input after adding
    setAISuggestedTags(prev => prev.filter(t => t !== newTag)); // Remove from AI suggestions if it was there
    // setIsTagPopoverOpen(false); // Close popover after selection
  };

  const removeTag = (tagToRemove: string) => {
    setCurrentTags(currentTags.filter(tag => tag !== tagToRemove));
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

  const filteredSystemTags = allSystemTags.filter(tag => 
    !currentTags.includes(tag) && 
    tag.toLowerCase().includes(tagInputValue.toLowerCase())
  );

  return (
    <form action={clientSideFormAction} className="w-full max-w-6xl mx-auto">
      {user && (
        <input type="hidden" name="userId" value={user.uid} />
      )}
      {/* Hidden input to carry Quill's HTML content */}
      <input type="hidden" name="content" ref={contentHiddenInputRef} value={quillContent} />
      <input type="hidden" name="tags" value={currentTags.join(',')} />


      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Main Content Area */}
        <div className="flex-grow lg:w-3/4 space-y-6"> {/* Changed from lg:w-2/3 */}
          <div className="flex items-start space-x-3">
            <div className="w-1.5 bg-destructive h-10 mt-1 shrink-0 rounded-full"></div>
            <Input
              id="title"
              name="title"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              placeholder="Post Title..."
              className="text-3xl md:text-4xl font-bold border-0 focus:ring-0 focus-visible:ring-0 p-0 h-auto shadow-none leading-tight bg-transparent placeholder:text-muted-foreground/50 flex-1 min-w-0"
              required
            />
          </div>
           {state?.errors?.title && <p className="text-sm text-destructive mt-1 ml-4">{state.errors.title.join(', ')}</p>}
          
          {/* Placeholder for Featured Image */}
          {/* <div className="h-40 md:h-64 bg-muted/50 rounded-lg flex items-center justify-center border border-dashed border-border">
            <p className="text-muted-foreground">Featured Image Placeholder</p>
          </div> */}

          <div className="bg-card border-0 rounded-md shadow-none">
            {isClient ? (
              <div ref={editorRef} className="min-h-[300px] [&_.ql-editor]:min-h-[250px] [&_.ql-editor]:text-base [&_.ql-editor]:leading-relaxed [&_.ql-toolbar]:rounded-t-md [&_.ql-container]:rounded-b-md [&_.ql-toolbar]:border-input [&_.ql-container]:border-input">
                {/* Quill editor will be initialized here by useEffect */}
              </div>
            ) : (
              <div className="min-h-[300px] border border-input rounded-md bg-muted/50 flex items-center justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Initializing editor...</p>
              </div>
            )}
          </div>
          {state?.errors?.content && <p className="text-sm text-destructive mt-1">{state.errors.content.join(', ')}</p>}
        </div>

        {/* Right Column: Sidebar */}
        <div className="lg:w-1/4 space-y-6 lg:sticky lg:top-24 h-max pt-2 flex flex-col"> {/* Changed from lg:w-1/3 */}
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
                <label htmlFor="tags-input-label" className="block text-lg font-semibold text-foreground mb-0.5">
                    Tags<span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground mb-1.5">Add or select relevant tags.</p>
            </div>

            <Popover open={isTagPopoverOpen} onOpenChange={setIsTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isTagPopoverOpen}
                  className="w-full justify-between text-sm text-muted-foreground hover:text-foreground"
                >
                  {currentTags.length > 0 ? `${currentTags.length} tag(s) selected` : "Select or create tags..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput 
                    placeholder="Search or create tag..."
                    value={tagInputValue}
                    onValueChange={setTagInputValue}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {tagInputValue.trim().length > 0 ? (
                        <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => { addTag(tagInputValue); setIsTagPopoverOpen(false); }}>
                          Create tag: "{tagInputValue}"
                        </Button>
                      ) : "No tags found. Type to create."}
                    </CommandEmpty>
                    <CommandGroup>
                      {filteredSystemTags.map((tag) => (
                        <CommandItem
                          key={tag}
                          value={tag}
                          onSelect={(currentValue) => {
                            addTag(currentValue);
                            setIsTagPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              currentTags.includes(tag) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {tag}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {currentTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border">
                {currentTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs group">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-1.5 opacity-50 group-hover:opacity-100 focus:outline-none">
                      <XIcon className="h-3 w-3" />
                      <span className="sr-only">Remove {tag}</span>
                    </button>
                  </Badge>
                ))}
              </div>
            )}
             {state?.errors?.tags && <p className="text-sm text-destructive">{state.errors.tags.join(', ')}</p>}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSuggestTags}
              disabled={isAISuggesting || !isClient || (!quillContent.trim() && !titleValue.trim()) || !quillInstanceRef.current}
              className="w-full text-xs py-2"
            >
              {isAISuggesting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-1.5 h-3.5 w-3.5" />}
              Suggest Tags with AI
            </Button>
            {aiSuggestedTags.length > 0 && (
              <div className="mt-2 p-2 border rounded-md bg-muted/30 max-h-32 overflow-y-auto">
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">AI Suggestions (click to add):</p>
                <div className="flex flex-wrap gap-1.5">
                  {aiSuggestedTags.map(tag => (
                     <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-accent hover:text-accent-foreground text-xs" onClick={() => { addTag(tag); }}>
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
          <div className="mt-auto">
            <PublishButton isUpdate={!!post} />
          </div>
        </div>
      </div>
    </form>
  );
}

