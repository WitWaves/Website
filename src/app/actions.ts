
'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getPost, generateSlug, isSlugUnique, type Post } from '@/lib/posts';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, updateDoc, serverTimestamp, deleteField, getDoc, arrayUnion, arrayRemove, increment, addDoc, collection, deleteDoc } from 'firebase/firestore'; 
import type { UserProfile, SocialLinks } from '@/lib/userProfile';
import { updateUserProfileData as updateUserProfileDataInDb } from '@/lib/userProfile';


const PostFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  content: z.string().min(10, 'Content must be at least 10 characters.'),
  tags: z.string().optional().transform(val =>
    val ? val.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0) : []
  ),
  userId: z.string().optional(), 
});

const UserProfileSchema = z.object({
  displayName: z.string().min(1, 'Display name cannot be empty.'),
  username: z.string().min(3, 'Username must be at least 3 characters.').regex(/^[a-zA-Z0-9_.]+$/, 'Username can only contain letters, numbers, underscores, and periods.').optional(),
  bio: z.string().max(600, 'Bio cannot exceed 600 characters (approx. 100 words).').optional(),
  photoURL: z.string().url('Invalid Photo URL.').optional().or(z.literal('')),
  twitter: z.string().url('Invalid Twitter URL.').optional().or(z.literal('')),
  linkedin: z.string().url('Invalid LinkedIn URL.').optional().or(z.literal('')),
  instagram: z.string().url('Invalid Instagram URL.').optional().or(z.literal('')),
  portfolio: z.string().url('Invalid Portfolio URL.').optional().or(z.literal('')),
  github: z.string().url('Invalid GitHub URL.').optional().or(z.literal('')),
});

const AddCommentSchema = z.object({
  postId: z.string().min(1, 'Post ID is required.'),
  userId: z.string().min(1, 'User ID is required.'),
  userDisplayName: z.string().min(1, 'User display name is required.'),
  userPhotoURL: z.string().url().optional().or(z.literal('')),
  commentText: z.string().min(1, 'Comment cannot be empty.').max(1000, 'Comment cannot exceed 1000 characters.'),
});


export type FormState = {
  message: string;
  errors?: {
    title?: string[];
    content?: string[];
    tags?: string[];
    userId?: string[];
    form?: string[];
    // Profile specific errors
    displayName?: string[];
    username?: string[];
    bio?: string[];
    photoURL?: string[];
    twitter?: string[];
    linkedin?: string[];
    instagram?: string[];
    portfolio?: string[];
    github?: string[];
    // Like/Save action specific
    postId?: string[];
    // Comment action specific
    commentText?: string[];
  };
  success?: boolean;
  newPostId?: string;
  updatedProfile?: Partial<UserProfile>;
  updatedLikeStatus?: { postId: string; liked: boolean; newCount: number };
  updatedSaveStatus?: { postId: string; saved: boolean };
  newCommentId?: string;
} | undefined;


export async function createPostAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = PostFormSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    tags: formData.get('tags'),
    userId: formData.get('userId'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation Error: Failed to create post.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { title, content, tags, userId } = validatedFields.data;

  if (!userId) {
    return {
        message: 'Error: User not authenticated. Cannot create post.',
        errors: { userId: ['User authentication is required.'] }
    };
  }
  console.log('[createPostAction] User ID:', userId);

  let slug = generateSlug(title);
  let counter = 1;
  while (!(await isSlugUnique(slug))) {
    slug = `${generateSlug(title)}-${counter}`;
    counter++;
    if (counter > 10) { 
        return { message: 'Error: Could not generate a unique slug for the post.', errors: {} };
    }
  }
  console.log('[createPostAction] Generated slug:', slug);

  const newPostRef = doc(db, 'posts', slug);
  
  const newPostData: Omit<Post, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = { 
    title,
    content,
    tags: tags || [],
    userId, 
    likedBy: [],
    likeCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp(), 
    updatedAt: serverTimestamp(), 
  };

  try {
    console.log('[createPostAction] Attempting to save post to Firestore with data:', newPostData);
    await setDoc(newPostRef, newPostData);
    console.log('[createPostAction] Post saved successfully to Firestore. Slug:', slug);
  } catch (error) {
    console.error("[createPostAction] Error creating post in Firestore:", error);
    return { message: `Error: Failed to save post. ${error instanceof Error ? error.message : ''}`, errors: {} };
  }

  revalidatePath('/blog');
  revalidatePath(`/posts/${slug}`);
  (tags || []).forEach(tag => revalidatePath(`/tags/${encodeURIComponent(tag)}`));
  revalidatePath('/archive/[year]/[month]', 'page');
  revalidatePath('/blog/profile');

  return { message: `Post "${title}" created successfully!`, success: true, errors: {}, newPostId: slug };
}

