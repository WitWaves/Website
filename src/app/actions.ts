
'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { generateSlug, isSlugUnique } from '@/lib/posts'; // Post type will come from here if needed
import { suggestTags as suggestTagsFlow } from '@/ai/flows/suggest-tags';
import { db, auth as firebaseAuthService } from '@/lib/firebase/config'; // renamed auth to firebaseAuthService
import { doc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import type { Post } from '@/lib/posts'; // Import Post type
import { updateUserProfileData, type UserProfile, type SocialLinks } from '@/lib/userProfile';
import { updateProfile as updateFirebaseProfile } from 'firebase/auth'; // For updating Firebase Auth profile


const PostFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  content: z.string().min(10, 'Content must be at least 10 characters.'),
  tags: z.string().optional().transform(val => 
    val ? val.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0) : []
  ),
  userId: z.string().optional(), 
});

export type FormState = {
  message: string;
  errors?: {
    title?: string[];
    content?: string[];
    tags?: string[];
    userId?: string[];
    // For profile form
    displayName?: string[];
    username?: string[];
    bio?: string[];
    socialLinks?: string[]; // General error for social links block
    form?: string[]; // General form error
  };
  success?: boolean;
  newPostId?: string;
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
  
  let slug = generateSlug(title);
  let counter = 1;
  // Ensure slug is unique (check against Firestore)
  while (!(await isSlugUnique(slug))) {
    slug = `${generateSlug(title)}-${counter}`;
    counter++;
    if (counter > 10) { // Safety break to prevent infinite loop
        return { message: 'Error: Could not generate a unique slug for the post.', errors: {} };
    }
  }

  const newPostData: Omit<Post, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = {
    title,
    content,
    tags: tags || [],
    userId, 
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'posts', slug), newPostData);
  } catch (error) {
    console.error("Error creating post in Firestore:", error);
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
    userId: formData.get('userId'), 
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation Error: Failed to update post.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { title, content, tags } = validatedFields.data; 
  const postDocRef = doc(db, 'posts', id);

  const updatedPostData: Partial<Post> & { updatedAt: any } = {
    title,
    content,
    tags: tags || [],
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(postDocRef, updatedPostData);
  } catch (error) {
    console.error("Error updating post in Firestore:", error);
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
    const result = await suggestTagsFlow({ postContent });
    return result.tags.map(tag => tag.toLowerCase());
  } catch (error) {
    console.error('Error suggesting tags with AI:', error);
    return ['ai-suggestion-error'];
  }
}

// --- User Profile Actions ---

const UserProfileSchema = z.object({
  userId: z.string().min(1, "User ID is missing."), // This will come from auth context on client, or verified server-side
  displayName: z.string().min(1, "Display name cannot be empty.").max(50, "Display name is too long."),
  username: z.string().min(3, "Username must be at least 3 characters.").max(30, "Username is too long.")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, underscores, and periods.")
    .optional().or(z.literal('')), // Allow empty string to clear it
  bio: z.string().max(200, "Bio is too long.").optional().or(z.literal('')),
  socialLinks_twitter: z.string().url("Invalid Twitter URL.").or(z.literal('')).optional(),
  socialLinks_linkedin: z.string().url("Invalid LinkedIn URL.").or(z.literal('')).optional(),
  socialLinks_instagram: z.string().url("Invalid Instagram URL.").or(z.literal('')).optional(),
  socialLinks_portfolio: z.string().url("Invalid Portfolio URL.").or(z.literal('')).optional(),
  socialLinks_github: z.string().url("Invalid Github URL.").or(z.literal('')).optional(),
});

export async function updateUserProfileAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const rawFormData = {
    userId: formData.get('userId'), // This MUST be the currently authenticated user's ID
    displayName: formData.get('displayName'),
    username: formData.get('username'),
    bio: formData.get('bio'),
    socialLinks_twitter: formData.get('socialLinks_twitter') || undefined,
    socialLinks_linkedin: formData.get('socialLinks_linkedin') || undefined,
    socialLinks_instagram: formData.get('socialLinks_instagram') || undefined,
    socialLinks_portfolio: formData.get('socialLinks_portfolio') || undefined,
    socialLinks_github: formData.get('socialLinks_github') || undefined,
  };

  const validatedFields = UserProfileSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      message: 'Validation Error: Failed to update profile.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { 
    userId, 
    displayName, 
    username, 
    bio,
    socialLinks_twitter,
    socialLinks_linkedin,
    socialLinks_instagram,
    socialLinks_portfolio,
    socialLinks_github,
  } = validatedFields.data;

  // In a real app, you'd verify server-side that `userId` matches the authenticated user.
  // For now, we trust it from the client form (which should get it from useAuth).
  if (!userId) {
    return { message: 'Error: User not authenticated.', errors: { form: ["Authentication required."] } };
  }
  
  const currentUser = firebaseAuthService.currentUser; // This is client-side Firebase Auth, might not be available/reliable here.
                                            // Ideally, pass ID token from client and verify with Admin SDK.
                                            // Or, ensure this action is only called by an authenticated user context on client.

  try {
    // 1. Update Firebase Auth display name if it changed
    // This relies on firebaseAuthService.currentUser being the correct user.
    // This part is tricky in a server action without Firebase Admin SDK.
    // For client-side updates, updateProfile would be called directly.
    // Let's assume for now the client will handle updating its own Auth profile if displayName changes,
    // or we ensure this action is called in a context where currentUser is reliable.
    // A more robust way: client calls updateProfile, then calls this action for Firestore data.
    // OR, if this is a pure server action, it might need to take current Auth displayName as input too for comparison.
    // For now, if firebaseAuthService.currentUser exists and name differs, attempt update.
    // This has limitations as firebaseAuthService on server is not the same as on client.
    // A more secure pattern is needed for production (e.g. callable function or client-side auth update).
    // For this demo, we'll proceed but acknowledge this complexity.
    
    // The firebase.auth().currentUser.updateProfile() must be called on the client.
    // This server action should primarily focus on updating the Firestore `userProfiles` collection.
    // The client component that calls this action should handle updating the Firebase Auth profile itself.

    const profileDataToUpdate: Partial<UserProfile> = {
      username: username || '', // Store empty string if cleared
      bio: bio || '',
      socialLinks: {
        twitter: socialLinks_twitter || undefined,
        linkedin: socialLinks_linkedin || undefined,
        instagram: socialLinks_instagram || undefined,
        portfolio: socialLinks_portfolio || undefined,
        github: socialLinks_github || undefined,
      },
    };
    
    await updateUserProfileData(userId, profileDataToUpdate);

    // Revalidation
    revalidatePath('/blog/profile');
    // If username is used in post previews or author lists, revalidate those too.
    revalidatePath('/blog'); 

    return { message: 'Profile updated successfully!', success: true };

  } catch (error) {
    console.error("Error updating profile:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { message: `Error: ${errorMessage}`, errors: { form: [errorMessage] } };
  }
}

