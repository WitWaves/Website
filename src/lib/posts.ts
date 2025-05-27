
import { format } from 'date-fns';

// Centralized Post type definition
export interface Post {
  id: string; // Corresponds to Firestore document ID (which will be the slug)
  title: string;
  content: string;
  tags: string[];
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
  userId?: string; // ID of the user who created the post
}

// Mock in-memory data store
const mockPosts: Post[] = [
  {
    id: 'hello-world-mock',
    title: 'Hello World (Mock Post)',
    content: 'This is a mock post loaded from in-memory data. If you see this, Firestore is disconnected.',
    tags: ['mock', 'testing'],
    createdAt: new Date(2023, 0, 15, 10, 30, 0).toISOString(),
    updatedAt: new Date(2023, 0, 15, 10, 30, 0).toISOString(),
    userId: 'mock-user-123',
  },
  {
    id: 'another-mock-post',
    title: 'Another Mock Entry',
    content: 'Content for the second mock post to test listing.',
    tags: ['example', 'mock'],
    createdAt: new Date(2023, 1, 20, 12, 0, 0).toISOString(),
    userId: 'mock-user-456',
  },
];

export async function getPosts(): Promise<Post[]> {
  console.log("Fetching posts from MOCK in-memory store.");
  try {
    // Return a copy to prevent direct modification of the mock array
    return JSON.parse(JSON.stringify(mockPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())));
  } catch (error) {
    console.error("Error fetching posts from MOCK store:", error);
    return [];
  }
}

export async function getPost(id: string): Promise<Post | undefined> {
  console.log(`Fetching post ${id} from MOCK in-memory store.`);
  try {
    if (!id || typeof id !== 'string') {
      console.error("Invalid post ID provided to getPost (mock):", id);
      return undefined;
    }
    const post = mockPosts.find(p => p.id === id);
    return post ? JSON.parse(JSON.stringify(post)) : undefined;
  } catch (error) {
    console.error(`Error fetching post ${id} from MOCK store:`, error);
    return undefined;
  }
}

export async function getPostsByTag(tag: string): Promise<Post[]> {
  console.log(`Fetching posts by tag ${tag} from MOCK in-memory store.`);
  try {
    const decodedTag = decodeURIComponent(tag).toLowerCase();
    return JSON.parse(JSON.stringify(mockPosts.filter(post => post.tags.map(t=>t.toLowerCase()).includes(decodedTag))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())));
  } catch (error) {
    console.error(`Error fetching posts by tag ${tag} from MOCK store:`, error);
    return [];
  }
}

export async function getPostsByArchive(year: number, month: number): Promise<Post[]> { // month is 0-indexed
  console.log(`Fetching posts for archive ${year}-${month + 1} from MOCK in-memory store.`);
  try {
    return JSON.parse(JSON.stringify(mockPosts.filter(post => {
      const postDate = new Date(post.createdAt);
      return postDate.getFullYear() === year && postDate.getMonth() === month;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())));
  } catch (error) {
    console.error(`Error fetching posts for archive ${year}-${month + 1} from MOCK store:`, error);
    return [];
  }
}

export async function getAllTags(): Promise<string[]> {
  console.log("Fetching all tags from MOCK in-memory store.");
  try {
    const tagSet = new Set<string>();
    mockPosts.forEach(post => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  } catch (error) {
    console.error("Error fetching all tags from MOCK store:", error);
    return [];
  }
}

export type ArchivePeriod = {
  year: number;
  month: number; // 0-indexed
  monthName: string;
  count: number;
};

export async function getArchivePeriods(): Promise<ArchivePeriod[]> {
  console.log("Fetching archive periods from MOCK in-memory store.");
  try {
    const periodsMap = new Map<string, ArchivePeriod>();
    mockPosts.forEach(post => {
      if (post.createdAt) {
        const date = new Date(post.createdAt);
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed
        const monthName = format(date, 'MMMM');
        const key = `${year}-${month}`;

        if (periodsMap.has(key)) {
          const existing = periodsMap.get(key)!;
          periodsMap.set(key, { ...existing, count: existing.count + 1 });
        } else {
          periodsMap.set(key, { year, month, monthName, count: 1 });
        }
      }
    });
    return Array.from(periodsMap.values()).sort((a, b) => {
      if (a.year !== b.year) {
        return b.year - a.year;
      }
      return b.month - a.month;
    });
  } catch (error) {
    console.error("Error fetching archive periods from MOCK store:", error);
    return [];
  }
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export async function isSlugUnique(slug: string): Promise<boolean> {
  console.log(`Checking slug uniqueness for ${slug} in MOCK in-memory store.`);
  try {
    if (!slug) return false;
    return !mockPosts.some(post => post.id === slug);
  } catch (error) {
    console.error(`Error checking slug uniqueness for ${slug} in MOCK store:`, error);
    return false;
  }
}
