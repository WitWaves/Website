'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getPost, generateSlug, isSlugUnique, type Post } from '@/lib/posts';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, updateDoc, serverTimestamp, deleteField, getDoc, arrayUnion, arrayRemove, increment, addDoc, collection, deleteDoc, getDocs } from 'firebase/firestore';
import type { UserProfile, SocialLinks } from '@/lib/userProfile';
import { updateUserProfileData as updateUserProfileDataInDb } from '@/lib/userProfile';
import { storage } from '@/lib/firebase/config'; // Added storage import
import { ref as storageRef, deleteObject } from 'firebase/storage'; // Added deleteObject


const PostFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  content: z.string().min(10, 'Content must be at least 10 characters.'),
  tags: z.string().optional().transform(val =>
    val ? val.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0) : []
  ),
  userId: z.string().optional(),
  uploadedThumbnailUrl: z.string().url('Invalid thumbnail URL.').optional().or(z.literal('')),
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
  interests: z.string().optional().transform(val =>
    val ? val.split(',').map(interest => interest.trim().toLowerCase()).filter(interest => interest.length > 0) : []
  ),
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
    uploadedThumbnailUrl?: string[];
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
    interests?: string[];
    // Like/Save action specific
    postId?: string[];
    // Comment action specific
    commentText?: string[];
  };
  success?: boolean;
  newPostId?: string;
  deletedPostId?: string; // For delete action
  updatedProfile?: Partial<UserProfile>;
  updatedLikeStatus?: { postId: string; liked: boolean; newCount: number };
  newCommentId?: string;
} | undefined;


