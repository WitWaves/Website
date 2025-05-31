
'use client';

import Image from 'next/image';
import { useEffect, useState, useTransition, useRef, useCallback } from 'react';
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
import { AlertCircle, Loader2, Wand2, ImageUp, XIcon, ChevronsUpDown, Check, Trash2, Film } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { storage } from '@/lib/firebase/config';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { recordUserImageUpload, getRecentUserImages, type UserUploadedImage } from '@/lib/imageUploads';


declare global {
  interface Window {
    Quill: any;
  }
}

interface PostFormProps {
  post?: Post;
}

async function optimizeImageFile(file: File, options: imageCompression.Options): Promise<File> {
  try {
    console.log(`Optimizing image: ${file.name}, original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    const compressedFile = await imageCompression(file, options);
    console.log(`Compressed image: ${compressedFile.name}, new size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
}


function PublishButton({isUpdate, isUploadingOrProcessing}: {isUpdate: boolean, isUploadingOrProcessing: boolean}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || isUploadingOrProcessing} className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 py-3 text-base mt-auto">
      {(pending || isUploadingOrProcessing) ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {isUploadingOrProcessing ? 'Processing...' : (isUpdate ? 'Updating...' : 'Publishing...')}
        </>
      ) : (
        isUpdate ? 'Update Post' : 'Publish'
      )}
    </Button>
  );
}

