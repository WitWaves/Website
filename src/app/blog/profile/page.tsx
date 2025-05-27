
'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Settings2, Share2, X, Instagram, Linkedin, Briefcase, Link as LinkIcon, UserCircle, Loader2, Github } from 'lucide-react';
import BlogPostCard from '@/components/posts/blog-post-card';
import { getPosts, type Post } from '@/lib/posts';
import type { MockAuthor } from '@/lib/authors'; // For card, can be adapted
import { useAuth } from '@/contexts/auth-context';
import { getUserProfile, type UserProfile as CustomUserProfileType, type SocialLinks } from '@/lib/userProfile';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useActionState } from 'react';
import { updateUserProfileAction, type FormState } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { updateProfile as updateFirebaseAuthProfile } from 'firebase/auth'; // For client-side auth profile update

// Mock data for parts of the profile not in Firebase Auth or Firestore by default
const staticProfileParts = { // These are just fallbacks or for display elements not yet in DB
  stats: {
    following: 45, // These would come from a follow system
    followers: '4k',
  },
};

const initialSocialLinks: SocialLinks = {
  twitter: '',
  linkedin: '',
  instagram: '',
  portfolio: '',
  github: '',
};

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [customProfile, setCustomProfile] = useState<CustomUserProfileType | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form state for the edit profile dialog
  const [editProfileState, editProfileAction, isEditProfilePending] = useActionState(updateUserProfileAction, undefined);

  // Effect to fetch custom profile data
  useEffect(() => {
    async function fetchCustomProfile() {
      if (user?.uid) {
        setIsLoadingProfile(true);
        const profileData = await getUserProfile(user.uid);
        setCustomProfile(profileData);
        setIsLoadingProfile(false);
      } else {
        setCustomProfile(null);
        setIsLoadingProfile(false);
      }
    }
    if (!authLoading) { // Only fetch if auth is not loading
        fetchCustomProfile();
    }
  }, [user, authLoading]);

  // Effect to fetch user's posts
  useEffect(() => {
    async function fetchAndFilterPosts() {
      if (!user?.uid) {
        setIsLoadingPosts(false);
        setUserPosts([]);
        return;
      }
      setIsLoadingPosts(true);
      try {
        const allPosts = await getPosts();
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
    } else if (!authLoading) {
      setIsLoadingPosts(false);
      setUserPosts([]);
    }
  }, [user, authLoading]);
  
  // Effect to handle form submission result from server action
  useEffect(() => {
    if (editProfileState?.success) {
      toast({
        title: 'Success',
        description: editProfileState.message,
      });
      setIsEditModalOpen(false); // Close dialog on success
      // Optionally re-fetch profile data if not handled by revalidation
      if (user?.uid) getUserProfile(user.uid).then(setCustomProfile);
    } else if (editProfileState?.message && !editProfileState.success) {
      toast({
        title: 'Error',
        description: editProfileState.message,
        variant: 'destructive',
      });
    }
  }, [editProfileState, toast, user?.uid]);


  const displayName = user?.displayName || "User";
  const avatarUrl = user?.photoURL || `https://placehold.co/128x128.png?text=${displayName.substring(0,1).toUpperCase()}`;
  const fallbackAvatar = displayName?.substring(0, 2).toUpperCase() || 'U';
  const usernameHandle = customProfile?.username ? `@${customProfile.username}` : (user?.email || 'No handle');
  const bio = customProfile?.bio || "This user hasn't set a bio yet.";
  const profileSocialLinks = customProfile?.socialLinks || {};

  const authorForCards: MockAuthor = {
    id: user?.uid || 'mock-user-id',
    name: displayName,
    role: 'Author', // This could come from custom profile too
    avatarUrl: user?.photoURL || `https://placehold.co/40x40.png?text=${displayName.substring(0,1).toUpperCase()}`,
  };

  if (authLoading || (user && isLoadingProfile)) { // Show loading if auth is loading OR if user exists and custom profile is loading
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
  
  const socialLinksToDisplay = [
    { icon: X, href: profileSocialLinks.twitter, label: 'Twitter/X', present: !!profileSocialLinks.twitter },
    { icon: Linkedin, href: profileSocialLinks.linkedin, label: 'LinkedIn', present: !!profileSocialLinks.linkedin },
    { icon: Instagram, href: profileSocialLinks.instagram, label: 'Instagram', present: !!profileSocialLinks.instagram },
    { icon: LinkIcon, href: profileSocialLinks.portfolio, label: 'Portfolio', present: !!profileSocialLinks.portfolio },
    { icon: Github, href: profileSocialLinks.github, label: 'GitHub', present: !!profileSocialLinks.github },
  ].filter(link => link.present);


  const handleProfileFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.append('userId', user.uid); // Ensure userId is part of form data for the action

    const newDisplayName = formData.get('displayName') as string;

    // Client-side update of Firebase Auth displayName if changed
    if (newDisplayName && newDisplayName !== user.displayName && firebaseAuthService.currentUser) {
      try {
        await updateFirebaseAuthProfile(firebaseAuthService.currentUser, { displayName: newDisplayName });
        // Optionally update local user state if your auth context doesn't auto-refresh displayName
        toast({ title: 'Display Name Updated in Auth', description: 'Firebase Auth profile also updated.' });
      } catch (authError) {
        console.error("Error updating Firebase Auth profile:", authError);
        toast({ title: 'Auth Update Error', description: `Could not update display name in Firebase Auth: ${ (authError as Error).message }`, variant: 'destructive'});
        // Decide if you want to stop the Firestore update if this fails
      }
    }
    editProfileAction(formData);
  };


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
                  <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings2 className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                        <DialogDescription>
                          Make changes to your profile here. Click save when you&apos;re done.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleProfileFormSubmit} className="space-y-4 py-4">
                         {/* Hidden userId input */}
                        <input type="hidden" name="userId" value={user.uid} />
                        
                        <div>
                          <Label htmlFor="displayName">Display Name</Label>
                          <Input id="displayName" name="displayName" defaultValue={user.displayName || ''} />
                           {editProfileState?.errors?.displayName && <p className="text-sm text-destructive mt-1">{editProfileState.errors.displayName.join(', ')}</p>}
                        </div>
                        <div>
                          <Label htmlFor="username">Username (@handle)</Label>
                          <Input id="username" name="username" placeholder="your_unique_handle" defaultValue={customProfile?.username || ''} />
                          {editProfileState?.errors?.username && <p className="text-sm text-destructive mt-1">{editProfileState.errors.username.join(', ')}</p>}
                        </div>
                        <div>
                          <Label htmlFor="bio">Bio</Label>
                          <Textarea id="bio" name="bio" placeholder="Tell us a little about yourself." defaultValue={customProfile?.bio || ''} />
                          {editProfileState?.errors?.bio && <p className="text-sm text-destructive mt-1">{editProfileState.errors.bio.join(', ')}</p>}
                        </div>
                        
                        <fieldset className="space-y-2 border p-3 rounded-md">
                            <legend className="text-sm font-medium px-1">Social Links</legend>
                            <div>
                                <Label htmlFor="socialLinks_twitter">Twitter/X URL</Label>
                                <Input id="socialLinks_twitter" name="socialLinks_twitter" type="url" placeholder="https://twitter.com/yourhandle" defaultValue={customProfile?.socialLinks?.twitter || ''} />
                                {editProfileState?.errors?.socialLinks_twitter && <p className="text-sm text-destructive mt-1">{editProfileState.errors.socialLinks_twitter.join(', ')}</p>}
                            </div>
                            <div>
                                <Label htmlFor="socialLinks_linkedin">LinkedIn URL</Label>
                                <Input id="socialLinks_linkedin" name="socialLinks_linkedin" type="url" placeholder="https://linkedin.com/in/yourprofile" defaultValue={customProfile?.socialLinks?.linkedin || ''} />
                                {editProfileState?.errors?.socialLinks_linkedin && <p className="text-sm text-destructive mt-1">{editProfileState.errors.socialLinks_linkedin.join(', ')}</p>}
                            </div>
                             <div>
                                <Label htmlFor="socialLinks_instagram">Instagram URL</Label>
                                <Input id="socialLinks_instagram" name="socialLinks_instagram" type="url" placeholder="https://instagram.com/yourprofile" defaultValue={customProfile?.socialLinks?.instagram || ''} />
                                {editProfileState?.errors?.socialLinks_instagram && <p className="text-sm text-destructive mt-1">{editProfileState.errors.socialLinks_instagram.join(', ')}</p>}
                            </div>
                            <div>
                                <Label htmlFor="socialLinks_github">GitHub URL</Label>
                                <Input id="socialLinks_github" name="socialLinks_github" type="url" placeholder="https://github.com/yourusername" defaultValue={customProfile?.socialLinks?.github || ''} />
                                {editProfileState?.errors?.socialLinks_github && <p className="text-sm text-destructive mt-1">{editProfileState.errors.socialLinks_github.join(', ')}</p>}
                            </div>
                            <div>
                                <Label htmlFor="socialLinks_portfolio">Portfolio/Website URL</Label>
                                <Input id="socialLinks_portfolio" name="socialLinks_portfolio" type="url" placeholder="https://yourportfolio.com" defaultValue={customProfile?.socialLinks?.portfolio || ''} />
                                {editProfileState?.errors?.socialLinks_portfolio && <p className="text-sm text-destructive mt-1">{editProfileState.errors.socialLinks_portfolio.join(', ')}</p>}
                            </div>
                        </fieldset>
                        {editProfileState?.errors?.form && <p className="text-sm text-destructive mt-1">{editProfileState.errors.form.join(', ')}</p>}

                        <DialogFooter>
                          <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button type="submit" disabled={isEditProfilePending}>
                            {isEditProfilePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Changes'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
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
              {socialLinksToDisplay.length > 0 && (
                <div className="mt-4 flex justify-center md:justify-start space-x-3">
                    {socialLinksToDisplay.map(link => (
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
                  onClick={() => alert(`${tab} clicked! (Filter not implemented yet)`)}
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
