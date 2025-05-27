
'use server';

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp, collection, query, where, getDocs, deleteField } from 'firebase/firestore'; // Added deleteField
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
  displayName?: string; 
  bio?: string;
  socialLinks?: SocialLinks;
  createdAt?: string | any; 
  updatedAt?: string | any; 
  photoURL?: string; // Added to match potential usage in getAuthorProfilesForCards
}

export interface AuthorProfileForCard {
  uid: string;
  displayName: string;
  photoURL?: string;
}

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
        photoURL: data.photoURL,
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

  const uniqueUids = Array.from(new Set(uids.filter(uid => !!uid))); 

  if (uniqueUids.length === 0) {
    return profilesMap;
  }
  
  // Cap the number of UIDs to fetch in a single batch to avoid Firestore 'in' query limits (max 30 for 'in' queries)
  // For getDoc by ID, we can do more, but batching is good practice for larger numbers.
  // For this example, we'll fetch them individually with Promise.all, which is fine for moderate numbers.
  try {
    const profilePromises = uniqueUids.map(uid => 
      getDoc(doc(db, 'userProfiles', uid)).then(docSnap => ({ uid, docSnap }))
    );
    
    const results = await Promise.all(profilePromises);

    for (const { uid, docSnap } of results) {
      if (docSnap.exists()) {
        const data = docSnap.data();
        profilesMap.set(uid, {
          uid: uid,
          displayName: data.displayName || "WitWaves User", 
          photoURL: data.photoURL, 
        });
      } else {
        profilesMap.set(uid, {
          uid: uid,
          displayName: "WitWaves User",
          photoURL: undefined,
        });
      }
    }
  } catch (error) {
    console.error("Error fetching multiple author profiles:", error);
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
    
    // Create a mutable copy of the data to save.
    const dataToSave: { [key: string]: any } = { ...data };

    // Clean up socialLinks: remove any keys that have empty string values.
    // Firestore does not allow 'undefined' as a field value.
    // Empty strings ('') are allowed, but we'll treat them as "field to be removed/not set".
    if (dataToSave.socialLinks && typeof dataToSave.socialLinks === 'object') {
      const socialLinksCopy = { ...dataToSave.socialLinks }; // Work on a copy
      let hasActualLinks = false;
      for (const key of Object.keys(socialLinksCopy) as Array<keyof SocialLinks>) {
        // Check for empty string or explicitly undefined (though undefined should be less common now)
        if (socialLinksCopy[key] === '' || socialLinksCopy[key] === undefined || socialLinksCopy[key] === null) {
          delete socialLinksCopy[key]; 
        } else {
          hasActualLinks = true;
        }
      }
      
      if (hasActualLinks) {
        dataToSave.socialLinks = socialLinksCopy;
      } else {
        // If no valid links remain, remove the socialLinks field from the document.
        // For an existing document, use deleteField(). For a new one, just don't add it.
        if (docSnap.exists()) {
          dataToSave.socialLinks = deleteField(); 
        } else {
          delete dataToSave.socialLinks;
        }
      }
    }
    
    dataToSave.updatedAt = serverTimestamp();

    if (docSnap.exists()) {
      await updateDoc(profileDocRef, dataToSave);
    } else {
      dataToSave.uid = userId; 
      dataToSave.createdAt = serverTimestamp();
      // If dataToSave.socialLinks was deleted, it won't be set on a new doc, which is correct.
      await setDoc(profileDocRef, dataToSave);
    }
  } catch (error) {
    console.error("Error updating user profile data in Firestore:", error);
    throw error; 
  }
}
