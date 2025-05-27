
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Settings2, Share2, X, Instagram, Linkedin, Briefcase, Link as LinkIcon, UserCircle, Loader2, Github } from 'lucide-react';
import BlogPostCard from '@/components/posts/blog-post-card';
import { getPosts, type Post } from '@/lib/posts';
import type { MockAuthor } from '@/lib/authors';
import { useAuth } from '@/contexts/auth-context';
// Removed Dialog, useActionState, updateUserProfileAction, FormState, useToast, Textarea, Input, Label
// as they were part of the editable profile feature.
// auth (from firebase/config) and updateFirebaseAuthProfile are also not needed here for the reverted state.

// Mock data for parts of the profile not in Firebase Auth or user-specific posts
// This data is used as a placeholder since profile editing is rolled back.
const staticProfileParts = {
  usernameHandle: '@username', // Example placeholder
  bio: "This is a placeholder bio. Edit profile functionality will be re-enabled in a future update.",
  stats: {
    following: 120,
    followers: '1.5k',
  },
  socialLinks: [
    { icon: X, href: '#', label: 'Twitter/X', present: true },
    { icon: Linkedin, href: '#', label: 'LinkedIn', present: true },
    { icon: Instagram, href: '#', label: 'Instagram', present: true },
    { icon: Github, href: '#', label: 'GitHub', present: true },
    { icon: Briefcase, href: '#', label: 'Portfolio', present: true },
  ],
};

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  // isLoadingProfile state can be removed if we are not fetching custom profile anymore
  // const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  // isEditModalOpen state removed

  // Effect to fetch user's posts (this part is largely the same)
  useEffect(() => {
    async function fetchAndFilterPosts() {
      if (!user?.uid) {
        setIsLoadingPosts(false);
        setUserPosts([]);
        return;
      }
      setIsLoadingPosts(true);
      try {
        const allPosts = await getPosts(); // Fetches from Firestore
        const filteredPosts = allPosts.filter(post => post.userId === user.uid);
        setUserPosts(filteredPosts);
      } catch (error) {
        console.error("Error fetching user posts:", error);
        setUserPosts([]);
      } finally {
        setIsLoadingPosts(false);
      }
    }

    if (user && !authLoading) {
      fetchAndFilterPosts();
    } else if (!authLoading) { // if !user and !authLoading
      setIsLoadingPosts(false);
      setUserPosts([]);
    }
  }, [user, authLoading]);
  
  // useEffect for editProfileState removed

  const displayName = user?.displayName || "User";
  const avatarUrl = user?.photoURL || `https://placehold.co/128x128.png?text=${displayName.substring(0,1).toUpperCase()}`;
  const fallbackAvatar = displayName?.substring(0, 2).toUpperCase() || 'U';
  // Custom profile details now come from staticProfileParts
  const usernameHandle = staticProfileParts.usernameHandle;
  const bio = staticProfileParts.bio;
  const profileSocialLinks = staticProfileParts.socialLinks.filter(link => link.present);


  const authorForCards: MockAuthor = {
    id: user?.uid || 'mock-user-id',
    name: displayName,
    role: 'Author',
    avatarUrl: user?.photoURL || `https://placehold.co/40x40.png?text=${displayName.substring(0,1).toUpperCase()}`,
  };

  if (authLoading) { // Removed isLoadingProfile from condition
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-3">Loading profile...</p></div>;
  }

  if (!user) {
     return (
      <div className="container mx-auto max-w-5xl px-4 py-12 text-center">
        <UserCircle className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Profile Page</h1>
        <p className="text-muted-foreground mb-6">Please <Link href="/login" className="text-primary hover:underline">log in</Link> to view your profile.</p>
      </div>
    );
  }
  
  // handleProfileFormSubmit removed

  return (
    <div className="w-full">
      <div className="container mx-auto max-w-5xl px-4 pt-8">
        <div className="bg-card p-6 md:p-8 rounded-lg shadow-xl relative -mt-10">
          <div className="flex flex-col md:flex-row items-center md:items-end md:space-x-6">
            <Avatar className="h-28 w-28 md:h-32 md:w-32 border-4 border-background shadow-lg -mt-16 md:-mt-20 shrink-0">
              <AvatarImage src={avatarUrl} alt={displayName} data-ai-hint="person face" />
              <AvatarFallback>{fallbackAvatar}</AvatarFallback>
            </Avatar>
            <div className="flex-1 mt-4 md:mt-0 text-center md:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">{displayName}</h1>
                  <p className="text-md text-muted-foreground">{usernameHandle}</p>
                </div>
                <div className="mt-3 sm:mt-0 flex space-x-2 justify-center md:justify-start">
                  {/* Edit Profile Dialog removed, button can be disabled or link to a placeholder */}
                  <Button variant="outline" size="sm" disabled>
                    <Settings2 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Share2 className="h-4 w-4" />
                    <span className="sr-only">Share Profile</span>
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex justify-center md:justify-start space-x-6 text-sm text-muted-foreground">
                <div><span className="font-semibold text-foreground">{staticProfileParts.stats.following}</span> Following</div>
                <div><span className="font-semibold text-foreground">{staticProfileParts.stats.followers}</span> Followers</div>
                <div><span className="font-semibold text-foreground">{isLoadingPosts ? <Loader2 className="h-4 w-4 animate-spin inline"/> : userPosts.length}</span> Posts</div>
              </div>
              <p className="mt-4 text-sm text-foreground leading-relaxed max-w-xl">
                {bio}
              </p>
              {profileSocialLinks.length > 0 && (
                <div className="mt-4 flex justify-center md:justify-start space-x-3">
                    {profileSocialLinks.map(link => (
                    <Link href={link.href!} key={link.label} target="_blank" rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        aria-label={link.label}
                    >
                        <link.icon className="h-5 w-5" />
                    </Link>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator className="my-8 container max-w-5xl" />

      <div className="container mx-auto max-w-5xl px-4">
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6 bg-muted/50 p-1 rounded-lg">
            <TabsTrigger value="posts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Posts</TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Activity</TabsTrigger>
            <TabsTrigger value="lists" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Lists</TabsTrigger>
            <TabsTrigger value="papers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Papers</TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            <div className="mb-4 flex space-x-1 border border-border rounded-lg p-1 bg-muted/50 w-fit">
              {["Published", "Drafts", "Archived"].map((tab, index) => (
                <Button
                  key={tab}
                  variant={index === 0 ? "default" : "ghost"}
                  size="sm"
                  className={index === 0 ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}
                  // onClick={() => alert(`${tab} clicked! (Filter not implemented yet)`)} // Kept as placeholder
                >
                  {tab}
                </Button>
              ))}
            </div>
            {isLoadingPosts ? (
              <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-3">Loading posts...</p></div>
            ) : userPosts.length === 0 ? (
              <p className="text-center text-muted-foreground text-lg py-12">
                You haven&apos;t published any posts yet. <Link href="/posts/new" className="text-primary hover:underline">Create one!</Link>
              </p>
            ) : (
              <div className="space-y-8">
                {userPosts.map((post) => (
                   <BlogPostCard key={post.id} post={post} author={authorForCards} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity">
            <Card className="p-6 min-h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">User activity (Saved items, Liked posts, Comments) will be displayed here.</p>
            </Card>
          </TabsContent>

          <TabsContent value="lists">
            <Card className="p-6 min-h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">User-created lists will be displayed here.</p>
            </Card>
          </TabsContent>

          <TabsContent value="papers">
            <Card className="p-6 min-h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">User's academic papers will be displayed here.</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Simple Card component for placeholder content in tabs
function Card({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-lg shadow-sm ${className}`}>
      {children}
    </div>
  );
}
