
'use server';

import { collection, query, where, orderBy, getDocs, Timestamp, addDoc, serverTimestamp, collectionGroup } from 'firebase/firestore';
import { db } from './firebase/config';
import type { Post } from './posts'; // For postTitle context
import { getPost } from './posts';   // To fetch post details

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  text: string;
  createdAt: string; // ISO date string for client, Firestore Timestamp for server
}

export interface UserActivityComment extends Comment {
  postTitle?: string;
  postSlug?: string; // Store slug which is the ID for posts
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

export async function getCommentsByUser(userId: string): Promise<UserActivityComment[]> {
  if (!userId) {
    console.warn('getCommentsByUser called without userId');
    return [];
  }
  try {
    // Ensure you have a composite index for this query in Firestore:
    // Collection ID: comments (collection group), Fields: userId (asc), createdAt (desc)
    const commentsQuery = query(
      collectionGroup(db, 'comments'), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc') // Show user's most recent comments first
    );
    
    const commentsSnapshot = await getDocs(commentsQuery);
    if (commentsSnapshot.empty) {
      console.log(`[getCommentsByUser] No comments found for userId: ${userId}`);
      return [];
    }
    console.log(`[getCommentsByUser] Found ${commentsSnapshot.docs.length} comments for userId: ${userId}`);

    const userComments: UserActivityComment[] = [];

    for (const docSnap of commentsSnapshot.docs) {
      const data = docSnap.data();
      // Critical: Ensure comments stored in Firestore have a 'postId' field.
      if (!data.postId) {
        console.warn(`[getCommentsByUser] Comment ${docSnap.id} for user ${userId} is missing postId field. Skipping.`);
        continue;
      }

      const comment: UserActivityComment = {
        id: docSnap.id,
        postId: data.postId, 
        userId: data.userId,
        userDisplayName: data.userDisplayName,
        userPhotoURL: data.userPhotoURL,
        text: data.text,
        createdAt: formatCommentTimestamp(data.createdAt),
        postSlug: data.postId, 
      };

      const post = await getPost(data.postId); // getPost uses slug as ID
      if (post) {
        comment.postTitle = post.title;
      } else {
        comment.postTitle = "Post not found or inaccessible";
        console.warn(`[getCommentsByUser] Post with ID (slug) ${data.postId} not found for comment ${comment.id}`);
      }
      userComments.push(comment);
    }
    return userComments;
  } catch (error) {
    console.error(`Error fetching comments by user ${userId} from Firestore:`, error);
    return [];
  }
}
