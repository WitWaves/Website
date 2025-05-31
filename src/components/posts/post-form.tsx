
'use client';

import Image from 'next/image';
import { useEffect, useState, useTransition, useRef } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { createPostAction, updatePostAction, getAISuggestedTagsAction, type FormState }
  from '@/app/actions';
import type { Post } from '@/lib/posts';
import { getAllTags } from '@/lib/posts';
import { AlertCircle, Loader2, Wand2, ImageUp, XIcon, ChevronsUpDown, Check, Trash2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { storage } from '@/lib/firebase/config';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';


declare global {
  interface Window {
    Quill: any;
  }
}

interface PostFormProps {
  post?: Post;
}

function PublishButton({isUpdate, isUploading}: {isUpdate: boolean, isUploading: boolean}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || isUploading} className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 py-3 text-base mt-auto">
      {(pending || isUploading) ? (
        <>
          <Image src="https://firebasestorage.googleapis.com/v0/b/witwaves.firebasestorage.app/o/Website%20Elements%2FLoading%20-%20White%20-%20Transparent.gif?alt=media&token=a8218960-4f9c-4a45-99f8-d6f070f9e16a" alt="Loading..." width={20} height={20} className="mr-2" />
          {isUploading ? 'Uploading...' : (isUpdate ? 'Updating...' : 'Publishing...')}
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
  const uploadedThumbnailUrlHiddenInputRef = useRef<HTMLInputElement>(null);


  const [isClient, setIsClient] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<any>(null);

  const [currentTags, setCurrentTags] = useState<string[]>(post?.tags || []);
  const [tagInputValue, setTagInputValue] = useState('');
  const [allSystemTags, setAllSystemTags] = useState<string[]>([]);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [aiSuggestedTags, setAISuggestedTags] = useState<string[]>([]);

  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(post?.imageUrl || null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState<boolean>(false);
  const [thumbnailUploadProgress, setThumbnailUploadProgress] = useState<number>(0);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    setIsClient(true);
  }, []);

  const imageHandler = () => {
    console.log('[PostForm Quill ImageHandler] Invoked.');
    if (!user?.uid || !quillInstanceRef.current) {
      console.error('[PostForm Quill ImageHandler] User not logged in or editor not ready.');
      toast({ title: "Editor Error", description: "User not logged in or editor is not ready for image uploads.", variant: "destructive" });
      return;
    }
    const quill = quillInstanceRef.current;
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        console.log('[PostForm Quill ImageHandler] No file selected.');
        return;
      }
      if (!user?.uid) { // Double check, though covered above
        console.error('[PostForm Quill ImageHandler] User became undefined during operation.');
        return;
      }

      const range = quill.getSelection(true) || { index: quill.getLength(), length: 0 };
      console.log('[PostForm Quill ImageHandler] File selected:', file.name, 'Quill range:', range);
      const toastId = `quill-upload-${Date.now()}`;

      try {
        toast({
          id: toastId,
          title: "Uploading Image to Post...",
          description: `Starting upload for ${file.name}`,
          duration: Infinity,
        });
        console.log('[PostForm Quill ImageHandler] Toast shown for upload start.');

        const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const postIdForPath = post?.id || `new_${Date.now()}`;
        const imageFilePath = `postContentImages/${user.uid}/${postIdForPath}/${uniqueId}-${file.name}`;
        console.log('[PostForm Quill ImageHandler] Upload path:', imageFilePath);

        const imageFileRef = storageRef(storage, imageFilePath);
        const uploadTask = uploadBytesResumable(imageFileRef, file);

        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            toast({
              id: toastId,
              title: "Uploading Image to Post...",
              description: `${file.name} - ${Math.round(progress)}% done.`,
              duration: Infinity,
            });
          },
          (error) => {
            console.error("[PostForm Quill ImageHandler] Firebase Storage Upload Error:", error.code, error.message, error);
            toast.dismiss(toastId);
            toast({ title: "Quill Image Upload Failed", description: `Could not upload ${file.name}: ${error.message} (Code: ${error.code})`, variant: "destructive" });
          },
          async () => {
            try {
              console.log('[PostForm Quill ImageHandler] Upload completed. Getting download URL...');
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('[PostForm Quill ImageHandler] Download URL obtained:', downloadURL);
              quill.insertEmbed(range.index, 'image', downloadURL);
              quill.setSelection(range.index + 1);
              toast.dismiss(toastId);
              toast({ title: "Image Uploaded to Post", description: `${file.name} inserted.`, variant: "default" });
            } catch (getUrlError: any) {
              console.error("[PostForm Quill ImageHandler] Error getting download URL:", getUrlError.code, getUrlError.message, getUrlError);
              toast.dismiss(toastId);
              toast({ title: "Quill Image URL Error", description: `Failed to get URL for ${file.name}: ${getUrlError.message}`, variant: "destructive" });
            }
          }
        );
      } catch (error: any) {
        console.error("[PostForm Quill ImageHandler] Outer error during image upload setup:", error.message, error);
        toast.dismiss(toastId); // Ensure initial toast is dismissed
        toast({ title: "Quill Image Upload Error", description: `Could not initiate image upload: ${error.message}`, variant: "destructive" });
      }
    };
  };


  useEffect(() => {
    if (isClient && editorRef.current && !quillInstanceRef.current) {
      if (typeof window.Quill !== 'undefined') {
        const quill = new window.Quill(editorRef.current, {
          theme: 'snow',
          modules: {
            toolbar: {
              container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'script': 'sub' }, { 'script': 'super' }],
                [{ 'indent': '-1' }, { 'indent': '+1' }],
                [{ 'direction': 'rtl' }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                ['link', 'image', 'video'],
                ['clean']
              ],
              handlers: {
                'image': imageHandler
              }
            },
          },
          placeholder: "Start writing your stunning piece here...",
        });
        quillInstanceRef.current = quill;
        quill.on('text-change', (_delta: any, _oldDelta: any, source: string) => {
          if (source === 'user') {
            const currentHTML = quill.root.innerHTML;
            setQuillContent(currentHTML === '<p><br></p>' ? '' : currentHTML);
          }
        });
      } else {
        console.warn("Quill library not found.");
      }
    }
    return () => {
      // Cleanup if needed, though Quill's standard cleanup is tricky
    };
  }, [isClient, user?.uid, post?.id]);

  useEffect(() => {
    const quill = quillInstanceRef.current;
    if (isClient && quill) {
      const currentEditorHTML = quill.root.innerHTML;
      if (post?.content && post.content !== currentEditorHTML) {
        quill.clipboard.dangerouslyPasteHTML(0, post.content);
        if(quillContent !== post.content) setQuillContent(post.content);
      } else if (!post?.content && (currentEditorHTML !== '<p><br></p>' && currentEditorHTML !== '')) {
        quill.setText('');
        setQuillContent('');
      }
    }
  }, [post?.content, isClient]);

  useEffect(() => {
    async function fetchAllSystemTagsData() {
      if (!isClient) return;
      try {
        const tags = await getAllTags();
        setAllSystemTags(tags.sort());
      } catch (error) {
        console.error("Error fetching all system tags:", error);
        toast({ title: "Error", description: "Could not load existing tags.", variant: "destructive" });
      }
    }
    fetchAllSystemTagsData();
  }, [isClient, toast]);

  useEffect(() => {
    if (contentHiddenInputRef.current) {
      contentHiddenInputRef.current.value = quillContent;
    }
  }, [quillContent]);


  const actionToRun = post ? updatePostAction.bind(null, post.id) : createPostAction;
  const [state, formAction] = useActionState(actionToRun, undefined);

  const clientSideFormAction = async (formData: FormData) => {
    console.log('[PostForm] clientSideFormAction started.');
    if (!user?.uid) {
        toast({ title: "Authentication Error", description: "You must be logged in to submit a post.", variant: "destructive" });
        console.error('[PostForm] User not logged in for form submission.');
        return;
    }
    formData.set('content', quillContent); // Ensure latest Quill content is set
    console.log('[PostForm] Content set on formData from Quill state.');

    let finalThumbnailUrl = thumbnailPreviewUrl || (post?.imageUrl !== undefined ? post.imageUrl : '');
    console.log('[PostForm] Initial finalThumbnailUrl:', finalThumbnailUrl);

    if (selectedThumbnailFile) {
        console.log('[PostForm] Selected thumbnail file present, starting upload:', selectedThumbnailFile.name);
        setIsUploadingThumbnail(true);
        setThumbnailUploadProgress(0);
        try {
            const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const postIdForPath = post?.id || `new_${Date.now()}`;
            const thumbnailPath = `postThumbnails/${user.uid}/${postIdForPath}/${uniqueId}-${selectedThumbnailFile.name}`;
            console.log('[PostForm] Thumbnail upload path:', thumbnailPath);
            const thumbnailImageRef = storageRef(storage, thumbnailPath);
            const uploadTask = uploadBytesResumable(thumbnailImageRef, selectedThumbnailFile);

            finalThumbnailUrl = await new Promise<string>((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log('[PostForm] Thumbnail upload progress:', progress);
                        setThumbnailUploadProgress(progress);
                    },
                    (error) => {
                        console.error("[PostForm] Firebase Storage Thumbnail Upload Error:", error.code, error.message, error);
                        reject(error); // Propagate error to catch block
                    },
                    async () => {
                        try {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            console.log('[PostForm] Thumbnail download URL obtained:', downloadURL);
                            resolve(downloadURL);
                        } catch (getUrlError: any) {
                            console.error("[PostForm] Error getting thumbnail download URL:", getUrlError.code, getUrlError.message, getUrlError);
                            reject(getUrlError);
                        }
                    }
                );
            });
            console.log('[PostForm] Thumbnail upload successful. Final URL:', finalThumbnailUrl);
            setSelectedThumbnailFile(null);
        } catch (error: any) {
            console.error("[PostForm] Failed to upload thumbnail:", error.code, error.message, error);
            toast({ title: "Thumbnail Upload Failed", description: `${error.message} (Code: ${error.code})`, variant: "destructive" });
            setIsUploadingThumbnail(false);
            setThumbnailUploadProgress(0);
            return;
        } finally {
            setIsUploadingThumbnail(false);
            setThumbnailUploadProgress(0);
        }
    } else if (thumbnailPreviewUrl === null && post?.imageUrl) {
        console.log('[PostForm] Thumbnail was removed by user (preview is null, post had imageUrl). Setting finalThumbnailUrl to empty.');
        finalThumbnailUrl = ''; // Signal removal
    }

    console.log('[PostForm] Setting uploadedThumbnailUrl on hidden input and formData:', finalThumbnailUrl);
    if (uploadedThumbnailUrlHiddenInputRef.current) {
        uploadedThumbnailUrlHiddenInputRef.current.value = finalThumbnailUrl;
    }
    formData.set('uploadedThumbnailUrl', finalThumbnailUrl);

    console.log('[PostForm] Calling server formAction.');
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
    if (!isClient || !quillInstanceRef.current) {
      toast({ title: "Editor Not Ready", variant: "default" });
      return;
    }
    let textContentForAI = quillInstanceRef.current.getText(0, 2000);
    if (titleValue) textContentForAI = titleValue + "\n\n" + textContentForAI;
    if (!textContentForAI.trim()) {
        toast({ title: "Empty Content", description: "Please write some content or a title before suggesting tags.", variant: "default" });
        return;
    }
    startAITransition(async () => {
      try {
        const tagsFromAI = await getAISuggestedTagsAction(textContentForAI);
        const newAISuggestions = tagsFromAI.filter(tag => !currentTags.includes(tag) && tag.length > 0 && tag !== 'ai-suggestion-error');
        setAISuggestedTags(newAISuggestions);
        if (newAISuggestions.length === 0 && tagsFromAI.includes('ai-suggestion-error')) {
          toast({ title: 'AI Suggestion Error', description: "Could not get suggestions from AI.", variant: 'destructive' });
        } else if (newAISuggestions.length === 0 && tagsFromAI.length > 0) {
           toast({ title: 'AI Suggestions', description: 'No new tags suggested or all suggestions already added.', variant: 'default' });
        } else if (newAISuggestions.length > 0) {
            toast({ title: 'AI Suggestions', description: 'New tags suggested below!', variant: 'default' });
        } else {
            toast({ title: 'AI Suggestions', description: 'No tags were suggested by the AI for this content.', variant: 'default' });
        }
      } catch (error) {
        toast({ title: 'AI Error', description: "An error occurred while trying to suggest tags.", variant: 'destructive' });
        setAISuggestedTags([]);
      }
    });
  };

  const addTag = (tagToAdd: string) => {
    const newTag = tagToAdd.trim().toLowerCase();
    if (newTag && !currentTags.includes(newTag)) {
      setCurrentTags(prevTags => [...prevTags, newTag]);
    }
    setTagInputValue('');
    setAISuggestedTags(prev => prev.filter(t => t !== newTag));
  };

  const removeTag = (tagToRemove: string) => {
    setCurrentTags(currentTags.filter(tag => tag !== tagToRemove));
  };

  const handleThumbnailFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
        const file = event.target.files[0];
        setSelectedThumbnailFile(file);
        setThumbnailPreviewUrl(URL.createObjectURL(file));
    } else {
        setSelectedThumbnailFile(null);
        setThumbnailPreviewUrl(post?.imageUrl || null); // Revert to original if selection cancelled
    }
  };

  const handleRemoveThumbnail = async () => {
      const currentUrlToDelete = thumbnailPreviewUrl; // Only consider current preview for deletion from storage
      console.log("[PostForm] handleRemoveThumbnail called. Current preview URL:", currentUrlToDelete);
      
      if (selectedThumbnailFile) { // If a new file was selected but not yet uploaded
        console.log("[PostForm] Clearing newly selected file, no storage deletion needed yet.");
      } else if (currentUrlToDelete && currentUrlToDelete.startsWith('https://firebasestorage.googleapis.com')) {
          // This was an existing image from storage
          try {
              const imageRef = storageRef(storage, currentUrlToDelete);
              await deleteObject(imageRef);
              console.log("[PostForm] Thumbnail deleted from storage:", currentUrlToDelete);
              toast({title: "Thumbnail Removed", description: "Previous thumbnail deleted from storage."});
          } catch (error: any) {
              if (error.code === 'storage/object-not-found') {
                  console.warn("[PostForm] Thumbnail not found in storage (object-not-found), might have been already deleted or was never uploaded under this URL:", currentUrlToDelete);
              } else {
                console.error("[PostForm] Could not delete previous thumbnail from storage:", error);
                toast({title: "Deletion Warning", description: `Could not delete previous thumbnail: ${error.message}`, variant: "destructive"});
              }
          }
      } else {
        console.log("[PostForm] No Firebase Storage thumbnail to delete (URL was local blob or already null).");
      }

      setSelectedThumbnailFile(null);
      setThumbnailPreviewUrl(null);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
      if (uploadedThumbnailUrlHiddenInputRef.current) uploadedThumbnailUrlHiddenInputRef.current.value = ''; // Signal removal for server action
      console.log("[PostForm] Thumbnail preview and file selection reset.");
  };


  if (authLoading && !post) { // Only show full page loader if it's a new post and auth is loading
    return <div className="flex justify-center items-center h-64"><Image src="https://firebasestorage.googleapis.com/v0/b/witwaves.firebasestorage.app/o/Website%20Elements%2FLoading%20-%20White%20-%20Transparent.gif?alt=media&token=a8218960-4f9c-4a45-99f8-d6f070f9e16a" alt="Loading form..." width={48} height={48} /> <p className="ml-2">Loading form...</p></div>;
  }

  if (!user && !authLoading && !post) { // If done loading and still no user for a new post
    return (
      <div className="text-center py-10">
        <p className="text-lg text-muted-foreground">Please <Link href="/login" className="text-primary hover:underline">log in</Link> to create a post.</p>
      </div>
    );
  }

  if (post && post.userId && user && post.userId !== user.uid) { // Unauthorized edit attempt
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
    <form action={clientSideFormAction} className="w-full max-w-7xl mx-auto">
      {user && (
        <input type="hidden" name="userId" value={user.uid} />
      )}
      <input type="hidden" name="content" ref={contentHiddenInputRef} value={quillContent} />
      <input type="hidden" name="tags" value={currentTags.join(',')} />
      <input type="hidden" name="uploadedThumbnailUrl" ref={uploadedThumbnailUrlHiddenInputRef} defaultValue={post?.imageUrl || ""} />


      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-grow lg:w-3/4 space-y-6">
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

          <div className="min-h-[300px] [&_.ql-editor]:min-h-[250px] [&_.ql-editor]:text-base [&_.ql-editor]:leading-relaxed [&_.ql-toolbar]:rounded-t-md [&_.ql-container]:rounded-b-md [&_.ql-toolbar]:border-input [&_.ql-container]:border-input">
            {isClient ? (
               <div ref={editorRef} />
            ) : (
              <div className="min-h-[300px] border border-input rounded-md bg-muted/50 flex items-center justify-center p-4">
                <Image src="https://firebasestorage.googleapis.com/v0/b/witwaves.firebasestorage.app/o/Website%20Elements%2FLoading%20-%20White%20-%20Transparent.gif?alt=media&token=a8218960-4f9c-4a45-99f8-d6f070f9e16a" alt="Loading editor..." width={48} height={48} />
                <p className="ml-3 text-muted-foreground">Loading editor...</p>
              </div>
            )}
          </div>
          {state?.errors?.content && <p className="text-sm text-destructive mt-1">{state.errors.content.join(', ')}</p>}
        </div>

        <div className="lg:w-1/4 space-y-6 lg:sticky lg:top-24 h-max pt-2 flex flex-col">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Post Thumbnail</label>
            {thumbnailPreviewUrl ? (
                <div className="relative group">
                    <Image
                        src={thumbnailPreviewUrl}
                        alt="Thumbnail preview"
                        width={300}
                        height={200}
                        className="w-full h-40 object-cover rounded-lg border border-border"
                        data-ai-hint="article thumbnail"
                    />
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={handleRemoveThumbnail}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                        title="Remove thumbnail"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <label
                    htmlFor="thumbnail-upload"
                    className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors bg-muted/30"
                >
                    <ImageUp className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-2 text-xs text-muted-foreground">Click to upload thumbnail</p>
                    <Input
                        id="thumbnail-upload"
                        name="thumbnailFile" // Will be handled client-side
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailFileChange}
                        className="sr-only"
                        ref={thumbnailInputRef}
                    />
                </label>
            )}
            {isUploadingThumbnail && (
                <Progress value={thumbnailUploadProgress} className="h-2 w-full mt-2" />
            )}
            {state?.errors?.uploadedThumbnailUrl && <p className="text-sm text-destructive mt-1">{state.errors.uploadedThumbnailUrl.join(', ')}</p>}
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
                      ) : (isClient && allSystemTags.length > 0 ? "No matching tags found." : "Loading tags or type to create...")}
                    </CommandEmpty>
                    {isClient && allSystemTags.length > 0 && (
                      <CommandGroup>
                        {filteredSystemTags.map((tag) => (
                          <CommandItem
                            key={tag}
                            value={tag}
                            onSelect={(currentValue) => {
                              addTag(currentValue);
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
                    )}
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
              {isAISuggesting ? <Image src="https://firebasestorage.googleapis.com/v0/b/witwaves.firebasestorage.app/o/Website%20Elements%2FLoading%20-%20White%20-%20Transparent.gif?alt=media&token=a8218960-4f9c-4a45-99f8-d6f070f9e16a" alt="Suggesting..." width={16} height={16} className="mr-1.5" /> : <Wand2 className="mr-1.5 h-3.5 w-3.5" />}
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
            <PublishButton isUpdate={!!post} isUploading={isUploadingThumbnail} />
          </div>
        </div>
      </div>
    </form>
  );
}


    