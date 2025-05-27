
'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { generateSlug, isSlugUnique } from '@/lib/posts'; // Post type will come from here if needed
import { suggestTags as suggestTagsFlow } from '@/ai/flows/suggest-tags';
// import { db } from '@/lib/firebase/config'; 
// import { doc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import type { Post } from '@/lib/posts'; // Import Post type
import type { UserProfile } from '@/lib/userProfile'; // Import UserProfile type
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
  displayName: z.string().min(1, 'Display name cannot be empty.').optional(),
  username: z.string().min(3, 'Username must be at least 3 characters.').regex(/^[a-zA-Z0-9_.]+$/, 'Username can only contain letters, numbers, underscores, and periods.').optional(),
  bio: z.string().max(200, 'Bio cannot exceed 200 characters.').optional(),
  twitter: z.string().url('Invalid Twitter URL.').optional().or(z.literal('')),
  linkedin: z.string().url('Invalid LinkedIn URL.').optional().or(z.literal('')),
  instagram: z.string().url('Invalid Instagram URL.').optional().or(z.literal('')),
  portfolio: z.string().url('Invalid Portfolio URL.').optional().or(z.literal('')),
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
    twitter?: string[];
    linkedin?: string[];
    instagram?: string[];
    portfolio?: string[];
  };
  success?: boolean;
  newPostId?: string;
  updatedProfile?: Partial<UserProfile>;
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
  // For mock store, isSlugUnique might need adjustment or removal if not feasible to implement perfectly
  while (!(await isSlugUnique(slug))) { 
    slug = `${generateSlug(title)}-${counter}`;
    counter++;
    if (counter > 10) { 
        return { message: 'Error: Could not generate a unique slug for the post.', errors: {} };
    }
  }

  const newPostData = { //: Omit<Post, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = {
    id: slug, // For in-memory store, we might add id here
    title,
    content,
    tags: tags || [],
    userId, 
    createdAt: new Date().toISOString(), // Using ISO string for mock store
    updatedAt: new Date().toISOString(),
  };

  try {
    // With Firestore disconnected, we can't save. Log for now or simulate.
    console.log("MOCK: Attempting to create post (Firestore disconnected):", newPostData);
    // In a real mock scenario, you might push to an in-memory array here.
    // For this test, we'll just assume success.
  } catch (error) {
    console.error("Error creating post (MOCK):", error);
    return { message: `Error: Failed to save post (MOCK). ${error instanceof Error ? error.message : ''}`, errors: {} };
  }

  revalidatePath('/blog');
  revalidatePath(`/posts/${slug}`);
  (tags || []).forEach(tag => revalidatePath(`/tags/${encodeURIComponent(tag)}`));
  revalidatePath('/archive/[year]/[month]', 'page');
  revalidatePath('/blog/profile'); 
  
  return { message: `Post "${title}" created successfully! (MOCK)`, success: true, errors: {}, newPostId: slug };
}

export async function updatePostAction(id: string, prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = PostFormSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    tags: formData.get('tags'),
    userId: formData.get('userId'), // Assuming userId is passed for validation if needed, though not updated
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation Error: Failed to update post.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { title, content, tags } = validatedFields.data; 
  // const postDocRef = doc(db, 'posts', id); // Firestore disconnected

  const updatedPostData = { // : Partial<Post> & { updatedAt: any } = {
    title,
    content,
    tags: tags || [],
    updatedAt: new Date().toISOString(), // Using ISO string for mock store
  };

  try {
    // With Firestore disconnected, we can't update. Log for now or simulate.
    console.log(`MOCK: Attempting to update post ${id} (Firestore disconnected):`, updatedPostData);
    // In a real mock scenario, you might update an in-memory array here.
    // For this test, we'll just assume success.
  } catch (error) {
    console.error("Error updating post (MOCK):", error);
    return { message: `Error: Failed to update post (MOCK). ${error instanceof Error ? error.message : ''}`, errors: {} };
  }

  revalidatePath('/blog');
  revalidatePath(`/posts/${id}`);
  revalidatePath('/tags', 'layout'); 
  revalidatePath('/archive/[year]/[month]', 'page');
  revalidatePath('/blog/profile');
  
  return { message: `Post "${title}" updated successfully! (MOCK)`, success: true, errors: {} };
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
    // If Genkit/AI model is also an issue, this might contribute to hangs.
    // For now, assume Genkit is working or has its own fallbacks.
    return ['ai-suggestion-error'];
  }
}


export async function updateUserProfileAction(userId: string, prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = UserProfileSchema.safeParse({
    displayName: formData.get('displayName'),
    username: formData.get('username') || undefined, // Ensure undefined if empty for optional fields
    bio: formData.get('bio') || undefined,
    twitter: formData.get('twitter') || undefined,
    linkedin: formData.get('linkedin') || undefined,
    instagram: formData.get('instagram') || undefined,
    portfolio: formData.get('portfolio') || undefined,
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation Error: Failed to update profile.',
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }
  
  const { displayName, username, bio, ...socialLinksInput } = validatedFields.data;

  const profileUpdateData: Partial<UserProfile> = {
    // uid is not part of the form, it's passed as first arg
    username: username, // Already optional from schema
    bio: bio, // Already optional
    socialLinks: {
      twitter: socialLinksInput.twitter,
      linkedin: socialLinksInput.linkedin,
      instagram: socialLinksInput.instagram,
      portfolio: socialLinksInput.portfolio,
    },
    // displayName will be handled on client for Firebase Auth, this action handles Firestore part
  };
  
  // Remove social links that are empty strings to avoid storing them as such if not desired
  Object.keys(profileUpdateData.socialLinks!).forEach(keyStr => {
    const key = keyStr as keyof typeof profileUpdateData.socialLinks;
    if (profileUpdateData.socialLinks![key] === '') {
      profileUpdateData.socialLinks![key] = undefined;
    }
  });


  try {
    // await updateUserProfileDataInDb(userId, profileUpdateData); // Firestore disconnected
    console.log(`MOCK: Attempting to update user profile ${userId} (Firestore disconnected):`, profileUpdateData);
    // For this test, assume success.
  } catch (error) {
    console.error("Error updating user profile in DB (MOCK):", error);
    return { message: `Error: Failed to update profile in database (MOCK). ${error instanceof Error ? error.message : ''}`, success: false };
  }
  
  const updatedProfileForState: Partial<UserProfile> = {
      uid: userId,
      displayName: displayName, // Pass back the display name from form for optimistic update
      ...profileUpdateData
  }

  revalidatePath('/blog/profile');
  revalidatePath(`/blog/profile/${userId}`); // If you have dynamic user profile pages by username/id

  return { message: 'Profile updated successfully! (MOCK)', success: true, updatedProfile: updatedProfileForState };
}
