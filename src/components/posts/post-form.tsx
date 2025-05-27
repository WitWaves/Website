
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
import { getAllTags } from '@/lib/posts'; // Import getAllTags
import { AlertCircle, Loader2, Wand2, CheckCircle, Minus, ImageIcon, Code2, ImageUp, PlusCircle, Check, ChevronsUpDown, XIcon } from 'lucide-react';
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
    // Fetch all existing tags
    async function fetchAllTags() {
      const tags = await getAllTags();
      setAllSystemTags(tags.sort());
    }
    fetchAllTags();
  }, []);

  useEffect(() => {
    if (isClient && editorRef.current && typeof window.Quill !== 'undefined' && !quillInstanceRef.current) {
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
        const editorContents = quill.getContents();
        // Check if editor is empty before pasting to avoid duplicating content on re-renders
        if (editorContents.ops && editorContents.ops.length === 1 && editorContents.ops[0].insert === '\n') {
           quill.clipboard.dangerouslyPasteHTML(0, post.content);
        }
      } else {
        quill.setContents([{ insert: '\n' }]); // Start with a blank line if no content
      }
      
      quill.on('text-change', (delta: any, oldDelta: any, source: string) => {
        const currentHTML = quill.root.innerHTML;
        // Avoid setting empty content to '<p><br></p>' which is Quill's empty state
        if (currentHTML === '<p><br></p>') {
           setQuillContent('');
        } else {
           setQuillContent(currentHTML);
        }
      });

      // Initialize quillContent state if post.content exists
      if (post?.content) {
        setQuillContent(post.content);
      } else {
        setQuillContent(''); // Ensure it's an empty string if no post content
      }
    }
    
    // Cleanup function for Quill instance
    return () => {
      if (quillInstanceRef.current && typeof quillInstanceRef.current.off === 'function') {
        quillInstanceRef.current.off('text-change');
      }
      // Potentially destroy the Quill instance if the component unmounts, though Quill can be robust.
      // if (quillInstanceRef.current) {
      //   quillInstanceRef.current = null; // Or more formal cleanup if Quill API provides it
      // }
    };
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
      const tagsFromAI = await getAISuggestedTagsAction(textContentForAI);
      const newAISuggestions = tagsFromAI.filter(tag => !currentTags.includes(tag) && tag.length > 0 && tag !== 'ai-suggestion-error');
      setAISuggestedTags(newAISuggestions); // Store AI suggestions separately to display them
      if (newAISuggestions.length === 0 && tagsFromAI.includes('ai-suggestion-error')) {
        toast({ title: 'AI Suggestion Error', description: 'Could not get suggestions from AI.', variant: 'destructive' });
      } else if (newAISuggestions.length === 0 && tagsFromAI.length > 0) {
         toast({ title: 'AI Suggestions', description: 'No new tags suggested or all suggestions already added.', variant: 'default' });
      }
    });
  };

  const addTag = (tagToAdd: string) => {
    const newTag = tagToAdd.trim().toLowerCase();
    if (newTag && !currentTags.includes(newTag)) {
      setCurrentTags(prevTags => [...prevTags, newTag]);
    }
    setTagInputValue(''); // Clear input after adding
    setAISuggestedTags(prev => prev.filter(t => t !== newTag)); // Remove from AI suggestions if added
    // setIsTagPopoverOpen(false); // Optionally close popover
  };

  const removeTag = (tagToRemove: string) => {
    setCurrentTags(currentTags.filter(tag => tag !== tagToRemove));
  };

  const filteredSystemTags = allSystemTags.filter(
    (sysTag) =>
      !currentTags.includes(sysTag.toLowerCase()) &&
      sysTag.toLowerCase().includes(tagInputValue.toLowerCase())
  );

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
    <form action={formAction} className="w-full max-w-6xl mx-auto">
      {user && (
        <input type="hidden" name="userId" value={user.uid} />
      )}
      <input type="hidden" name="content" value={quillContent} />
      <input type="hidden" name="tags" value={currentTags.join(',')} />


      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Main Content Area */}
        <div className="flex-grow lg:w-2/3 space-y-6">
          <div className="flex items-start space-x-3">
            <div className="w-1.5 bg-destructive h-10 mt-1 shrink-0 rounded-full"></div>
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
          
          <div className="bg-card border-0 rounded-md shadow-none">
            {isClient ? (
              <div ref={editorRef} className="min-h-[300px] [&_.ql-editor]:min-h-[250px] [&_.ql-editor]:text-base [&_.ql-editor]:leading-relaxed [&_.ql-toolbar]:rounded-t-md [&_.ql-container]:rounded-b-md [&_.ql-toolbar]:border-input [&_.ql-container]:border-input">
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
        <div className="lg:w-1/3 space-y-6 lg:sticky lg:top-24 h-max pt-2 flex flex-col">
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
                <p className="text-xs text-muted-foreground mb-1.5">Select relevant tags to get more accurate recommendations.</p>
            </div>

            <Popover open={isTagPopoverOpen} onOpenChange={setIsTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isTagPopoverOpen}
                  className="w-full justify-between text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
                >
                  {currentTags.length > 0 ? `${currentTags.length} tag(s) selected` : "Select or create tags..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput 
                    placeholder="Search or type new tag..."
                    value={tagInputValue}
                    onValueChange={setTagInputValue}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {tagInputValue.trim().length > 0 ? (
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-sm"
                          onClick={() => {
                            addTag(tagInputValue);
                            setIsTagPopoverOpen(false);
                          }}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" /> Create "{tagInputValue}"
                        </Button>
                      ) : (
                        "No tags found. Type to create."
                      )}
                    </CommandEmpty>
                    <CommandGroup>
                      {filteredSystemTags.map((sysTag) => (
                        <CommandItem
                          key={sysTag}
                          value={sysTag}
                          onSelect={(currentValue) => {
                            addTag(currentValue);
                            setIsTagPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              currentTags.includes(sysTag.toLowerCase()) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {sysTag}
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
              disabled={isAISuggesting || !isClient || (!quillContent.trim() && !titleValue.trim())} 
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
          <div className="mt-auto"> {/* This pushes the button to the bottom of the flex column */}
            <PublishButton isUpdate={!!post} />
          </div>
        </div>
      </div>
    </form>
  );
}

