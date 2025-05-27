
'use server';

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp, collection, query, where, getDocs, deleteField } from 'firebase/firestore'; 
import { db } from './firebase/config';
import type { Post } from './posts'; // Import Post type
import { getPost } from './posts';   // Import getPost to fetch post details

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
  photoURL?: string; 
  socialLinks?: SocialLinks;
  createdAt?: string | any; 
  updatedAt?: string | any; 
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
        photoURL: data.photoURL, 
        socialLinks: data.socialLinks || {},
        createdAt: formatProfileTimestamp(data.createdAt),
        updatedAt: formatProfileTimestamp(data.updatedAt),
      } as UserProfile;
    }
    console.log(`User profile not found for userId: ${userId}`);
    return null;
  } catch (error) {
    console.error(`Error fetching user profile for userId ${userId}:`, error);
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
  
  try {
    const profilePromises = uniqueUids.map(uid => 
      getDoc(doc(db, 'userProfiles', uid)).then(docSnap => ({ uid, docSnap }))
    );
    
    const results = await Promise.all(profilePromises);

    for (const { uid, docSnap } of results) {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!data.displayName) {
          console.warn(`Author profile for UID ${uid} exists but displayName is missing. Defaulting to 'WitWaves User'. Log from getAuthorProfilesForCards.`);
        }
        profilesMap.set(uid, {
          uid: uid,
          displayName: data.displayName || "WitWaves User", 
          photoURL: data.photoURL, 
        });
      } else {
        console.warn(`Author profile not found in Firestore for UID ${uid}. Defaulting to 'WitWaves User'. Log from getAuthorProfilesForCards.`);
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
        console.warn(`Fallback: Author profile for UID ${uid} could not be fetched due to overall error. Defaulting to 'WitWaves User'. Log from getAuthorProfilesForCards.`);
        profilesMap.set(uid, { uid, displayName: "WitWaves User", photoURL: undefined });
      }
    });
  }
  
  return profilesMap;
}


export async function updateUserProfileData(
  userId: string,
  data: Partial<Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>> & { displayName?: string; photoURL?: string } 
): Promise<void> {
  if (!userId) throw new Error("User ID is required to update profile data.");
  const profileDocRef = doc(db, 'userProfiles', userId);
  try {
    const docSnap = await getDoc(profileDocRef);
    
    const dataToSave: { [key: string]: any } = { ...data };

    if (dataToSave.socialLinks && typeof dataToSave.socialLinks === 'object') {
      const socialLinksCopy = { ...dataToSave.socialLinks }; 
      let hasActualLinks = false;
      for (const key of Object.keys(socialLinksCopy) as Array<keyof SocialLinks>) {
        if (socialLinksCopy[key] === '' || socialLinksCopy[key] === undefined || socialLinksCopy[key] === null) {
          delete socialLinksCopy[key]; 
        } else {
          hasActualLinks = true;
        }
      }
      
      if (hasActualLinks) {
        dataToSave.socialLinks = socialLinksCopy;
      } else {
        if (docSnap.exists() && docSnap.data()?.socialLinks) { 
          dataToSave.socialLinks = deleteField(); 
        } else {
          delete dataToSave.socialLinks; 
        }
      }
    }

    if (dataToSave.photoURL === '') {
        if (docSnap.exists() && docSnap.data()?.photoURL) {
             dataToSave.photoURL = deleteField();
        } else {
            delete dataToSave.photoURL;
        }
    } else if (dataToSave.photoURL === undefined) { 
        delete dataToSave.photoURL;
    }
    
    dataToSave.updatedAt = serverTimestamp();

    if (docSnap.exists()) {
      await updateDoc(profileDocRef, dataToSave);
      console.log(`User profile updated for userId: ${userId} with data:`, dataToSave);
    } else {
      dataToSave.uid = userId; 
      dataToSave.createdAt = serverTimestamp();
      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === undefined) {
          delete dataToSave[key];
        }
      });
      await setDoc(profileDocRef, dataToSave);
      console.log(`User profile created for userId: ${userId} with data:`, dataToSave);
    }
  } catch (error) {
    console.error(`Error updating user profile data for userId ${userId} in Firestore:`, error);
    throw error; 
  }
}

export async function isPostSavedByUser(userId: string, postId: string): Promise<boolean> {
  if (!userId || !postId) return false;
  try {
    const savedPostDocRef = doc(db, 'userProfiles', userId, 'savedPosts', postId);
    const docSnap = await getDoc(savedPostDocRef);
    return docSnap.exists();
  } catch (error) {
    console.error(`Error checking if post ${postId} is saved by user ${userId}:`, error);
    return false;
  }
}

export async function getSavedPostsDetailsForUser(userId: string): Promise<Post[]> {
  if (!userId) return [];
  try {
    const savedPostsColRef = collection(db, 'userProfiles', userId, 'savedPosts');
    const q = query(savedPostsColRef, orderBy('savedAt', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [];
    }

    const postPromises = snapshot.docs.map(docSnap => getPost(docSnap.id)); // docSnap.id is the postId
    const posts = (await Promise.all(postPromises)).filter(post => post !== undefined) as Post[];
    
    return posts;
  } catch (error) {
    console.error(`Error fetching saved posts for user ${userId}:`, error);
    return [];
  }
}
