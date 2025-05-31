'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getPost, generateSlug, isSlugUnique, type Post } from '@/lib/posts'; // Assuming Post type is here
import { db } from '@/lib/firebase/config'; // Firestore db instance
import {
    doc, setDoc, updateDoc, serverTimestamp, deleteField, getDoc,
    arrayUnion, arrayRemove, increment, addDoc, collection, deleteDoc as deleteFirestoreDoc, // Renamed to avoid conflict
    getDocs, FieldValue, query as firestoreQuery, limit
} from 'firebase/firestore';
import type { UserProfile, SocialLinks } from '@/lib/userProfile';
import { updateUserProfileData as updateUserProfileDataInDb } from '@/lib/userProfile';
import { storage } from '@/lib/firebase/config'; // Firebase Storage instance
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { type UserUploadedImage } from '@/lib/imageUploads';

// Schemas (existing)
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
    val ? val.split(',').map(interest => interest.trim().toLowerCase()).filter(tag => tag.length > 0) : []
  ),
});

const AddCommentSchema = z.object({
  postId: z.string().min(1, 'Post ID is required.'),
  userId: z.string().min(1, 'User ID is required.'),
  userDisplayName: z.string().min(1, 'User display name is required.'),
  userPhotoURL: z.string().url().optional().or(z.literal('')),
  commentText: z.string().min(1, 'Comment cannot be empty.').max(1000, 'Comment cannot exceed 1000 characters.'),
});

const DeleteUserImageSchema = z.object({
  imageId: z.string().min(1, 'Image ID is required.'),
  storagePath: z.string().min(1, 'Storage path is required.'),
  userId: z.string().min(1, 'User ID is required for authorization.'),
});

