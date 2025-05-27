
'use server';
/**
 * @fileOverview Provides functions for interacting with user profiles in Firestore.
 */
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  portfolio?: string;
  github?: string; // Added github for completeness
}

export interface UserProfile {
  uid: string; // Should match Firebase Auth UID
  username?: string; // User's handle, e.g., @username
  bio?: string;
  socialLinks?: SocialLinks;
  updatedAt?: any; // Firestore serverTimestamp
  createdAt?: any; // Firestore serverTimestamp
  // displayName and photoURL from Firebase Auth are often used directly
  // but displayName can be stored here too if needed for specific querying/display.
}

/**
 * Fetches a user's profile from the 'userProfiles' collection in Firestore.
 * @param userId The UID of the user.
 * @returns The user profile object or null if not found.
 */
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
        bio: data.bio,
        socialLinks: data.socialLinks,
        // Convert Firestore Timestamps to ISO strings if they exist
        createdAt: data.createdAt?.toDate?.().toISOString() || undefined,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || undefined,
      } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching user profile for ${userId}:`, error);
    return null;
  }
}

/**
 * Creates or updates a user's profile in the 'userProfiles' collection in Firestore.
 * @param userId The UID of the user.
 * @param data The profile data to update. Should be a partial UserProfile object.
 *             `displayName` and `photoURL` are typically managed via Firebase Auth but can be mirrored.
 */
export async function updateUserProfileData(userId: string, data: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>) {
  if (!userId) throw new Error('User ID is required to update profile.');
  try {
    const profileDocRef = doc(db, 'userProfiles', userId);
    const profileSnap = await getDoc(profileDocRef);

    const dataToSet = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    if (!profileSnap.exists()) {
      // If profile doesn't exist, add createdAt timestamp
      (dataToSet as UserProfile).createdAt = serverTimestamp();
    }
    
    await setDoc(profileDocRef, dataToSet, { merge: true });
    console.log(`User profile for ${userId} updated successfully.`);
  } catch (error)
 {
    console.error(`Error updating user profile for ${userId}:`, error);
    throw error; // Re-throw to be caught by the server action
  }
}
