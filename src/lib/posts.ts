import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
  // setDoc, // Not used in this file directly for create/update, actions.ts handles it
  // updateDoc // Not used in this file directly for create/update, actions.ts handles it
} from 'firebase/firestore';
import { db } from './firebase/config'; // Assuming this is your Firestore db instance
import { format } from 'date-fns';

export interface Post {
  id: string; // This will be the slug
  title: string;
  content: string;
  tags: string[];
  createdAt: string; // ISO date string for client, Firestore Timestamp for server
  updatedAt?: string; // ISO date string for client, Firestore Timestamp for server
  userId?: string;
  imageUrl?: string;
  likedBy: string[];
  likeCount: number;
  commentCount: number;
  isArchived?: boolean; // Added for archive feature
}

// Helper to convert Firestore Timestamp to ISO string or return existing string
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return new Date().toISOString(); // Default to now if null/undefined
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (typeof timestamp === 'string') {
    const parsedDate = new Date(timestamp);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
    // console.warn('Unexpected string timestamp format, not a valid ISO string or parsable date:', timestamp);
    // Fallback for strings that are not valid dates but might be stored (should be rare)
    return timestamp; // Or handle as an error / return a default
  }
  // console.warn('Unexpected timestamp format:', timestamp, typeof timestamp, 'Returning current date as ISO string.');
  return new Date().toISOString(); // Fallback for other unexpected types
};

// Helper to map Firestore document data to Post interface
const mapDocToPost = (docSnap: any): Post => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data.title || 'Untitled Post',
    content: data.content || '',
    tags: data.tags || [],
    createdAt: formatTimestamp(data.createdAt),
    updatedAt: data.updatedAt ? formatTimestamp(data.updatedAt) : undefined,
    userId: data.userId,
    imageUrl: data.imageUrl,
    likedBy: data.likedBy || [],
    likeCount: data.likeCount || 0,
    commentCount: data.commentCount || 0,
    isArchived: data.isArchived || false, // Default to false if undefined
  } as Post;
};

/**
 * Fetches non-archived posts, ordered by creation date.
 * @param count Optional number of posts to limit.
 * @returns A promise that resolves to an array of Post objects.
 */
export async function getPosts(count?: number): Promise<Post[]> {
  try {
    const postsCol = collection(db, 'posts');
    // Base query for non-archived posts
    const queryConstraints = [
        where('isArchived', '==', false),
        orderBy('createdAt', 'desc')
    ];

    if (count && count > 0) {
      queryConstraints.push(limit(count));
    }

    const q = query(postsCol, ...queryConstraints);
    
    const postSnapshot = await getDocs(q);
    const postsList = postSnapshot.docs.map(mapDocToPost);
    return postsList;
  } catch (error) {
    console.error("Error fetching posts from Firestore:", error);
    return [];
  }
}

/**
 * Fetches a single post by its ID (slug), regardless of archive status.
 * @param id The ID (slug) of the post.
 * @returns A promise that resolves to a Post object or undefined if not found.
 */
export async function getPost(id: string): Promise<Post | undefined> {
  try {
    if (!id || typeof id !== 'string') {
      console.error("Invalid post ID provided to getPost:", id);
      return undefined;
    }
    const postDocRef = doc(db, 'posts', id);
    const postSnap = await getDoc(postDocRef);
    if (postSnap.exists()) {
      return mapDocToPost(postSnap);
    } else {
      // console.log(`No post found with ID: ${id}`); // Less noisy for 404s
      return undefined;
    }
  } catch (error) {
    console.error(`Error fetching post ${id} from Firestore:`, error);
    return undefined;
  }
}

/**
 * Fetches all posts by a specific user ID, including archived posts.
 * The profile page will handle filtering into "Published" and "Archived" tabs.
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of Post objects.
 */
