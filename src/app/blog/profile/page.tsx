
'use client'; // Make this a client component to use hooks

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Settings2, Share2, X, Instagram, Linkedin, Briefcase, Link as LinkIcon, UserCircle } from 'lucide-react';
import BlogPostCard from '@/components/posts/blog-post-card';
import { getPosts, type Post } from '@/lib/posts';
import type { MockAuthor } from '@/lib/authors'; // Keep for BlogPostCard if needed for author prop
import { useAuth } from '@/contexts/auth-context'; // Import useAuth

// Mock data for parts of the profile not in Firebase Auth by default
// This would eventually come from a Firestore user profile collection
const staticProfileDetails = {
  handle: '@fayeerzk', // Example handle
  bio: 'Exploring the intersections of technology, art, and philosophy. Avid reader, lifelong learner, and occasional writer. Sharing thoughts and discoveries.',
  stats: {
    following: 45, // Mock data
    followers: '4k', // Mock data
    // Posts count will be dynamic
  },
  socialLinks: [
    { icon: X, href: '#', label: 'Twitter/X' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Briefcase, href: '#', label: 'Portfolio/Work' },
  ],
};

const mockProfileUserId = 'user-fayeerzk-id'; // Same ID used in postsStore for demo

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      setIsLoadingPosts(true);
      const fetchedPosts = await getPosts();
      setAllPosts(fetchedPosts);
      setIsLoadingPosts(false);
    }
    fetchPosts();
  }, []);

  useEffect(() => {
    if (user && allPosts.length > 0) {
      // Filter posts for the logged-in user.
      // For demonstration, we'll also check against mockProfileUserId if user.uid doesn't match any
      // In a real app, posts would reliably have the correct user.uid
      const filtered = allPosts.filter(post => post.userId === user.uid || post.userId === mockProfileUserId);
      setUserPosts(filtered);
    } else if (!user && allPosts.length > 0) {
      // If no user is logged in, or for broader demo, show posts by mockProfileUserId
      setUserPosts(allPosts.filter(post => post.userId === mockProfileUserId));
    } else {
      setUserPosts([]);
    }
  }, [user, allPosts]);

  const displayName = user?.displayName || "Fayee. ZRF"; // Fallback to mock
  const avatarUrl = user?.photoURL || 'https://placehold.co/128x128.png?text=FZ';
  const fallbackAvatar = displayName?.substring(0, 2).toUpperCase() || 'U';

  // This author object is for BlogPostCard, which expects a MockAuthor shape
  // In a real app, you might have a more unified UserProfile type
  const authorForCards: MockAuthor = {
    id: user?.uid || mockProfileUserId,
    name: displayName,
    role: 'Author', // Generic role
    avatarUrl: user?.photoURL || 'https://placehold.co/40x40.png?text=AU',
  };


  if (authLoading || isLoadingPosts) {
    return <div className="flex justify-center items-center h-screen"><p>Loading profile...</p></div>;
  }

  return (
    <div className="w-full">
      {/* Profile Info Section */}
      <div className="container mx-auto max-w-5xl px-4 pt-8">
        <div className="flex flex-col md:flex-row items-center md:items-end md:space-x-6 bg-card p-6 rounded-lg shadow-lg">
          <Avatar className="h-28 w-28 border-4 border-background shadow-md">
            <AvatarImage src={avatarUrl} alt={displayName} data-ai-hint="person face"/>
            <AvatarFallback>{fallbackAvatar}</AvatarFallback>
          </Avatar>
          <div className="flex-1 mt-4 md:mt-0 text-center md:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">{displayName}</h1>
                <p className="text-md text-muted-foreground">{staticProfileDetails.handle}</p>
              </div>
              <div className="mt-3 sm:mt-0 flex space-x-2 justify-center md:justify-start">
                <Button variant="outline" size="sm" onClick={() => alert('Edit profile clicked! (Not implemented yet)')}>
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
              <div><span className="font-semibold text-foreground">{staticProfileDetails.stats.following}</span> Following</div>
              <div><span className="font-semibold text-foreground">{staticProfileDetails.stats.followers}</span> Followers</div>
              <div><span className="font-semibold text-foreground">{userPosts.length}</span> Posts</div>
            </div>
            <p className="mt-4 text-sm text-foreground leading-relaxed max-w-xl">
              {staticProfileDetails.bio}
            </p>
            <div className="mt-4 flex justify-center md:justify-start space-x-3">
              {staticProfileDetails.socialLinks.map(link => (
                <Link href={link.href} key={link.label} target="_blank" rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label={link.label}
                >
                  <link.icon className="h-5 w-5" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Separator className="my-8 container max-w-5xl" />

      {/* Tabs Section */}
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
                  onClick={() => alert(`${tab} clicked! (Filter not implemented yet)`)}
                >
                  {tab}
                </Button>
              ))}
            </div>
            {userPosts.length === 0 ? (
              <p className="text-center text-muted-foreground text-lg py-12">
                {user ? "You haven't published any posts yet." : "No posts found for this user."}
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
            <div className="mb-4 flex space-x-1 border border-border rounded-lg p-1 bg-muted/50 w-fit">
              {["Saved", "Liked", "Comments"].map((tab, index) => (
                <Button
                  key={tab}
                  variant={index === 0 ? "default" : "ghost"}
                  size="sm"
                  className={index === 0 ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}
                  onClick={() => alert(`${tab} clicked! (Not implemented yet)`)}
                >
                  {tab}
                </Button>
              ))}
            </div>
            <Card className="p-6 min-h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">User activity (Saved items, Liked posts, Comments) will be displayed here.</p>
            </Card>
          </TabsContent>

          <TabsContent value="lists">
             <div className="mb-4 flex justify-between items-center">
                <p className="text-lg font-semibold text-foreground">My Curated Lists</p>
                <Button variant="outline" size="sm" onClick={() => alert('Create new list! (Not implemented yet)')}>Create New List</Button>
            </div>
            <Card className="p-6 min-h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">User-created lists (e.g., "To know", "To learn") will be displayed here.</p>
            </Card>
          </TabsContent>

          <TabsContent value="papers">
            <div className="mb-4 flex justify-between items-center">
                <p className="text-lg font-semibold text-foreground">My Publications</p>
                <Button variant="outline" size="sm" onClick={() => alert('Add new paper! (Not implemented yet)')}>Add New Paper</Button>
            </div>
            <Card className="p-6 min-h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">User's academic papers or other publications will be displayed here.</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Simple Card component to wrap content for empty tabs for now
function Card({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-lg shadow-sm ${className}`}>
      {children}
    </div>
  );
}
