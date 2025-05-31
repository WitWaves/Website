
'use server';

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp, collection, query, where, getDocs, deleteField } from 'firebase/firestore';
import { db } from './firebase/config';
import type { Post } from './posts';
import { getPost } from './posts';

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
  console.log(`[getUserProfile] Fetching profile for userId: ${userId}`);
  try {
    const profileDocRef = doc(db, 'userProfiles', userId);
    const docSnap = await getDoc(profileDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log(`[getUserProfile] Profile found for ${userId}:`, data);
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
    console.log(`[getUserProfile] User profile not found in Firestore for userId: ${userId}`);
    return null;
  } catch (error) {
    console.error(`[getUserProfile] Error fetching user profile for userId ${userId}:`, error);
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

  console.log('[getAuthorProfilesForCards] Fetching profiles for UIDs:', uniqueUids);
  try {
    const profilePromises = uniqueUids.map(uid =>
      getDoc(doc(db, 'userProfiles', uid)).then(docSnap => ({ uid, docSnap }))
    );

    const results = await Promise.all(profilePromises);

    for (const { uid, docSnap } of results) {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!data.displayName) {
          console.warn(`[getAuthorProfilesForCards] Author profile for UID ${uid} exists but displayName is missing. Defaulting to 'WitWaves User'.`);
        }
        profilesMap.set(uid, {
          uid: uid,
          displayName: data.displayName || "WitWaves User",
          photoURL: data.photoURL,
        });
      } else {
        console.warn(`[getAuthorProfilesForCards] Author profile not found in Firestore for UID ${uid}. Defaulting to 'WitWaves User'.`);
        profilesMap.set(uid, {
          uid: uid,
          displayName: "WitWaves User",
          photoURL: undefined,
        });
      }
    }
  } catch (error) {
    console.error("[getAuthorProfilesForCards] Error fetching multiple author profiles:", error);
    uniqueUids.forEach(uid => {
      if (!profilesMap.has(uid)) {
        console.warn(`[getAuthorProfilesForCards] Fallback: Author profile for UID ${uid} could not be fetched due to overall error. Defaulting to 'WitWaves User'.`);
        profilesMap.set(uid, { uid, displayName: "WitWaves User", photoURL: undefined });
      }
    });
  }
  console.log('[getAuthorProfilesForCards] Resulting profilesMap:', profilesMap);
  return profilesMap;
}


export async function updateUserProfileData(
  userId: string,
  data: Partial<Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  if (!userId) throw new Error("User ID is required to update profile data.");
  const profileDocRef = doc(db, 'userProfiles', userId);

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
      dataToSave.socialLinks = deleteField();
    }
  } else if (dataToSave.socialLinks === undefined) {
    delete dataToSave.socialLinks;
  }

  if (dataToSave.photoURL === '') {
    dataToSave.photoURL = deleteField();
  } else if (dataToSave.photoURL === undefined) {
    delete dataToSave.photoURL;
  }

  Object.keys(dataToSave).forEach(key => {
    if (dataToSave[key] === undefined) {
      delete dataToSave[key];
    }
  });

  dataToSave.updatedAt = serverTimestamp();
  console.log(`[updateUserProfileData] Preparing to update/set profile for ${userId} with:`, dataToSave);

  try {
    const docSnap = await getDoc(profileDocRef);
    if (docSnap.exists()) {
      await updateDoc(profileDocRef, dataToSave);
      console.log(`[updateUserProfileData] User profile UPDATED for userId: ${userId}`);
    } else {
      dataToSave.uid = userId;
      dataToSave.createdAt = serverTimestamp();
      await setDoc(profileDocRef, dataToSave);
      console.log(`[updateUserProfileData] User profile CREATED for userId: ${userId}`);
    }
  } catch (error) {
    console.error(`[updateUserProfileData] Error updating/setting user profile data for userId ${userId} in Firestore:`, error);
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
  if (!userId) {
    console.log('[getSavedPostsDetailsForUser] No userId provided. Returning empty array.');
    return [];
  }
  console.log(`[getSavedPostsDetailsForUser] Attempting to fetch saved post references for userId: ${userId}`);
  try {
    const savedPostsColRef = collection(db, 'userProfiles', userId, 'savedPosts');
    const q = query(savedPostsColRef, orderBy('savedAt', 'desc'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log(`[getSavedPostsDetailsForUser] No saved post references found for userId: ${userId}. Returning empty array.`);
      return [];
    }
    console.log(`[getSavedPostsDetailsForUser] Found ${snapshot.docs.length} saved post references for userId: ${userId}.`);

    const postFetchPromises = snapshot.docs.map(async (docSnap) => {
      const postId = docSnap.id;
      const savedPostData = docSnap.data();
      console.log(`[getSavedPostsDetailsForUser] Processing saved post reference: ID = ${postId}, Data =`, savedPostData);
      if (!postId) {
          console.warn(`[getSavedPostsDetailsForUser] Found a saved post document without an ID (or ID is the post ID itself). This is expected if docSnap.id is the postId.`);
      }
      try {
        const post = await getPost(postId);
        if (post) {
          console.log(`[getSavedPostsDetailsForUser] Successfully fetched full details for postId: ${postId}`);
          return post;
        } else {
          console.warn(`[getSavedPostsDetailsForUser] Full details for postId ${postId} not found (getPost returned undefined). It might have been deleted or rules prevent access.`);
          return undefined;
        }
      } catch (err) {
        console.error(`[getSavedPostsDetailsForUser] Error fetching full details for postId ${postId}:`, err);
        return undefined;
      }
    });
    
    const postsWithDetails = (await Promise.all(postFetchPromises)).filter(post => post !== undefined) as Post[];
    
    console.log(`[getSavedPostsDetailsForUser] Successfully fetched full details for ${postsWithDetails.length} out of ${snapshot.docs.length} saved posts for userId: ${userId}`);
    return postsWithDetails;

  } catch (error: any) {
    console.error(`[getSavedPostsDetailsForUser] CRITICAL ERROR fetching saved post references for user ${userId}:`, error);
    if (error.code === 'failed-precondition' && error.message.includes('requires an index')) {
        console.error(
          `[getSavedPostsDetailsForUser] Firestore query failed because a composite index is missing. 
           The query was orderBy('savedAt', 'desc') on collection 'userProfiles/${userId}/savedPosts'.
           Firestore usually provides a link in the error to create the index. If not, you'll need:
           Collection ID: savedPosts (as a subcollection of userProfiles)
           Fields: savedAt (Descending).
           Error details: ${error.message}`
        );
    } else if (error.code === 'permission-denied') {
        console.error(
          `[getSavedPostsDetailsForUser] Firestore permission denied. Check security rules for 'userProfiles/${userId}/savedPosts'.
           User ${userId} needs read access to their own savedPosts subcollection.`
        );
    }
    return []; // Return empty array on any error to prevent page crash
  }
}
