
'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { generateSlug, isSlugUnique } from '@/lib/posts';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, updateDoc, serverTimestamp, deleteField } from 'firebase/firestore'; 
import type { Post } from '@/lib/posts';
import type { UserProfile, SocialLinks } from '@/lib/userProfile'; // Import SocialLinks
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
  displayName: z.string().min(1, 'Display name cannot be empty.'), // Made non-optional
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
  while (!(await isSlugUnique(slug))) {
    slug = `${generateSlug(title)}-${counter}`;
    counter++;
    if (counter > 10) {
        return { message: 'Error: Could not generate a unique slug for the post.', errors: {} };
    }
  }

  const newPostRef = doc(db, 'posts', slug);
  
  const newPostData = { 
    title,
    content,
    tags: tags || [],
    userId,
    createdAt: serverTimestamp(), 
    updatedAt: serverTimestamp(), 
  };

  try {
    await setDoc(newPostRef, newPostData);
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
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation Error: Failed to update post.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { title, content, tags } = validatedFields.data;
  const postDocRef = doc(db, 'posts', id);

  const updatedPostData = {
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
    username: username,
    displayName: displayName, // This displayName is for the Firestore profile document
    bio: bio,
    socialLinks: socialLinksInput as SocialLinks, 
  };

  try {
    await updateUserProfileDataInDb(userId, profileUpdateData);
  } catch (error) {
    console.error("Error updating user profile in DB:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { message: `Error: Failed to update profile in database. ${errorMessage}`, success: false };
  }
 
  const updatedProfileForState: Partial<UserProfile> = {
      uid: userId,
      ...profileUpdateData 
  };

  revalidatePath('/blog/profile');
  revalidatePath(`/blog/profile/${userId}`); 

  return { message: 'Profile updated successfully!', success: true, updatedProfile: updatedProfileForState };
}
