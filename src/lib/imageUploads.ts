'use server';

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase/config';

export interface UserUploadedImage {
  id: string;
  userId: string;
  storagePath: string;
  downloadURL: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string; // ISO string for client
}

const formatTimestampISO = (timestamp: any): string => {
  if (!timestamp) return new Date().toISOString();
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  // Handle cases where timestamp might already be an ISO string or a Date object
  if (typeof timestamp === 'string') {
    // Validate if it's a parsable date string
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  // Fallback for unexpected types, though serverTimestamp should produce a Timestamp
  console.warn('[imageUploads] Unexpected timestamp format:', timestamp);
  return new Date().toISOString();
};


export async function recordUserImageUpload(imageData: {
  userId: string;
  storagePath: string;
  downloadURL: string;
  fileName: string;
  mimeType: string;
}): Promise<string | null> {
  try {
    const docRef = await addDoc(collection(db, 'userImageUploads'), {
      ...imageData,
      uploadedAt: serverTimestamp(),
    });
    console.log('[recordUserImageUpload] Image metadata recorded with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('[recordUserImageUpload] Error recording image metadata:', error);
    return null;
  }
}

export async function getRecentUserImages(userId: string, count: number = 12): Promise<UserUploadedImage[]> {
  if (!userId) {
    console.warn('[getRecentUserImages] Called without userId');
    return [];
  }
  console.log(`[getRecentUserImages] Fetching up to ${count} images for userId: ${userId}`);
  try {
    const imagesColRef = collection(db, 'userImageUploads');
    // Firestore query to get images for the user, ordered by upload date (newest first)
    // This query requires a composite index:
    // Collection: userImageUploads, Fields: userId (Ascending), uploadedAt (Descending)
    // Firebase console will typically provide a link to create this index if it's missing.
    const q = query(
      imagesColRef,
      where('userId', '==', userId),
      orderBy('uploadedAt', 'desc'),
      limit(count)
    );

    const querySnapshot = await getDocs(q);
    const imagesList = querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId,
        storagePath: data.storagePath,
        downloadURL: data.downloadURL,
        fileName: data.fileName,
        mimeType: data.mimeType,
        uploadedAt: formatTimestampISO(data.uploadedAt),
      } as UserUploadedImage;
    });
    console.log(`[getRecentUserImages] Found ${imagesList.length} images for userId: ${userId}`);
    return imagesList;
  } catch (error) {
    console.error(`[getRecentUserImages] Error fetching images for user ${userId}:`, error);
    console.error(`[getRecentUserImages] This might be due to a missing Firestore index. Required index on 'userImageUploads': userId (ASC), uploadedAt (DESC).`);
    return [];
  }
}