export async function getPostsByUserId(userId: string): Promise<Post[]> {
  if (!userId) {
    console.warn('getPostsByUserId called without userId');
    return [];
  }
  try {
    const postsCol = collection(db, 'posts');
    // Fetches ALL posts by userId, archive status will be handled by client/profile page
    const q = query(
      postsCol,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const postSnapshot = await getDocs(q);
    return postSnapshot.docs.map(mapDocToPost);
  } catch (error: any) {
    if (error.code === 'failed-precondition' && error.message.includes('requires an index')) {
      console.error(
        `Firestore query in getPostsByUserId failed because a composite index is missing. 
         Please create the index in your Firebase console (collection: 'posts', fields: 'userId' (==), 'createdAt' (desc)). 
         The error message usually provides a direct link to create it. 
         Error: ${error.message}`
      );
    } else {
      console.error(`Error fetching posts for user ${userId} from Firestore:`, error);
    }
    return [];
  }
}


/**
 * Fetches non-archived posts by a specific tag.
 * @param tag The tag to filter by.
 * @returns A promise that resolves to an array of Post objects.
 */
export async function getPostsByTag(tag: string): Promise<Post[]> {
  try {
    const decodedTag = decodeURIComponent(tag).toLowerCase();
    const postsCol = collection(db, 'posts');
    const q = query(
      postsCol,
      where('tags', 'array-contains', decodedTag),
      where('isArchived', '==', false), // Filter out archived posts
      orderBy('createdAt', 'desc')
    );
    const postSnapshot = await getDocs(q);
    return postSnapshot.docs.map(mapDocToPost);
  } catch (error) {
    console.error(`Error fetching posts by tag ${tag} from Firestore:`, error);
    return [];
  }
}

/**
 * Fetches non-archived posts for a specific archive period (year and month).
 * @param year The year of the archive period.
 * @param month The month of the archive period (0-indexed).
 * @returns A promise that resolves to an array of Post objects.
 */
export async function getPostsByArchive(year: number, month: number): Promise<Post[]> {
  try {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1); // Next month, day 1

    const postsCol = collection(db, 'posts');
    const q = query(
      postsCol,
      where('isArchived', '==', false), // Filter out archived posts
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<', Timestamp.fromDate(endDate)),
      orderBy('createdAt', 'desc')
    );
    const postSnapshot = await getDocs(q);
    return postSnapshot.docs.map(mapDocToPost);
  } catch (error) {
    console.error(`Error fetching posts for archive ${year}-${month + 1} from Firestore:`, error);
    return [];
  }
}

/**
 * Gets all unique tags from non-archived posts.
 * @returns A promise that resolves to an array of sorted tag strings.
 */
export async function getAllTags(): Promise<string[]> {
  try {
    // getPosts() now fetches only non-archived posts by default
    const posts = await getPosts(); 
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

/**
 * Gets archive periods (year, month, count) based on non-archived posts.
 * @returns A promise that resolves to an array of ArchivePeriod objects.
 */
export async function getArchivePeriods(): Promise<ArchivePeriod[]> {
   try {
    // getPosts() now fetches only non-archived posts by default
    const posts = await getPosts(); 
    const periodsMap = new Map<string, ArchivePeriod>();
    posts.forEach(post => {
      if (post.createdAt) {
        const date = new Date(post.createdAt);
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed
        const monthName = format(date, 'MMMM'); // e.g., "January"
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
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/\s+/g, '-') 
    .replace(/[^\w-]+/g, '') 
    .replace(/--+/g, '-') 
    .replace(/^-+/, '') 
    .replace(/-+$/, ''); 
}

export async function isSlugUnique(slug: string): Promise<boolean> {
  try {
    if (!slug) return false; 
    const postDocRef = doc(db, 'posts', slug);
    const docSnap = await getDoc(postDocRef);
    return !docSnap.exists();
  } catch (error) {
    console.error(`Error checking slug uniqueness for ${slug} in Firestore:`, error);
    return false; 
  }
}

/**
 * Fetches non-archived posts liked by a specific user.
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of Post objects.
 */
export async function getLikedPostsByUser(userId: string): Promise<Post[]> {
  if (!userId) {
    console.warn('[getLikedPostsByUser] Called without userId');
    return [];
  }
  // console.log(`[getLikedPostsByUser] Fetching posts liked by userId: ${userId}`);
  try {
    const postsCol = collection(db, 'posts');
    const q = query(
      postsCol,
      where('likedBy', 'array-contains', userId),
      where('isArchived', '==', false), // Filter out archived posts
      orderBy('createdAt', 'desc') 
    );
    const postSnapshot = await getDocs(q);
    const likedPostsList = postSnapshot.docs.map(mapDocToPost);
    // console.log(`[getLikedPostsByUser] Found ${likedPostsList.length} posts liked by userId: ${userId}`);
    return likedPostsList;
  } catch (error: any) {
    if (error.code === 'failed-precondition' && error.message.includes('requires an index')) {
      console.error(
        `Firestore query in getLikedPostsByUser failed because a composite index is missing. 
         Please create the index in your Firebase console (collection: 'posts', fields: 'likedBy' (array-contains), 'isArchived' (==), 'createdAt' (desc)). 
         The error message usually provides a direct link to create it. 
         Error: ${error.message}`
      );
    } else {
      console.error(`Error fetching posts liked by user ${userId} from Firestore:`, error);
    }
    return [];
  }
}