export async function createPostAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = PostFormSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    tags: formData.get('tags'),
    userId: formData.get('userId'),
    uploadedThumbnailUrl: formData.get('uploadedThumbnailUrl'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation Error: Failed to create post.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { title, content, tags, userId, uploadedThumbnailUrl } = validatedFields.data;

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

  const newPostData: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'imageUrl'> & { createdAt: any; updatedAt: any; imageUrl?: string } = {
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

  if (uploadedThumbnailUrl && uploadedThumbnailUrl.trim() !== '') {
    newPostData.imageUrl = uploadedThumbnailUrl;
  }


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
  revalidatePath('/blog/profile'); // For user's own profile
  if (userId) revalidatePath(`/blog/profile/${userId}`); // For public profile if different

  return { message: `Post "${title}" created successfully!`, success: true, errors: {}, newPostId: slug };
}

export async function updatePostAction(id: string, prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = PostFormSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    tags: formData.get('tags'),
    uploadedThumbnailUrl: formData.get('uploadedThumbnailUrl'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation Error: Failed to update post.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { title, content, tags, uploadedThumbnailUrl } = validatedFields.data;
  const postDocRef = doc(db, 'posts', id);
  console.log('[updatePostAction] Attempting to update post. ID:', id);

  // Fetch existing post to get userId for revalidation
  const existingPost = await getPost(id);
  const userId = existingPost?.userId;


  const updatedPostData: Partial<Omit<Post, 'id'| 'createdAt'>> & {updatedAt: any, imageUrl?: string | any } = {
    title,
    content,
    tags: tags || [], // This is the parsed array
    updatedAt: serverTimestamp(),
  };

  if (uploadedThumbnailUrl === '') {
    updatedPostData.imageUrl = deleteField();
  } else if (uploadedThumbnailUrl) { 
    updatedPostData.imageUrl = uploadedThumbnailUrl;
  }

  // --- ADDED LOG FOR DEBUGGING TAGS IN UPDATE ---
  console.log('[updatePostAction] Data prepared for Firestore update (including tags):', updatedPostData.tags);
  // --- END ADDED LOG ---


  try {
    await updateDoc(postDocRef, updatedPostData);
    console.log('[updatePostAction] Post updated successfully in Firestore. ID:', id);
  } catch (error) {
    console.error("[updatePostAction] Error updating post in Firestore:", error);
    return { message: `Error: Failed to update post. ${error instanceof Error ? error.message : ''}`, errors: {} };
  }

  revalidatePath('/blog');
  revalidatePath(`/posts/${id}`);
  (tags || []).forEach(tag => revalidatePath(`/tags/${encodeURIComponent(tag)}`));
  revalidatePath('/archive/[year]/[month]', 'page');
  revalidatePath('/blog/profile'); // For user's own profile
  if (userId) revalidatePath(`/blog/profile/${userId}`); // For public profile


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
    interests: formData.get('interests') || undefined,
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation Error: Failed to update profile.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { displayName, username, bio, photoURL, interests, ...socialLinksInput } = validatedFields.data;

  const profileUpdateData: Partial<UserProfile> = {
    username: username,
    displayName: displayName,
    bio: bio,
    photoURL: photoURL,
    socialLinks: socialLinksInput as SocialLinks,
    interests: interests,
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
  if (profileUpdateData.interests === undefined) {
    updatedProfileForState.interests = [];
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

export async function deletePostAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const postId = formData.get('postId') as string;
  const postAuthorId = formData.get('postAuthorId') as string; // The actual author of the post
  const currentUserId = formData.get('currentUserId') as string; // The user attempting the deletion

  console.log(`[deletePostAction] Initiated. PostID: ${postId}, AuthorID: ${postAuthorId}, CurrentUserID: ${currentUserId}`);

  if (!postId || !postAuthorId || !currentUserId) {
    return { message: 'Error: Missing required IDs for deletion.', success: false };
  }

  if (postAuthorId !== currentUserId) {
    console.warn(`[deletePostAction] Unauthorized attempt by ${currentUserId} to delete post ${postId} owned by ${postAuthorId}.`);
    return { message: 'Error: You are not authorized to delete this post.', success: false };
  }

  const postDocRef = doc(db, 'posts', postId);

  try {
    const postToDelete = await getPost(postId); 

    if (!postToDelete) {
      return { message: 'Error: Post not found.', success: false };
    }

    // 1. Delete Thumbnail from Firebase Storage (if it exists)
    if (postToDelete.imageUrl && postToDelete.imageUrl.startsWith('https://firebasestorage.googleapis.com')) {
      console.log(`[deletePostAction] Attempting to delete thumbnail: ${postToDelete.imageUrl}`);
      const imageStorageRef = storageRef(storage, postToDelete.imageUrl);
      try {
        await deleteObject(imageStorageRef);
        console.log(`[deletePostAction] Thumbnail ${postToDelete.imageUrl} deleted successfully.`);
      } catch (storageError: any) {
        console.warn(`[deletePostAction] Could not delete thumbnail ${postToDelete.imageUrl} from Storage:`, storageError.code, storageError.message);
      }
    }
    console.log("[deletePostAction] Note: Deletion of images embedded in post content (Quill) is not automatically handled by this action.");

    // 2. Delete Comments from the subcollection
    const commentsColRef = collection(db, 'posts', postId, 'comments');
    try {
      const commentsSnapshot = await getDocs(commentsColRef);
      if (!commentsSnapshot.empty) {
        console.log(`[deletePostAction] Found ${commentsSnapshot.size} comments for post ${postId}. Deleting...`);
        const deletePromises = commentsSnapshot.docs.map(commentDoc => deleteDoc(commentDoc.ref));
        await Promise.all(deletePromises);
        console.log(`[deletePostAction] Successfully deleted ${commentsSnapshot.size} comments for post ${postId}.`);
      } else {
        console.log(`[deletePostAction] No comments found for post ${postId}. Skipping comment deletion.`);
      }
    } catch (commentsError: any) {
      console.warn(`[deletePostAction] Could not delete comments for post ${postId}:`, commentsError.message);
      // Decide if this should be a critical error that stops post deletion.
      // For now, log and proceed. If strict transactional deletion is needed, this might need to return an error.
    }

    // 3. Delete Post Document from Firestore
    await deleteDoc(postDocRef);
    console.log(`[deletePostAction] Post ${postId} deleted successfully from Firestore.`);

    // 4. Revalidate Paths
    revalidatePath('/blog');
    revalidatePath(`/posts/${postId}`); 
    revalidatePath('/blog/profile'); 
    revalidatePath(`/blog/profile/${postAuthorId}`); 
    (postToDelete.tags || []).forEach(tag => revalidatePath(`/tags/${encodeURIComponent(tag)}`));
    if (postToDelete.createdAt) {
        try {
            const postDate = new Date(postToDelete.createdAt);
            revalidatePath(`/archive/${postDate.getFullYear()}/${postDate.getMonth() + 1}`);
        } catch(e) {
            console.warn("[deletePostAction] Could not parse post creation date for archive revalidation:", postToDelete.createdAt);
        }
    }


    return { message: `Post "${postToDelete.title}" deleted successfully.`, success: true, deletedPostId: postId };

  } catch (error) {
    console.error(`[deletePostAction] Critical error deleting post ${postId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { message: `Error: Failed to delete post. ${errorMessage}`, success: false };
  }
}