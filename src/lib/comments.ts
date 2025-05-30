
'use server';

import { collection, query, where, orderBy, getDocs, Timestamp, addDoc, serverTimestamp, collectionGroup } from 'firebase/firestore';
import { db } from './firebase/config';
import type { Post } from './posts';
import { getPost } from './posts';

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  text: string;
  createdAt: string;
}

export interface UserActivityComment extends Comment {
  postTitle?: string;
  postSlug?: string;
}

const formatCommentTimestamp = (timestamp: any): string => {
  if (!timestamp) return new Date().toISOString();
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
    console.warn('[getCommentsForPost] Called without postId');
    return [];
  }
  console.log(`[getCommentsForPost] Fetching comments for postId: ${postId}`);
  try {
    const commentsColRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsColRef, orderBy('createdAt', 'asc'));

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
    console.log(`[getCommentsForPost] Found ${commentsList.length} comments for postId: ${postId}`);
    return commentsList;
  } catch (error) {
    console.error(`[getCommentsForPost] Error fetching comments for post ${postId} from Firestore:`, error);
    return [];
  }
}

export async function getCommentsByUser(userId: string): Promise<UserActivityComment[]> {
  if (!userId) {
    console.warn('[getCommentsByUser] Called without userId');
    return [];
  }
  console.log(`[getCommentsByUser] Fetching comments for userId: ${userId}`);
  try {
    const commentsQuery = query(
      collectionGroup(db, 'comments'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const commentsSnapshot = await getDocs(commentsQuery);
    if (commentsSnapshot.empty) {
      console.log(`[getCommentsByUser] No comments found for userId: ${userId}`);
      return [];
    }
    console.log(`[getCommentsByUser] Found ${commentsSnapshot.docs.length} comment documents for userId: ${userId}`);

    const userComments: UserActivityComment[] = [];

    for (const docSnap of commentsSnapshot.docs) {
      const data = docSnap.data();
      if (!data.postId) {
        console.warn(`[getCommentsByUser] Comment ${docSnap.id} for user ${userId} is missing postId field. Skipping.`);
        continue;
      }
      console.log(`[getCommentsByUser] Processing comment ${docSnap.id} on postId ${data.postId}`);

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

      try {
        const post = await getPost(data.postId);
        if (post) {
          comment.postTitle = post.title;
        } else {
          comment.postTitle = "Post not found or inaccessible";
          console.warn(`[getCommentsByUser] Post with ID (slug) ${data.postId} not found for comment ${comment.id}`);
        }
      } catch (postError) {
         console.error(`[getCommentsByUser] Error fetching post details for postId ${data.postId} (comment ${comment.id}):`, postError);
         comment.postTitle = "Error fetching post title";
      }
      userComments.push(comment);
    }
    console.log(`[getCommentsByUser] Successfully processed ${userComments.length} comments for userId: ${userId}`);
    return userComments;
  } catch (error) {
    console.error(`[getCommentsByUser] Error fetching comments by user ${userId} from Firestore (this might be an INDEX issue):`, error);
    // This error often indicates a missing composite index.
    // The browser console or server logs (from Firebase SDK) should provide a link to create it.
    // Example: Firestore query in getCommentsByUser failed because a composite index is missing.
    // Please create the index in your Firebase console for collection group 'comments', field 'userId' (ASC), field 'createdAt' (DESC).
    return [];
  }
}