export async function updatePostAction(id: string, prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = PostFormSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    tags: formData.get('tags'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation Error: Failed to update post.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { title, content, tags } = validatedFields.data;
  const postDocRef = doc(db, 'posts', id);
  console.log('[updatePostAction] Attempting to update post. ID:', id);

  const updatedPostData: Partial<Omit<Post, 'id'| 'createdAt'>> & {updatedAt: any} = {
    title,
    content,
    tags: tags || [],
    updatedAt: serverTimestamp(), 
  };

  try {
    await updateDoc(postDocRef, updatedPostData);
    console.log('[updatePostAction] Post updated successfully in Firestore. ID:', id);
  } catch (error) {
    console.error("[updatePostAction] Error updating post in Firestore:", error);
    return { message: `Error: Failed to update post. ${error instanceof Error ? error.message : ''}`, errors: {} };
  }

  revalidatePath('/blog');
  revalidatePath(`/posts/${id}`);
  revalidatePath('/tags', 'layout');
  revalidatePath('/archive/[year]/[month]', 'page');
  revalidatePath('/blog/profile');

  return { message: `Post "${title}" updated successfully!`, success: true, errors: {} };
}


export async function getAISuggestedTagsAction(postContent: string): Promise<string[]> {
  if (!postContent || postContent.trim().length < 20) {
    return [];
  }
  try {
    const { suggestTags: suggestTagsFlow } = await import('@/ai/flows/suggest-tags');
    const result = await suggestTagsFlow({ postContent });
    return result.tags.map(tag => tag.toLowerCase());
  } catch (error) {
    console.error('Error suggesting tags with AI:', error);
    return ['ai-suggestion-error'];
  }
}


export async function updateUserProfileAction(userId: string, prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = UserProfileSchema.safeParse({
    displayName: formData.get('displayName'),
    username: formData.get('username') || undefined, 
    bio: formData.get('bio') || undefined,
    photoURL: formData.get('photoURL') || undefined, 
    twitter: formData.get('twitter') || undefined,
    linkedin: formData.get('linkedin') || undefined,
    instagram: formData.get('instagram') || undefined,
    portfolio: formData.get('portfolio') || undefined,
    github: formData.get('github') || undefined,
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation Error: Failed to update profile.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }
  
  const { displayName, username, bio, photoURL, ...socialLinksInput } = validatedFields.data;
  
  const profileUpdateData: Partial<UserProfile> = {
    username: username,
    displayName: displayName, 
    bio: bio,
    photoURL: photoURL,
    socialLinks: socialLinksInput as SocialLinks,
  };

  try {
    await updateUserProfileDataInDb(userId, profileUpdateData);
    console.log('[updateUserProfileAction] User profile updated successfully in Firestore for userId:', userId);
  } catch (error) {
    console.error("[updateUserProfileAction] Error updating user profile in DB:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    if (errorMessage.includes("invalid data") || errorMessage.includes("undefined")) {
        return { message: `Error: Failed to update profile due to invalid data format. ${errorMessage}`, success: false };
    }
    return { message: `Error: Failed to update profile in database. ${errorMessage}`, success: false };
  }
 
  const updatedProfileForState: Partial<UserProfile> = {
      uid: userId,
      ...profileUpdateData 
  };
  if (profileUpdateData.photoURL === '') {
    updatedProfileForState.photoURL = undefined; 
  }


  revalidatePath('/blog/profile'); 
  revalidatePath(`/blog/profile/${userId}`); 
  revalidatePath('/blog'); 

  return { message: 'Profile updated successfully!', success: true, updatedProfile: updatedProfileForState };
}

export async function toggleLikePostAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const postId = formData.get('postId') as string;
  const userId = formData.get('userId') as string;
  console.log('[toggleLikePostAction] Initiated. PostID:', postId, 'UserID:', userId);

  if (!postId || !userId) {
    console.warn('[toggleLikePostAction] Failed: Missing postId or userId.');
    return {
      message: 'Error: Post ID and User ID are required to like a post.',
      errors: { form: ['Post ID and User ID are required.'] },
      success: false,
    };
  }

  const postDocRef = doc(db, 'posts', postId);

  try {
    console.log(`[toggleLikePostAction] Fetching post document: posts/${postId}`);
    const postSnap = await getDoc(postDocRef);
    if (!postSnap.exists()) {
      console.warn('[toggleLikePostAction] Failed: Post not found in Firestore. PostID:', postId);
      return { message: 'Error: Post not found.', success: false };
    }
    console.log('[toggleLikePostAction] Post document fetched successfully.');

    const postData = postSnap.data() as Post;
    const likedBy = postData.likedBy || [];
    let newLikeCount = postData.likeCount || 0;
    let liked = false;

    if (likedBy.includes(userId)) {
      console.log('[toggleLikePostAction] User already liked the post. Unliking...');
      await updateDoc(postDocRef, {
        likedBy: arrayRemove(userId),
        likeCount: increment(-1),
      });
      newLikeCount = Math.max(0, newLikeCount - 1); 
      liked = false;
      console.log('[toggleLikePostAction] Post unliked successfully.');
    } else {
      console.log('[toggleLikePostAction] User has not liked the post. Liking...');
      await updateDoc(postDocRef, {
        likedBy: arrayUnion(userId),
        likeCount: increment(1),
      });
      newLikeCount += 1;
      liked = true;
      console.log('[toggleLikePostAction] Post liked successfully.');
    }

    console.log('[toggleLikePostAction] Revalidating paths...');
    revalidatePath('/blog');
    revalidatePath(`/posts/${postId}`);
    revalidatePath('/blog/profile'); 
    console.log('[toggleLikePostAction] Paths revalidated.');

    return {
      message: liked ? 'Post liked!' : 'Post unliked!',
      success: true,
      updatedLikeStatus: { postId, liked, newCount: newLikeCount },
    };
  } catch (error) {
    console.error('[toggleLikePostAction] CRITICAL ERROR during Firestore operation or revalidation:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { message: `Error: Failed to update like status. ${errorMessage}`, success: false };
  }
}

export async function addCommentAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = AddCommentSchema.safeParse({
    postId: formData.get('postId'),
    userId: formData.get('userId'),
    userDisplayName: formData.get('userDisplayName'),
    userPhotoURL: formData.get('userPhotoURL') || undefined,
    commentText: formData.get('commentText'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation Error: Failed to add comment.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { postId, userId, userDisplayName, userPhotoURL, commentText } = validatedFields.data;
  console.log('[addCommentAction] Attempting to add comment to postId:', postId, 'by userId:', userId);

  try {
    const postDocRef = doc(db, 'posts', postId);
    const commentsColRef = collection(db, 'posts', postId, 'comments');

    const newCommentRef = await addDoc(commentsColRef, {
      userId,
      userDisplayName,
      userPhotoURL: userPhotoURL || null, 
      text: commentText,
      createdAt: serverTimestamp(),
      postId: postId, 
    });
    console.log('[addCommentAction] Comment added with ID:', newCommentRef.id);

    await updateDoc(postDocRef, {
      commentCount: increment(1),
    });
    console.log('[addCommentAction] Post commentCount incremented for postId:', postId);

    revalidatePath(`/posts/${postId}`);

    return {
      message: 'Comment added successfully!',
      success: true,
      newCommentId: newCommentRef.id,
    };
  } catch (error) {
    console.error('[addCommentAction] Error adding comment:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { message: `Error: Failed to add comment. ${errorMessage}`, success: false };
  }
}

export async function toggleSavePostAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const postId = formData.get('postId') as string;
  const userId = formData.get('userId') as string;
  console.log('[toggleSavePostAction] Initiated. PostID:', postId, 'UserID:', userId);


  if (!postId || !userId) {
     console.warn('[toggleSavePostAction] Failed: Missing postId or userId.');
    return {
      message: 'Error: Post ID and User ID are required to save a post.',
      errors: { form: ['Post ID and User ID are required.'] },
      success: false,
    };
  }

  const userProfileDocRef = doc(db, 'userProfiles', userId);
  if (!userProfileDocRef) { 
    console.error('[toggleSavePostAction] Failed: Could not create userProfileDocRef for UserID:', userId);
    return { message: 'Error: User profile context not found.', success: false };
  }
  const savedPostDocRef = doc(userProfileDocRef, 'savedPosts', postId);
  console.log(`[toggleSavePostAction] Accessing saved post document: userProfiles/${userId}/savedPosts/${postId}`);

  try {
    const savedPostSnap = await getDoc(savedPostDocRef);
    let saved = false;

    if (savedPostSnap.exists()) {
      console.log('[toggleSavePostAction] Post is currently saved. Unsaving...');
      await deleteDoc(savedPostDocRef);
      saved = false;
      console.log('[toggleSavePostAction] Post unsaved successfully.');
    } else {
      console.log('[toggleSavePostAction] Post is not saved. Saving...');
      await setDoc(savedPostDocRef, {
        savedAt: serverTimestamp(),
        postId: postId 
      });
      saved = true;
      console.log('[toggleSavePostAction] Post saved successfully.');
    }

    console.log('[toggleSavePostAction] Revalidating paths...');
    revalidatePath(`/posts/${postId}`); 
    revalidatePath('/blog/profile'); 
    console.log('[toggleSavePostAction] Paths revalidated.');
    
    return {
      message: saved ? 'Post saved!' : 'Post unsaved!',
      success: true,
      updatedSaveStatus: { postId, saved },
    };
  } catch (error) {
    console.error('[toggleSavePostAction] CRITICAL ERROR during Firestore operation or revalidation:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { message: `Error: Failed to update save status. ${errorMessage}`, success: false };
  }
}

    