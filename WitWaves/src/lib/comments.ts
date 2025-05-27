
'use server';

import { collection, query, where, orderBy, getDocs, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase/config';

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  text: string;
  createdAt: string; // ISO date string for client, Firestore Timestamp for server
}

// Helper to convert Firestore Timestamp to ISO string or return existing string
const formatCommentTimestamp = (timestamp: any): string => {
  if (!timestamp) return new Date().toISOString(); // Fallback
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  console.warn('Unexpected timestamp format for comment:', timestamp, 'Returning current date as ISO string.');
  return new Date().toISOString();
};

export async function getCommentsForPost(postId: string): Promise<Comment[]> {
  if (!postId) {
    console.warn('getCommentsForPost called without postId');
    return [];
  }
  try {
    const commentsColRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsColRef, orderBy('createdAt', 'asc')); // Show oldest comments first
    
    const commentsSnapshot = await getDocs(q);
    const commentsList = commentsSnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        postId: postId,
        userId: data.userId,
        userDisplayName: data.userDisplayName,
        userPhotoURL: data.userPhotoURL,
        text: data.text,
        createdAt: formatCommentTimestamp(data.createdAt),
      } as Comment;
    });
    return commentsList;
  } catch (error) {
    console.error(`Error fetching comments for post ${postId} from Firestore:`, error);
    return [];
  }
}
