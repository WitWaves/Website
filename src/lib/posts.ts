
import { posts as postsData, type Post as PostType } from './postsStore';
import { format } from 'date-fns';

export type Post = PostType; // Includes userId from postsStore

export async function getPosts(): Promise<Post[]> {
  // Sort by newest first
  return [...postsData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPost(id: string): Promise<Post | undefined> {
  return postsData.find(post => post.id === id);
}

export async function getPostsByTag(tag: string): Promise<Post[]> {
  const allPosts = await getPosts();
  return allPosts.filter(post => post.tags.includes(decodeURIComponent(tag)));
}

export async function getPostsByArchive(year: number, month: number): Promise<Post[]> {
  const allPosts = await getPosts();
  return allPosts.filter(post => {
    const postDate = new Date(post.createdAt);
    return postDate.getFullYear() === year && postDate.getMonth() === month; // month is 0-indexed
  });
}

export async function getAllTags(): Promise<string[]> {
  const allPosts = await getPosts();
  const tagSet = new Set<string>();
  allPosts.forEach(post => post.tags.forEach(tag => tagSet.add(tag)));
  return Array.from(tagSet).sort();
}

export type ArchivePeriod = {
  year: number;
  month: number;
  monthName: string;
  count: number;
};

export async function getArchivePeriods(): Promise<ArchivePeriod[]> {
  const allPosts = await getPosts();
  const periodsMap = new Map<string, ArchivePeriod>();

  allPosts.forEach(post => {
    const date = new Date(post.createdAt);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed
    const monthName = format(date, 'MMMM');
    const key = `${year}-${month}`;

    if (periodsMap.has(key)) {
      periodsMap.get(key)!.count++;
    } else {
      periodsMap.set(key, { year, month, monthName, count: 1 });
    }
  });

  return Array.from(periodsMap.values()).sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year;
    }
    return b.month - a.month;
  });
}

// Utility to generate a slug (basic version)
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}
