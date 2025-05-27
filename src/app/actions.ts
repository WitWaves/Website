
'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { generateSlug, isSlugUnique } from '@/lib/posts'; // Post type will come from here if needed
import { suggestTags as suggestTagsFlow } from '@/ai/flows/suggest-tags';
import { db } from '@/lib/firebase/config'; 
import { doc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import type { Post } from '@/lib/posts'; // Import Post type
// Removed UserProfile specific imports as they are part of the rolled-back feature.


const PostFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  content: z.string().min(10, 'Content must be at least 10 characters.'),
  tags: z.string().optional().transform(val => 
    val ? val.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0) : []
  ),
  userId: z.string().optional(), 
});

// Reverted FormState to not include profile editing errors
export type FormState = {
  message: string;
  errors?: {
    title?: string[];
    content?: string[];
    tags?: string[];
    userId?: string[];
    form?: string[]; // General form error if needed for posts
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
  while (!(await isSlugUnique(slug))) {
    slug = `${generateSlug(title)}-${counter}`;
    counter++;
    if (counter > 10) { 
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
// updateUserProfileAction and UserProfileSchema removed as part of rollback.

