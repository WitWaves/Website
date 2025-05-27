
'use server';

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
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

// Type for minimal author data needed for cards
export interface AuthorProfileForCard {
  uid: string;
  displayName: string;
  photoURL?: string;
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
      } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function getAuthorProfilesForCards(uids: string[]): Promise<Map<string, AuthorProfileForCard>> {
  const profilesMap = new Map<string, AuthorProfileForCard>();
  if (!uids || uids.length === 0) {
    return profilesMap;
  }

  const uniqueUids = Array.from(new Set(uids.filter(uid => !!uid))); // Ensure unique and valid UIDs

  if (uniqueUids.length === 0) {
    return profilesMap;
  }

  try {
    // Firestore 'in' query can handle up to 30 items in the array.
    // For larger arrays, you'd need to batch the queries.
    // This simplified version assumes a manageable number of unique authors per page.
    // If document IDs are UIDs:
    const profilePromises = uniqueUids.map(uid => 
      getDoc(doc(db, 'userProfiles', uid)).then(docSnap => ({ uid, docSnap }))
    );
    
    const results = await Promise.all(profilePromises);

    for (const { uid, docSnap } of results) {
      if (docSnap.exists()) {
        const data = docSnap.data();
        profilesMap.set(uid, {
          uid: uid,
          displayName: data.displayName || "WitWaves User", // Fallback displayName
          photoURL: data.photoURL, // Assuming photoURL might be stored in profile
        });
      } else {
         // Fallback if a profile document doesn't exist
        profilesMap.set(uid, {
          uid: uid,
          displayName: "WitWaves User",
          photoURL: undefined,
        });
      }
    }
  } catch (error) {
    console.error("Error fetching multiple author profiles:", error);
    // Populate with defaults for all UIDs if batch fetch fails, so cards don't break
    uniqueUids.forEach(uid => {
      if (!profilesMap.has(uid)) {
        profilesMap.set(uid, { uid, displayName: "WitWaves User", photoURL: undefined });
      }
    });
  }
  
  return profilesMap;
}


export async function updateUserProfileData(
  userId: string,
  data: Partial<Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>> & { displayName?: string }
): Promise<void> {
  if (!userId) throw new Error("User ID is required to update profile data.");
  const profileDocRef = doc(db, 'userProfiles', userId);
  try {
    const docSnap = await getDoc(profileDocRef);
    const dataToSave: any = { ...data }; // Use 'any' for dataToSave to allow flexible field updates

    // Clean up socialLinks: remove empty strings, convert to undefined
    if (dataToSave.socialLinks) {
        Object.keys(dataToSave.socialLinks).forEach(keyStr => {
            const key = keyStr as keyof SocialLinks;
            if (dataToSave.socialLinks[key] === '') {
                dataToSave.socialLinks[key] = undefined; // Or delete dataToSave.socialLinks[key];
            }
        });
    }
    
    dataToSave.updatedAt = serverTimestamp();

    if (docSnap.exists()) {
      await updateDoc(profileDocRef, dataToSave);
    } else {
      dataToSave.uid = userId; // Ensure uid is part of the initial document
      dataToSave.createdAt = serverTimestamp();
      await setDoc(profileDocRef, dataToSave);
    }
  } catch (error) {
    console.error("Error updating user profile data in Firestore:", error);
    throw error;
  }
}