// New Schema for Toggle Archive Action
const ToggleArchiveSchema = z.object({
    postId: z.string().min(1, "Post ID is required."),
    userId: z.string().min(1, "User ID is required for authorization."), // User performing the action
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
    postId?: string[]; // For like, comment, archive actions
    commentText?: string[];
    imageId?: string[];
    storagePath?: string[];
  };
  success?: boolean;
  newPostId?: string;
  deletedPostId?: string;
  updatedProfile?: Partial<UserProfile>;
  updatedLikeStatus?: { postId: string; liked: boolean; newCount: number };
  newCommentId?: string;
  updatedArchiveStatus?: { postId: string; isArchived: boolean }; // For archive action
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

  // Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'imageUrl'>
  // Assuming Post type now has isArchived
  const newPostData: any = { // Using 'any' temporarily if Post type is not directly updatable here
    title,
    content,
    tags: tags || [],
    userId,
    likedBy: [],
    likeCount: 0,
    commentCount: 0,
    isArchived: false, // Initialize isArchived to false
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
  revalidatePath('/archive/[year]/[month]', 'page'); // Revalidate general archive view
  revalidatePath('/blog/profile'); // Revalidate own profile
  if (userId) revalidatePath(`/blog/profile/${userId}`); // Revalidate specific user profile

  return { message: `Post "${title}" created successfully!`, success: true, errors: {}, newPostId: slug };
}

export async function updatePostAction(id: string, prevState: FormState, formData: FormData): Promise<FormState> {
  console.log('[updatePostAction] Server action triggered for post ID:', id);

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

  const existingPost = await getPost(id); // Fetches Post, which should include isArchived
  const userId = existingPost?.userId;

  // Partial<Omit<Post, 'id'| 'createdAt' | 'isArchived'>> -> isArchived not updated here
  const updatedPostData: any = {
    title,
    content,
    tags: tags || [],
    updatedAt: serverTimestamp(),
  };

  if (uploadedThumbnailUrl === '') {
    updatedPostData.imageUrl = deleteField();
    console.log('[updatePostAction] Thumbnail removal signaled: imageUrl field will be deleted.');
  } else if (uploadedThumbnailUrl) {
    updatedPostData.imageUrl = uploadedThumbnailUrl;
    console.log('[updatePostAction] Thumbnail URL set:', uploadedThumbnailUrl);
  }

  console.log('[updatePostAction] Data prepared for Firestore update (including tags):', updatedPostData.tags);

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
  revalidatePath('/blog/profile');
  if (userId) revalidatePath(`/blog/profile/${userId}`);


  return { message: `Post "${title}" updated successfully!`, success: true, errors: {} };
}


export async function getAISuggestedTagsAction(postContent: string): Promise<string[]> {
  if (!postContent || postContent.trim().length < 20) {
    return [];
  }
  try {
    // Dynamically import to keep server-only
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

    const postData = postSnap.data() as Post; // Assuming Post type includes likedBy and likeCount
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
    revalidatePath('/blog/profile'); // Revalidate profile in case "liked posts" are shown
    if(postData.userId) revalidatePath(`/blog/profile/${postData.userId}`);


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
  const postAuthorId = formData.get('postAuthorId') as string;
  const currentUserId = formData.get('currentUserId') as string;

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
    const postToDelete = await getPost(postId); // This should be your existing function to fetch post data

    if (!postToDelete) {
      return { message: 'Error: Post not found.', success: false };
    }

    if (postToDelete.imageUrl && postToDelete.imageUrl.startsWith('https://firebasestorage.googleapis.com')) {
      console.log(`[deletePostAction] Attempting to delete thumbnail: ${postToDelete.imageUrl}`);
      const imageStorageRefToDelete = storageRef(storage, postToDelete.imageUrl);
      try {
        await deleteObject(imageStorageRefToDelete);
        console.log(`[deletePostAction] Thumbnail ${postToDelete.imageUrl} deleted successfully.`);
      } catch (storageError: any) {
        console.warn(`[deletePostAction] Could not delete thumbnail ${postToDelete.imageUrl} from Storage:`, storageError.code, storageError.message);
      }
    }
    console.log("[deletePostAction] Note: Deletion of images embedded in post content (Quill) is not automatically handled by this action.");

    const commentsColRef = collection(db, 'posts', postId, 'comments');
    try {
      const commentsSnapshot = await getDocs(commentsColRef);
      if (!commentsSnapshot.empty) {
        console.log(`[deletePostAction] Found ${commentsSnapshot.size} comments for post ${postId}. Deleting...`);
        const deletePromises = commentsSnapshot.docs.map(commentDoc => deleteFirestoreDoc(commentDoc.ref));
        await Promise.all(deletePromises);
        console.log(`[deletePostAction] Successfully deleted ${commentsSnapshot.size} comments for post ${postId}.`);
      } else {
        console.log(`[deletePostAction] No comments found for post ${postId}. Skipping comment deletion.`);
      }
    } catch (commentsError: any) {
      console.warn(`[deletePostAction] Could not delete comments for post ${postId}:`, commentsError.message);
    }

    await deleteFirestoreDoc(postDocRef); // Use renamed import
    console.log(`[deletePostAction] Post ${postId} deleted successfully from Firestore.`);

    revalidatePath('/blog');
    revalidatePath(`/posts/${postId}`); // Will result in 404, which is fine
    revalidatePath('/blog/profile');
    revalidatePath(`/blog/profile/${postAuthorId}`);
    (postToDelete.tags || []).forEach(tag => revalidatePath(`/tags/${encodeURIComponent(tag)}`));
    if (postToDelete.createdAt) { // Assuming createdAt is a Firestore Timestamp or compatible
        try {
            // Ensure createdAt is a Date object for getFullYear/getMonth
            const postDate = (typeof postToDelete.createdAt === 'string' || typeof postToDelete.createdAt === 'number')
                             ? new Date(postToDelete.createdAt)
                             : ('toDate' in postToDelete.createdAt ? postToDelete.createdAt.toDate() : new Date(postToDelete.createdAt as any));

            if (!isNaN(postDate.getTime())) {
                revalidatePath(`/archive/${postDate.getFullYear()}/${String(postDate.getMonth() + 1).padStart(2, '0')}`, 'page');
            } else {
                 console.warn("[deletePostAction] Could not parse post creation date for archive revalidation:", postToDelete.createdAt);
            }
        } catch(e) {
            console.warn("[deletePostAction] Error processing post creation date for archive revalidation:", postToDelete.createdAt, e);
        }
    }


    return { message: `Post "${postToDelete.title}" deleted successfully.`, success: true, deletedPostId: postId };

  } catch (error) {
    console.error(`[deletePostAction] Critical error deleting post ${postId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { message: `Error: Failed to delete post. ${errorMessage}`, success: false };
  }
}


export async function deleteUserImageAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const rawImageId = formData.get('imageId') as string | null;
  const rawStoragePath = formData.get('storagePath') as string | null;
  const rawUserId = formData.get('userId') as string | null;

  console.log(`[deleteUserImageAction SERVER RAW INPUT] Received - imageId: "${rawImageId}", storagePath: "${rawStoragePath}", userId: "${rawUserId}"`);

  const validatedFields = DeleteUserImageSchema.safeParse({
    imageId: rawImageId,
    storagePath: rawStoragePath,
    userId: rawUserId,
  });

  if (!validatedFields.success) {
    console.error('[deleteUserImageAction SERVER VALIDATION FAILED] Validation Error:', validatedFields.error.flatten().fieldErrors);
    return {
      message: 'Validation Error: Failed to delete image. Missing or invalid required fields.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { imageId, storagePath, userId } = validatedFields.data;
  console.log(`[deleteUserImageAction SERVER VALIDATED DATA] Attempting delete for imageId: "${imageId}" (Length: ${imageId.length}), storagePath: "${storagePath}", actingUserId: "${userId}"`);

  const collectionName = 'userUploads';
  try {
    console.log(`[deleteUserImageAction SERVER DB_PROBE] Checking collection '${collectionName}' with a limit query.`);
    const testQuery = firestoreQuery(collection(db, collectionName), limit(5));
    const testSnapshot = await getDocs(testQuery);
    if (testSnapshot.empty) {
        console.log(`[deleteUserImageAction SERVER DB_PROBE] The '${collectionName}' collection appears empty to the server action or does not exist with this exact name/case.`);
    } else {
        console.log(`[deleteUserImageAction SERVER DB_PROBE] First ${testSnapshot.docs.length} docs in '${collectionName}': ${testSnapshot.docs.map(d => d.id).join(', ')}`);
    }
  } catch (e: any) {
    console.error(`[deleteUserImageAction SERVER DB_PROBE] Error trying to list sample documents from '${collectionName}':`, e.message, e.code);
  }

  try {
    const imageDocRef = doc(db, collectionName, imageId);
    console.log(`[deleteUserImageAction SERVER GET_DOC] Attempting to get document: ${collectionName}/${imageId}`);
    const imageDocSnap = await getDoc(imageDocRef);

    if (!imageDocSnap.exists()) {
      console.warn(`[deleteUserImageAction SERVER GET_DOC_RESULT] Image document with ID "${imageId}" NOT FOUND in '${collectionName}'.`);
      return { message: `Error: Image not found in database (ID: ${imageId}). Please ensure the Firebase project and collection name ('${collectionName}') are correct.`, success: false };
    }

    console.log(`[deleteUserImageAction SERVER GET_DOC_RESULT] Image document with ID "${imageId}" FOUND in '${collectionName}'.`);
    const imageData = imageDocSnap.data() as UserUploadedImage;

    if (imageData.userId !== userId) {
      console.warn(`[deleteUserImageAction SERVER AUTH_CHECK] Unauthorized deletion attempt: User "${userId}" (acting user) tried to delete image "${imageId}" owned by "${imageData.userId}" (owner).`);
      return { message: 'Error: You are not authorized to delete this image.', success: false };
    }
    console.log(`[deleteUserImageAction SERVER AUTH_CHECK] User "${userId}" authorized to delete image "${imageId}".`);

    console.log(`[deleteUserImageAction SERVER STORAGE_DELETE] Attempting to delete from Storage path: "${storagePath}"`);
    const imageStorageRefInstance = storageRef(storage, storagePath);
    try {
      await deleteObject(imageStorageRefInstance);
      console.log(`[deleteUserImageAction SERVER STORAGE_DELETE_SUCCESS] Image "${storagePath}" deleted successfully from Storage.`);
    } catch (storageError: any) {
      console.warn(`[deleteUserImageAction SERVER STORAGE_DELETE_ERROR] Could not delete image "${storagePath}" from Storage: Code: ${storageError.code}, Message: ${storageError.message}`);
      if (storageError.code !== 'storage/object-not-found') {
        return { message: `Error deleting image file from storage: ${storageError.message}`, success: false };
      }
      console.log(`[deleteUserImageAction SERVER STORAGE_DELETE_INFO] Storage object not found, proceeding to delete Firestore metadata.`);
    }

    console.log(`[deleteUserImageAction SERVER FIRESTORE_DELETE] Attempting to delete Firestore document: ${collectionName}/${imageId}`);
    await deleteFirestoreDoc(imageDocRef); // Use renamed import
    console.log(`[deleteUserImageAction SERVER FIRESTORE_DELETE_SUCCESS] Image metadata for ID "${imageId}" deleted successfully from Firestore.`);

    revalidatePath('/blog/profile');
    revalidatePath(`/blog/profile/${userId}`);

    return { message: `Image "${imageData.fileName || imageId}" deleted successfully.`, success: true };
  } catch (error: any) {
    console.error(`[deleteUserImageAction SERVER CRITICAL_ERROR] Critical error during deletion process for image ID "${imageId}":`, error.message, error.code, error.stack);
    return { message: `Error: Failed to delete image. ${error.message || 'An unknown error occurred.'}`, success: false };
  }
}

// ======== NEW ACTION: toggleArchivePostAction ========
export async function toggleArchivePostAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = ToggleArchiveSchema.safeParse({
    postId: formData.get('postId'),
    userId: formData.get('userId'), // This is the ID of the user performing the action
  });

  if (!validatedFields.success) {
    console.error('[toggleArchivePostAction] Validation Error:', validatedFields.error.flatten().fieldErrors);
    return {
      message: 'Validation Error: Missing required fields to toggle archive status.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { postId, userId: LIA } = validatedFields.data; // LIA = Logged In User
  console.log(`[toggleArchivePostAction] Attempting to toggle archive for post ID: ${postId} by User ID: ${LIA}`);

  const postDocRef = doc(db, 'posts', postId);

  try {
    const postSnap = await getDoc(postDocRef);

    if (!postSnap.exists()) {
      console.warn(`[toggleArchivePostAction] Post with ID ${postId} not found.`);
      return { message: 'Error: Post not found.', success: false };
    }

    const postData = postSnap.data() as Post; // Assuming Post type from lib/posts.ts has userId and isArchived

    // Authorization: Check if the user performing the action is the author of the post
    if (postData.userId !== LIA) {
      console.warn(`[toggleArchivePostAction] Unauthorized attempt: User ${LIA} tried to toggle archive for post ${postId} owned by ${postData.userId}`);
      return { message: 'Error: You are not authorized to modify this post.', success: false };
    }

    const currentArchiveStatus = postData.isArchived || false; // Default to false if undefined
    const newArchiveStatus = !currentArchiveStatus;

    await updateDoc(postDocRef, {
      isArchived: newArchiveStatus,
      updatedAt: serverTimestamp(), // Also update the updatedAt timestamp
    });

    console.log(`[toggleArchivePostAction] Post ID ${postId} archive status changed to ${newArchiveStatus} by User ID ${LIA}.`);

    // Revalidate paths - be comprehensive
    revalidatePath('/blog'); // Main blog listing
    revalidatePath(`/posts/${postId}`); // The specific post page
    if (postData.tags && postData.tags.length > 0) {
      postData.tags.forEach(tag => revalidatePath(`/tags/${encodeURIComponent(tag)}`));
    }
    // Revalidate monthly archives if your app uses them
    if (postData.createdAt) {
        try {
            const postDate = (typeof postData.createdAt === 'string' || typeof postData.createdAt === 'number')
                             ? new Date(postData.createdAt)
                             : ('toDate' in postData.createdAt ? postData.createdAt.toDate() : new Date(postData.createdAt as any));
            if (!isNaN(postDate.getTime())) {
              revalidatePath(`/archive/${postDate.getFullYear()}/${String(postDate.getMonth() + 1).padStart(2, '0')}`, 'page');
            }
        } catch(e) {
            console.warn("[toggleArchivePostAction] Error processing post creation date for archive revalidation:", postData.createdAt, e);
        }
    }
    revalidatePath('/blog/profile'); // User's own profile page (for "My Posts" tab)
    revalidatePath(`/blog/profile/${postData.userId}`); // The author's public profile page

    return {
      message: `Post ${newArchiveStatus ? 'archived' : 'unarchived'} successfully.`,
      success: true,
      updatedArchiveStatus: { postId, isArchived: newArchiveStatus },
    };

  } catch (error: any) {
    console.error(`[toggleArchivePostAction] Critical error toggling archive status for post ${postId}:`, error);
    return { message: `Error: Failed to update post archive status. ${error.message || 'An unknown error occurred.'}`, success: false };
  }
}