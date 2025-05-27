
'use server';

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './firebase/config';

export interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  portfolio?: string;
  github?: string;
}

export interface UserProfile {
  uid: string;
  username?: string;
  displayName?: string; // Storing a copy from Firebase Auth
  bio?: string;
  socialLinks?: SocialLinks;
  createdAt?: string | any; // Allow ISO string for client, serverTimestamp for write
  updatedAt?: string | any; // Allow ISO string for client, serverTimestamp for write
}

// Helper to convert Firestore Timestamp to ISO string
const formatProfileTimestamp = (timestamp: any): string | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  return undefined;
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;
  try {
    const profileDocRef = doc(db, 'userProfiles', userId);
    const docSnap = await getDoc(profileDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        uid: userId,
        username: data.username,
        displayName: data.displayName,
        bio: data.bio,
        socialLinks: data.socialLinks || {},
        createdAt: formatProfileTimestamp(data.createdAt),
        updatedAt: formatProfileTimestamp(data.updatedAt),
      } as UserProfile; // Cast carefully, ensure all fields align
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function updateUserProfileData(
  userId: string,
  // Data coming from action can include displayName for storage in Firestore profile
  data: Partial<Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>> & { displayName?: string }
): Promise<void> {
  if (!userId) throw new Error("User ID is required to update profile data.");
  const profileDocRef = doc(db, 'userProfiles', userId);
  try {
    const docSnap = await getDoc(profileDocRef);
    const dataToSave = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    if (docSnap.exists()) {
      await updateDoc(profileDocRef, dataToSave);
    } else {
      // If profile doesn't exist, create it. Include createdAt.
      await setDoc(profileDocRef, {
        ...dataToSave,
        uid: userId, // Ensure uid is part of the initial document
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error updating user profile data in Firestore:", error);
    throw error;
  }
}
