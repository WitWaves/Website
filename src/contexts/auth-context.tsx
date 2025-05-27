
'use client';

import type { User as FirebaseUser, IdTokenResult } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '@/lib/firebase/config';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup, // Keep for potential future use or reference, but we'll use redirect
  signInWithRedirect, // Added
  getRedirectResult // Added
} from 'firebase/auth';
import { useRouter } from 'next/navigation';

// Define a more specific user type if needed, including roles or custom claims
export interface User extends FirebaseUser {
  // Add any custom properties like idToken or roles if you parse them
  // For example:
  // idTokenResult?: IdTokenResult;
  // isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUpWithEmail: (email: string, pass: string) => Promise<any>; // Consider more specific error handling/return types
  signInWithEmail: (email: string, pass: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser as User);
        // Redirect to home if user is found and they are on login/signup
        // This check might be better handled on login/signup pages themselves
        // if (router.pathname === '/login' || router.pathname === '/signup') {
        //   router.push('/');
        // }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    
    // Check for redirect result
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          setUser(result.user as User);
          // No explicit router.push('/') here, onAuthStateChanged should handle it
          // or if already handled by onAuthStateChanged, this is fine.
        }
        setLoading(false); // Ensure loading is set to false after processing
      })
      .catch((error) => {
        // Handle Errors here.
        console.error("Error getting redirect result:", error);
        // An error code of 'auth/account-exists-with-different-credential'
        // can be handled by linking the user's accounts here.
        setLoading(false); // Ensure loading is set to false after processing
      });

    return () => unsubscribe();
  }, [router]); // Added router to dependency array if used inside for pathname checks

  const signUpWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      setUser(userCredential.user as User);
      router.push('/'); // Redirect after sign up
      return userCredential;
    } catch (error) {
      console.error("Error signing up:", error);
      throw error; // Rethrow to be caught by the form
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      setUser(userCredential.user as User);
      router.push('/'); // Redirect after sign in
      return userCredential;
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      // Using signInWithRedirect instead of signInWithPopup
      await signInWithRedirect(auth, provider);
      // For signInWithRedirect, the result is handled by getRedirectResult
      // and onAuthStateChanged. No immediate user object is returned here.
      // The setLoading(false) will be effectively handled after redirect.
    } catch (error) {
      console.error("Error initiating Google sign in with redirect:", error);
      setLoading(false); // Set loading false if initiation fails
      throw error;
    }
    // setLoading(false) is tricky here due to redirect.
    // It's better handled by the effect that processes getRedirectResult.
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      router.push('/login'); // Redirect to login after logout
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUpWithEmail, signInWithEmail, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
