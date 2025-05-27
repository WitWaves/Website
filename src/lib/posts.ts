
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from './firebase/config';
import { format } from 'date-fns';

export interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string; // ISO date string for client, Firestore Timestamp for server
  updatedAt?: string; // ISO date string for client, Firestore Timestamp for server
  userId?: string;
  imageUrl?: string; // Optional field for post image
}

// Helper to convert Firestore Timestamp to ISO string or return existing string
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return new Date().toISOString(); // Fallback
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  console.warn('Unexpected timestamp format:', timestamp, 'Returning current date as ISO string.');
  return new Date().toISOString();
};


export async function getPosts(count?: number): Promise<Post[]> {
  try {
    const postsCol = collection(db, 'posts');
    let q = query(postsCol, orderBy('createdAt', 'desc'));
    if (count && count > 0) {
        q = query(postsCol, orderBy('createdAt', 'desc'), limit(count));
    }
    
    const postSnapshot = await getDocs(q);
    const postsList = postSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title,
        content: data.content,
        tags: data.tags || [],
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: data.updatedAt ? formatTimestamp(data.updatedAt) : undefined,
        userId: data.userId,
        imageUrl: data.imageUrl,
      } as Post;
    });
    return postsList;
  } catch (error) {
    console.error("Error fetching posts from Firestore:", error);
    return [];
  }
}

export async function getPost(id: string): Promise<Post | undefined> {
  try {
    if (!id || typeof id !== 'string') {
      console.error("Invalid post ID provided to getPost:", id);
      return undefined;
    }
    const postDocRef = doc(db, 'posts', id);
    const postSnap = await getDoc(postDocRef);
    if (postSnap.exists()) {
      const data = postSnap.data();
      return {
        id: postSnap.id,
        title: data.title,
        content: data.content,
        tags: data.tags || [],
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: data.updatedAt ? formatTimestamp(data.updatedAt) : undefined,
        userId: data.userId,
        imageUrl: data.imageUrl,
      } as Post;
    } else {
      console.log(`No post found with ID: ${id}`);
      return undefined;
    }
  } catch (error) {
    console.error(`Error fetching post ${id} from Firestore:`, error);
    return undefined;
  }
}


export async function getPostsByTag(tag: string): Promise<Post[]> {
  try {
    const decodedTag = decodeURIComponent(tag).toLowerCase();
    const postsCol = collection(db, 'posts');
    const q = query(
      postsCol,
      where('tags', 'array-contains', decodedTag),
      orderBy('createdAt', 'desc')
    );
    const postSnapshot = await getDocs(q);
    return postSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title,
        content: data.content,
        tags: data.tags || [],
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: data.updatedAt ? formatTimestamp(data.updatedAt) : undefined,
        userId: data.userId,
        imageUrl: data.imageUrl,
      } as Post;
    });
  } catch (error) {
    console.error(`Error fetching posts by tag ${tag} from Firestore:`, error);
    return [];
  }
}

export async function getPostsByArchive(year: number, month: number): Promise<Post[]> { // month is 0-indexed
  try {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    const postsCol = collection(db, 'posts');
    const q = query(
      postsCol,
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<', Timestamp.fromDate(endDate)),
      orderBy('createdAt', 'desc')
    );
    const postSnapshot = await getDocs(q);
    return postSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title,
        content: data.content,
        tags: data.tags || [],
        createdAt: formatTimestamp(data.createdAt),
        updatedAt: data.updatedAt ? formatTimestamp(data.updatedAt) : undefined,
        userId: data.userId,
        imageUrl: data.imageUrl,
      } as Post;
    });
  } catch (error)
    {
    console.error(`Error fetching posts for archive ${year}-${month + 1} from Firestore:`, error);
    return [];
  }
}

export async function getAllTags(): Promise<string[]> {
  try {
    const posts = await getPosts(); // Fetches all posts
    const tagSet = new Set<string>();
    posts.forEach(post => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => tagSet.add(tag.toLowerCase()));
      }
    });
    return Array.from(tagSet).sort();
  } catch (error) {
    console.error("Error fetching all tags from Firestore derived posts:", error);
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
   try {
    const posts = await getPosts(); // Fetches all posts
    const periodsMap = new Map<string, ArchivePeriod>();
    posts.forEach(post => {
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
        return b.year - a.year; // Sort by year descending
      }
      return b.month - a.month; // Then by month descending
    });
  } catch (error) {
    console.error("Error fetching archive periods from Firestore derived posts:", error);
    return [];
  }
}


export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

export async function isSlugUnique(slug: string): Promise<boolean> {
  try {
    if (!slug) return false; // Or throw an error, depending on desired behavior
    const postDocRef = doc(db, 'posts', slug);
    const docSnap = await getDoc(postDocRef);
    return !docSnap.exists();
  } catch (error) {
    console.error(`Error checking slug uniqueness for ${slug} in Firestore:`, error);
    // Depending on policy, either default to not unique (safer) or throw
    return false; 
  }
}
