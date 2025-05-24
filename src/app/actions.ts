'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { posts as postsData, type Post } from '@/lib/postsStore';
import { generateSlug } from '@/lib/posts';
import { suggestTags as suggestTagsFlow } from '@/ai/flows/suggest-tags';

const PostFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  content: z.string().min(10, 'Content must be at least 10 characters.'),
  tags: z.string().optional().transform(val => 
    val ? val.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []
  ),
});

export type FormState = {
  message: string;
  errors?: {
    title?: string[];
    content?: string[];
    tags?: string[];
  };
  success?: boolean;
  newPostId?: string; // Added to carry new post ID for redirection
} | undefined;


export async function createPostAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = PostFormSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    tags: formData.get('tags'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Validation Error: Failed to create post.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { title, content, tags } = validatedFields.data;
  
  let slug = generateSlug(title);
  // Ensure slug is unique (simple check for demo)
  let counter = 1;
  while (postsData.some(p => p.id === slug)) {
    slug = `${generateSlug(title)}-${counter}`;
    counter++;
  }

  const newPost: Post = {
    id: slug,
    title,
    content,
    tags: tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  postsData.unshift(newPost); // Add to the beginning

  revalidatePath('/blog'); // Main blog listing page
  revalidatePath(`/posts/${newPost.id}`); // The new post's page
  // Revalidate all affected tag pages (can be broad, consider revalidateTag if using fetch tags)
  (tags || []).forEach(tag => revalidatePath(`/tags/${encodeURIComponent(tag)}`));
  revalidatePath('/archive/[year]/[month]', 'page'); // For archive pages
  
  return { message: `Post "${title}" created successfully!`, success: true, errors: {}, newPostId: newPost.id };
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
  const postIndex = postsData.findIndex(p => p.id === id);

  if (postIndex === -1) {
    return { message: 'Error: Post not found.', errors: {} };
  }

  const oldTags = postsData[postIndex].tags;

  postsData[postIndex] = {
    ...postsData[postIndex],
    title,
    content,
    tags: tags || [],
    updatedAt: new Date().toISOString(),
  };

  revalidatePath('/blog'); // Main blog listing page
  revalidatePath(`/posts/${id}`); // The updated post's page
  // Revalidate all affected tag pages (old and new)
  const allTagsToRevalidate = new Set([...oldTags, ...(tags || [])]);
  allTagsToRevalidate.forEach(tag => revalidatePath(`/tags/${encodeURIComponent(tag)}`));
  revalidatePath('/archive/[year]/[month]', 'page'); // For archive pages
  
  return { message: `Post "${title}" updated successfully!`, success: true, errors: {} };
}


export async function getAISuggestedTagsAction(postContent: string): Promise<string[]> {
  if (!postContent || postContent.trim().length < 20) { // Require some content
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
