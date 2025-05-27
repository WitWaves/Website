
import { db } from '@/lib/firebase/config';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  // setDoc, // setDoc is used in actions.ts, not directly here for reads
  // updateDoc, // updateDoc is used in actions.ts
  query,
  where,
  orderBy,
  Timestamp,
  // serverTimestamp, // serverTimestamp is used in actions.ts
} from 'firebase/firestore';
import type { DocumentSnapshot } from 'firebase/firestore'; // For explicit typing
import { format } from 'date-fns';

// Centralized Post type definition
export interface Post {
  id: string; // Corresponds to Firestore document ID (which will be the slug)
  title: string;
  content: string;
  tags: string[];
  createdAt: string; // ISO date string (converted from Firestore Timestamp)
  updatedAt?: string; // ISO date string (converted from Firestore Timestamp)
  userId?: string; // ID of the user who created the post
}

// Helper function to convert Firestore document to Post object
const postFromDoc = (docSnap: DocumentSnapshot): Post => {
  const data = docSnap.data();
  if (!data) {
    // This case should ideally not be hit if docSnap.exists() was checked before calling,
    // or if it's from a query result which guarantees data.
    throw new Error(`Document ${docSnap.id} has no data!`);
  }
  return {
    id: docSnap.id,
    title: data.title,
    content: data.content,
    tags: data.tags || [],
    createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString(),
    userId: data.userId,
  };
};

export async function getPosts(): Promise<Post[]> {
  try {
    const postsCollection = collection(db, 'posts');
    const q = query(postsCollection, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(postFromDoc);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
}

export async function getPost(id: string): Promise<Post | undefined> {
  try {
    const postDocRef = doc(db, 'posts', id);
    const docSnap = await getDoc(postDocRef);
    if (docSnap.exists()) {
      return postFromDoc(docSnap);
    }
    return undefined;
  } catch (error) {
    console.error(`Error fetching post ${id}:`, error);
    return undefined;
  }
}

export async function getPostsByTag(tag: string): Promise<Post[]> {
  try {
    const postsCollection = collection(db, 'posts');
    const q = query(postsCollection, where('tags', 'array-contains', decodeURIComponent(tag)), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(postFromDoc);
  } catch (error) {
    console.error(`Error fetching posts by tag ${tag}:`, error);
    return [];
  }
}

export async function getPostsByArchive(year: number, month: number): Promise<Post[]> { // month is 0-indexed
  try {
    const startDate = Timestamp.fromDate(new Date(year, month, 1));
    const endDate = Timestamp.fromDate(new Date(year, month + 1, 1)); // First day of next month

    const postsCollection = collection(db, 'posts');
    const q = query(
      postsCollection,
      where('createdAt', '>=', startDate),
      where('createdAt', '<', endDate),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(postFromDoc);
  } catch (error) {
    console.error(`Error fetching posts for archive ${year}-${month + 1}:`, error);
    return [];
  }
}

export async function getAllTags(): Promise<string[]> {
  try {
    const posts = await getPosts(); // Re-uses getPosts to derive tags
    const tagSet = new Set<string>();
    posts.forEach(post => {
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  } catch (error) {
    console.error("Error fetching all tags:", error);
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
    const posts = await getPosts(); // Re-uses getPosts
    const periodsMap = new Map<string, ArchivePeriod>();

    posts.forEach(post => {
      if (post.createdAt) {
        const date = new Date(post.createdAt);
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed
        const monthName = format(date, 'MMMM');
        const key = `${year}-${month}`;

        if (periodsMap.has(key)) {
          const existing = periodsMap.get(key)!; // Non-null assertion
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
    console.error("Error fetching archive periods:", error);
    return [];
  }
}

// Utility function to generate a slug from a title.
// This is NOT a Server Action itself.
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')       // Replace spaces with -
    .replace(/[^\w-]+/g, '')  // Remove all non-word chars (keeps alphanumeric, underscore, hyphen)
    .replace(/--+/g, '-')       // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '');         // Trim - from end of text
}

// Helper function to check if a slug already exists in Firestore.
// This is NOT a Server Action itself.
export async function isSlugUnique(slug: string): Promise<boolean> {
  try {
    const postDocRef = doc(db, 'posts', slug);
    const docSnap = await getDoc(postDocRef);
    return !docSnap.exists();
  } catch (error) {
    console.error(`Error checking slug uniqueness for ${slug}:`, error);
    return false; // Assume not unique on error to be safe
  }
}