export default function PostForm({ post }: PostFormProps) {
  const router = useRouter();
  const { toast: createToast, dismiss } = useToast();
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

  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(post?.imageUrl || null);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<number>(0);
  
  const [imageDialogState, setImageDialogState] = useState<{
    isOpen: boolean;
    target: 'thumbnail' | 'quill' | null;
    quillRange: any | null;
  }>({ isOpen: false, target: null, quillRange: null });
  
  const genericFileInputRef = useRef<HTMLInputElement>(null);
  const [previousUploads, setPreviousUploads] = useState<UserUploadedImage[]>([]);
  const [isLoadingPreviousUploads, setIsLoadingPreviousUploads] = useState(false);


  const processAndUploadFile = useCallback(async (file: File, target: 'thumbnail' | 'quill', quillRangeToInsert?: any) => {
    if (!user?.uid) {
      createToast({ title: "Error", description: "User not logged in or editor not ready.", variant: "destructive" });
      return;
    }
    
    setIsProcessingImage(true);
    setImageUploadProgress(0);
    const toastId = `image-process-${Date.now()}`;

    try {
      createToast({
        id: toastId,
        title: "Processing Image...",
        description: `Optimizing ${file.name}. Please wait.`,
        duration: Infinity,
      });

      const optimizationOptions: imageCompression.Options = target === 'thumbnail'
        ? { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true, initialQuality: 0.7 }
        : { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true, initialQuality: 0.75 };
      
      const optimizedFile = await optimizeImageFile(file, optimizationOptions);
      console.log(`[PostForm ProcessAndUpload] Image optimized for ${target}:`, optimizedFile.name);

      createToast({
        id: toastId,
        title: "Uploading Image...",
        description: `Starting upload for ${optimizedFile.name}`,
        duration: Infinity,
      });

      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const postIdForPath = post?.id || `new_${Date.now()}`;
      const basePath = target === 'thumbnail' ? 'postThumbnails' : 'postContentImages';
      const imageFilePath = `${basePath}/${user.uid}/${postIdForPath}/${uniqueId}-${optimizedFile.name}`;
      
      console.log(`[PostForm ProcessAndUpload] Upload path: ${imageFilePath}`);
      const imageFileRef = storageRef(storage, imageFilePath);
      const uploadTask = uploadBytesResumable(imageFileRef, optimizedFile);

      const downloadURL = await new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setImageUploadProgress(progress);
            if (uploadTask.snapshot.state === 'running') {
              createToast({
                id: toastId,
                title: "Uploading Image...",
                description: `${optimizedFile.name} - ${Math.round(progress)}% done.`,
                duration: Infinity,
              });
            }
          },
          (error) => {
            console.error(`[PostForm ProcessAndUpload] Firebase Storage Upload Error for ${target}:`, error);
            dismiss(toastId);
            reject(error);
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              console.log(`[PostForm ProcessAndUpload] Download URL for ${target} obtained:`, url);
              
              // Record image metadata to Firestore
              await recordUserImageUpload({
                userId: user.uid,
                storagePath: imageFilePath,
                downloadURL: url,
                fileName: optimizedFile.name,
                mimeType: optimizedFile.type,
              });
              // Refresh previous uploads if dialog is still open conceptually
              if (imageDialogState.isOpen) {
                  fetchUserImages();
              }

              dismiss(toastId);
              resolve(url);
            } catch (recordError: any) {
              console.error(`[PostForm ProcessAndUpload] Error recording image metadata for ${target}:`, recordError);
              dismiss(toastId); // Dismiss processing toast
              // Don't reject the promise here, as upload itself was successful. Log error & maybe show separate toast.
              createToast({ title: "Metadata Error", description: `Image uploaded, but failed to record metadata: ${recordError.message}`, variant: "destructive" });
              resolve(await getDownloadURL(uploadTask.snapshot.ref)); // Still resolve with URL
            }
          }
        );
      });

      if (target === 'thumbnail') {
        setThumbnailPreviewUrl(downloadURL);
        if (uploadedThumbnailUrlHiddenInputRef.current) {
             uploadedThumbnailUrlHiddenInputRef.current.value = downloadURL;
        }
        createToast({ title: "Thumbnail Set", description: "Thumbnail image uploaded and preview updated.", variant: "default" });
      } else if (target === 'quill' && quillRangeToInsert && quillInstanceRef.current) {
        quillInstanceRef.current.insertEmbed(quillRangeToInsert.index, 'image', downloadURL);
        quillInstanceRef.current.setSelection(quillRangeToInsert.index + 1);
        createToast({ title: "Image Inserted", description: `${optimizedFile.name} inserted into post.`, variant: "default" });
      }
      setImageDialogState({ isOpen: false, target: null, quillRange: null }); // Close dialog on success

    } catch (error: any) {
      console.error(`[PostForm ProcessAndUpload] Error during image processing/upload for ${target}:`, error);
      dismiss(toastId);
      createToast({ title: "Image Operation Failed", description: `Could not process or upload image: ${error.message}`, variant: "destructive" });
      // Don't close dialog on error, let user retry or cancel
    } finally {
      setIsProcessingImage(false);
      setImageUploadProgress(0);
      // setImageDialogState({ isOpen: false, target: null, quillRange: null }); // Moved to success/failure specific handling
      if (genericFileInputRef.current) genericFileInputRef.current.value = '';
    }
  }, [user, post?.id, createToast, dismiss, imageDialogState.isOpen]);


  const handleFileSelectedViaDialog = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && imageDialogState.target) {
      await processAndUploadFile(file, imageDialogState.target, imageDialogState.quillRange);
    } else {
      setImageDialogState({ isOpen: false, target: null, quillRange: null });
      if (genericFileInputRef.current) genericFileInputRef.current.value = '';
    }
  };
  
  const fetchUserImages = useCallback(async () => {
    if (user?.uid) {
        setIsLoadingPreviousUploads(true);
        try {
            const images = await getRecentUserImages(user.uid, 12); // Fetch e.g., 12 recent images
            setPreviousUploads(images);
        } catch (error) {
            console.error("Error fetching user's previous uploads:", error);
            createToast({title: "Error", description: "Could not load your previous images.", variant: "destructive"});
            setPreviousUploads([]);
        } finally {
            setIsLoadingPreviousUploads(false);
        }
    }
  }, [user?.uid, createToast]);

  const openImageUploadDialog = (target: 'thumbnail' | 'quill') => {
    if (!user?.uid) {
      createToast({ title: "Authentication Required", description: "Please log in to add images.", variant: "destructive" });
      return;
    }
    let quillRange = null;
    if (target === 'quill' && quillInstanceRef.current) {
      quillRange = quillInstanceRef.current.getSelection(true) || { index: quillInstanceRef.current.getLength(), length: 0 };
    }
    setImageDialogState({ isOpen: true, target, quillRange });
    fetchUserImages(); // Fetch images when dialog opens
  };

  const handlePreviousImageSelect = (image: UserUploadedImage) => {
    if (!imageDialogState.target) return;

    if (imageDialogState.target === 'thumbnail') {
        setThumbnailPreviewUrl(image.downloadURL);
        if (uploadedThumbnailUrlHiddenInputRef.current) {
            uploadedThumbnailUrlHiddenInputRef.current.value = image.downloadURL;
        }
        createToast({ title: "Thumbnail Set", description: "Selected image set as thumbnail.", variant: "default" });
    } else if (imageDialogState.target === 'quill' && imageDialogState.quillRange && quillInstanceRef.current) {
        quillInstanceRef.current.insertEmbed(imageDialogState.quillRange.index, 'image', image.downloadURL);
        quillInstanceRef.current.setSelection(imageDialogState.quillRange.index + 1);
        createToast({ title: "Image Inserted", description: "Selected image inserted into post.", variant: "default" });
    }
    setImageDialogState({ isOpen: false, target: null, quillRange: null }); // Close dialog
  };


  const localImageHandler = useCallback(() => { // Quill image handler
    if (!user?.uid) {
      createToast({ title: "Authentication Required", description: "Please log in to add images.", variant: "destructive" });
      return;
    }
    openImageUploadDialog('quill');
  }, [user?.uid, createToast]);


  useEffect(() => {
    setIsClient(true);
  }, []);


  useEffect(() => {
    if (isClient && editorRef.current && !quillInstanceRef.current && typeof window.Quill !== 'undefined') {
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
                ['link', 'image', 'video'], // Standard image button will trigger our handler
                ['clean']
              ],
              handlers: {
                'image': localImageHandler // Use the memoized handler
              }
            },
          },
          placeholder: "Start writing your stunning piece here...",
        });
        quillInstanceRef.current = quill;

        const initialContent = post?.content || quillContent || '';
        if (quill.root.innerHTML !== initialContent && initialContent !== '<p><br></p>') {
            if (initialContent || (initialContent === '' && quill.root.innerHTML !== '<p><br></p>')) {
                quill.clipboard.dangerouslyPasteHTML(0, initialContent);
            }
        }
        const editorHTML = quill.root.innerHTML;
        const stateContentToSet = editorHTML === '<p><br></p>' ? '' : editorHTML;
        if (quillContent !== stateContentToSet) {
            setQuillContent(stateContentToSet);
        }

        quill.on('text-change', (_delta: any, _oldDelta: any, source: string) => {
          if (source === 'user') {
            const currentHTML = quill.root.innerHTML;
            const newContent = currentHTML === '<p><br></p>' ? '' : currentHTML;
            setQuillContent(newContent);
          }
        });
    } else if (isClient && !window.Quill) {
        console.warn("Quill library not found on window object.");
    }
  }, [isClient, post?.content, localImageHandler, quillContent]);


  useEffect(() => {
    async function fetchAllSystemTagsData() {
      if (!isClient) return;
      try {
        const tags = await getAllTags();
        setAllSystemTags(tags.sort());
      } catch (error) {
        console.error("Error fetching all system tags:", error);
        createToast({ title: "Error", description: "Could not load existing tags.", variant: "destructive" });
      }
    }
    fetchAllSystemTagsData();
  }, [isClient, createToast]);

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
        createToast({ title: "Authentication Error", description: "You must be logged in to submit a post.", variant: "destructive" });
        console.error('[PostForm] User not logged in for form submission.');
        return;
    }
    formData.set('content', quillContent);
    console.log('[PostForm] Content set on formData from Quill state.');
    
    let finalThumbnailUrlForForm = uploadedThumbnailUrlHiddenInputRef.current?.value || '';

    if (thumbnailPreviewUrl === null && post?.imageUrl) {
        finalThumbnailUrlForForm = '';
    } else if (thumbnailPreviewUrl && thumbnailPreviewUrl !== (post?.imageUrl || '')) {
        finalThumbnailUrlForForm = thumbnailPreviewUrl;
    } else if (!thumbnailPreviewUrl && !post?.imageUrl) {
        finalThumbnailUrlForForm = '';
    } else if (thumbnailPreviewUrl && thumbnailPreviewUrl === post?.imageUrl) {
        finalThumbnailUrlForForm = post.imageUrl;
    }

    console.log('[PostForm] Setting uploadedThumbnailUrl on formData:', finalThumbnailUrlForForm);
    formData.set('uploadedThumbnailUrl', finalThumbnailUrlForForm);
    if(uploadedThumbnailUrlHiddenInputRef.current) {
        uploadedThumbnailUrlHiddenInputRef.current.value = finalThumbnailUrlForForm;
    }

    console.log('[PostForm] Calling server formAction.');
    formAction(formData);
  };

  useEffect(() => {
    if (state?.success) {
      createToast({
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
      createToast({
        title: 'Error',
        description: state.errors ? JSON.stringify(state.errors) : state.message,
        variant: 'destructive',
      });
    }
  }, [state, router, createToast, post, titleValue]);

  const handleSuggestTags = () => {
    if (!isClient || !quillInstanceRef.current) {
      createToast({ title: "Editor Not Ready", variant: "default" });
      return;
    }
    let textContentForAI = quillInstanceRef.current.getText(0, 2000);
    if (titleValue) textContentForAI = titleValue + "\n\n" + textContentForAI;
    if (!textContentForAI.trim()) {
        createToast({ title: "Empty Content", description: "Please write some content or a title before suggesting tags.", variant: "default" });
        return;
    }
    startAITransition(async () => {
      try {
        const tagsFromAI = await getAISuggestedTagsAction(textContentForAI);
        const newAISuggestions = tagsFromAI.filter(tag => !currentTags.includes(tag) && tag.length > 0 && tag !== 'ai-suggestion-error');
        setAISuggestedTags(newAISuggestions);
        if (newAISuggestions.length === 0 && tagsFromAI.includes('ai-suggestion-error')) {
          createToast({ title: 'AI Suggestion Error', description: "Could not get suggestions from AI.", variant: 'destructive' });
        } else if (newAISuggestions.length === 0 && tagsFromAI.length > 0) {
           createToast({ title: 'AI Suggestions', description: 'No new tags suggested or all suggestions already added.', variant: 'default' });
        } else if (newAISuggestions.length > 0) {
            createToast({ title: 'AI Suggestions', description: 'New tags suggested below!', variant: 'default' });
        } else {
            createToast({ title: 'AI Suggestions', description: 'No tags were suggested by the AI for this content.', variant: 'default' });
        }
      } catch (error) {
        createToast({ title: 'AI Error', description: "An error occurred while trying to suggest tags.", variant: 'destructive' });
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

  const handleRemoveThumbnail = async () => {
      console.log("[PostForm] handleRemoveThumbnail called. Current preview URL:", thumbnailPreviewUrl);
      setThumbnailPreviewUrl(null);
      if (uploadedThumbnailUrlHiddenInputRef.current) {
          uploadedThumbnailUrlHiddenInputRef.current.value = '';
      }
      createToast({title: "Thumbnail Marked for Removal", description: "Thumbnail will be removed when you save the post."});
  };


  if (authLoading && !post) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-10 w-10 animate-spin text-primary" /> <p className="ml-2">Loading form...</p></div>;
  }

  if (!user && !authLoading && !post) {
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
    <>
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
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
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
                          disabled={isProcessingImage}
                      >
                          <Trash2 className="h-4 w-4" />
                      </Button>
                       <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openImageUploadDialog('thumbnail')}
                          className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          disabled={isProcessingImage}
                      >
                          <ImageUp className="mr-1.5 h-3.5 w-3.5" /> Change
                      </Button>
                  </div>
              ) : (
                  <button
                      type="button"
                      onClick={() => openImageUploadDialog('thumbnail')}
                      className={cn(
                          "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors bg-muted/30",
                          isProcessingImage && "cursor-not-allowed opacity-70"
                      )}
                      disabled={isProcessingImage}
                      aria-label="Upload post thumbnail"
                  >
                      <ImageUp className="mx-auto h-10 w-10 text-muted-foreground" />
                      <p className="mt-2 text-xs text-muted-foreground">Click to upload thumbnail</p>
                  </button>
              )}
              {isProcessingImage && imageDialogState.target === 'thumbnail' && imageUploadProgress > 0 && (
                  <Progress value={imageUploadProgress} className="h-1.5 w-full mt-1" />
              )}
              {isProcessingImage && imageDialogState.target === 'thumbnail' && imageUploadProgress === 0 && !imageDialogState.isOpen && (
                  <p className="text-xs text-muted-foreground text-center mt-1">Processing thumbnail...</p>
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
                {isAISuggesting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1.5 h-3.5 w-3.5" />}
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
              <PublishButton isUpdate={!!post} isUploadingOrProcessing={isProcessingImage} />
            </div>
          </div>
        </div>
      </form>

      <Dialog open={imageDialogState.isOpen} onOpenChange={(open) => {
          if (!open) {
            setImageDialogState({ isOpen: false, target: null, quillRange: null });
            if (genericFileInputRef.current) genericFileInputRef.current.value = '';
          } else {
             setImageDialogState(prev => ({ ...prev, isOpen: true }));
          }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Image {imageDialogState.target === 'thumbnail' ? 'as Thumbnail' : 'to Content'}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 flex-grow min-h-0">
            <h3 className="text-md font-medium text-muted-foreground">Your recent uploads</h3>
            {isLoadingPreviousUploads ? (
                <div className="flex justify-center items-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : previousUploads.length > 0 ? (
                <ScrollArea className="h-64 border rounded-md p-2">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {previousUploads.map(img => (
                            <button
                                key={img.id}
                                onClick={() => handlePreviousImageSelect(img)}
                                className="relative aspect-square group focus:outline-none focus:ring-2 focus:ring-primary rounded overflow-hidden"
                                title={`Use ${img.fileName}`}
                                disabled={isProcessingImage}
                            >
                                <Image src={img.downloadURL} alt={img.fileName} layout="fill" objectFit="cover" className="transition-transform group-hover:scale-105" data-ai-hint="uploaded image"/>
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Check className="h-6 w-6 text-white" />
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No recent images found. Upload one below.</p>
            )}
            
            <div className="flex items-center space-x-2 pt-4 border-t">
                <span className="flex-grow border-b"></span>
                <span className="text-xs text-muted-foreground">OR</span>
                <span className="flex-grow border-b"></span>
            </div>

            <Button type="button" onClick={() => genericFileInputRef.current?.click()} className="w-full" disabled={isProcessingImage}>
              {isProcessingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :  <ImageUp className="mr-2 h-4 w-4" />}
              Upload New Image
            </Button>
            <Input
              type="file"
              accept="image/*"
              ref={genericFileInputRef}
              className="sr-only"
              onChange={handleFileSelectedViaDialog}
              disabled={isProcessingImage}
            />
            {isProcessingImage && imageUploadProgress > 0 && (
                <Progress value={imageUploadProgress} className="h-1.5 w-full mt-1" />
            )}
             {isProcessingImage && imageUploadProgress === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-1">Preparing to upload...</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isProcessingImage}>
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
