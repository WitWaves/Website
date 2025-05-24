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

  revalidatePath('/');
  revalidatePath('/posts/[id]', 'page');
  revalidatePath('/tags/[tag]', 'page');
  revalidatePath('/archive/[year]/[month]', 'page');
  
  // Not redirecting from here to allow success message display
  // The component will redirect on success state
  return { message: `Post "${title}" created successfully!`, success: true, errors: {}, newPostId: newPost.id } as FormState & {newPostId: string};
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

  // Potentially update slug if title changed, ensuring uniqueness (more complex in real app)
  // For simplicity, keeping slug same on update, or regenerating carefully
  // postsData[postIndex].id = generateSlug(title); // If slug should change, handle uniqueness

  postsData[postIndex] = {
    ...postsData[postIndex],
    title,
    content,
    tags: tags || [],
    updatedAt: new Date().toISOString(),
  };

  revalidatePath('/');
  revalidatePath(`/posts/${id}`);
  revalidatePath('/tags/[tag]', 'page');
  revalidatePath('/archive/[year]/[month]', 'page');
  
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
    // Potentially return a user-friendly error or specific tags indicating an issue
    return ['ai-suggestion-error'];
  }
}
