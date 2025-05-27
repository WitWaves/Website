
'use client';

import { useEffect, useState, useActionState, useTransition, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings2, Share2, X, Instagram, Linkedin, Briefcase, UserCircle, Loader2, Github, Link as LinkIcon, UploadCloud, Heart, MessageSquareIcon, Bookmark as BookmarkIcon } from 'lucide-react'; // Added icons
import BlogPostCard from '@/components/posts/blog-post-card';
import PostCard from '@/components/posts/post-card'; // For saved posts
import { getPosts, type Post } from '@/lib/posts';
import type { AuthorProfileForCard } from '@/lib/userProfile';
import { useAuth } from '@/contexts/auth-context';
import { updateUserProfileAction, type FormState } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { getUserProfile, getSavedPostsDetailsForUser, type UserProfile, type SocialLinks } from '@/lib/userProfile'; // Added getSavedPostsDetailsForUser
import { auth, storage } from '@/lib/firebase/config'; 
import { updateProfile as updateFirebaseAuthProfile } from 'firebase/auth';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; 

const socialIcons: Record<keyof SocialLinks, typeof LinkIcon> = {
    twitter: X,
    linkedin: Linkedin,
    instagram: Instagram,
    portfolio: Briefcase,
    github: Github,
};

const staticProfileStats = {
    following: 0,
    followers: '0',
};


export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [customProfile, setCustomProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [editProfileState, handleProfileFormSubmit, isEditPending] = useActionState(
    user && user.uid ? updateUserProfileAction.bind(null, user.uid) : async () => ({ message: "User not available for action binding.", success: false }),
    undefined
  );
  const [isEditPendingTransition, startEditTransition] = useTransition();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for Activity Tab
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [isLoadingSavedPosts, setIsLoadingSavedPosts] = useState(false);
  const [activeActivityTab, setActiveActivityTab] = useState<string | null>(null);


  useEffect(() => {
    async function fetchAndFilterPosts() {
      if (authLoading) {
        console.log('ProfilePage: Auth is loading, deferring post fetch.');
        return;
      }
      if (!user?.uid) {
        console.log('ProfilePage: No user or user.uid, clearing posts.');
        setIsLoadingPosts(false);
        setUserPosts([]);
        return;
      }
      setIsLoadingPosts(true);
      console.log('ProfilePage: Fetching posts for user:', user.uid);
      try {
        const allPosts = await getPosts(); // Fetches ALL posts from Firestore
        console.log('ProfilePage: All posts fetched from DB:', allPosts);

        const filteredPosts = allPosts.filter(post => {
            const matches = post.userId === user.uid;
            // console.log(`Post ID: ${post.id}, Post UserID: ${post.userId}, Current UserID: ${user.uid}, Matches: ${matches}`);
            return matches;
        });
        console.log('ProfilePage: Filtered posts for current user:', filteredPosts);
        setUserPosts(filteredPosts);
      } catch (error) {
        console.error("Error fetching user posts:", error);
        setUserPosts([]);
      } finally {
        setIsLoadingPosts(false);
      }
    }

    fetchAndFilterPosts();
  }, [user, authLoading]);

  useEffect(() => {
    async function fetchCustomProfile() {
      if (authLoading) {
          console.log('ProfilePage: Auth is loading, deferring custom profile fetch.');
          return;
      }
      if (user?.uid) {
        setIsLoadingProfile(true);
        console.log('ProfilePage: Fetching custom profile for user:', user.uid);
        const profileDataFromDb = await getUserProfile(user.uid);
        console.log('ProfilePage: Custom profile data from DB:', profileDataFromDb);
        if (profileDataFromDb) {
          setCustomProfile(profileDataFromDb);
        } else {
          console.log('ProfilePage: No custom profile in DB, creating fallback from Auth data.');
          setCustomProfile({
            uid: user.uid,
            displayName: user.displayName || "User",
            photoURL: user.photoURL || undefined,
            username: user.email?.split('@')[0],
            bio: "",
            socialLinks: {},
          });
        }
        setIsLoadingProfile(false);
      } else {
        console.log('ProfilePage: No user or user.uid, clearing custom profile.');
        setIsLoadingProfile(false);
        setCustomProfile(null);
      }
    }
    fetchCustomProfile();
  }, [user, authLoading]);

  useEffect(() => {
    if (editProfileState?.success) {
      toast({
        title: 'Profile Updated',
        description: editProfileState.message,
      });
      setIsEditModalOpen(false);
      setSelectedFile(null); 
      setPreviewUrl(null);
      if (user?.uid) {
        console.log('ProfilePage: Re-fetching custom profile after successful edit for user:', user.uid);
        getUserProfile(user.uid).then(profileDataFromDb => {
            console.log('ProfilePage: Re-fetched custom profile data:', profileDataFromDb);
            if (profileDataFromDb) {
                setCustomProfile(profileDataFromDb);
            } else {
                console.log('ProfilePage: Re-fetched custom profile is null, creating fallback from Auth data.');
                setCustomProfile({ 
                    uid: user.uid,
                    displayName: user.displayName || "User",
                    photoURL: user.photoURL || undefined,
                    username: user.email?.split('@')[0],
                    bio: "",
                    socialLinks: {},
                });
            }
        });
      }
    } else if (editProfileState?.message && !editProfileState.success) {
      toast({
        title: 'Update Failed',
        description: editProfileState.errors ? JSON.stringify(editProfileState.errors) : editProfileState.message,
        variant: 'destructive',
      });
    }
  }, [editProfileState, toast, user]);

  // Fetch saved posts when activity tab is opened
  useEffect(() => {
    if (activeActivityTab === 'activity' && user?.uid) { // Assuming 'activity' tab is the one to show saved posts for now
      setIsLoadingSavedPosts(true);
      getSavedPostsDetailsForUser(user.uid)
        .then(data => {
          setSavedPosts(data);
          setIsLoadingSavedPosts(false);
        })
        .catch(err => {
          console.error("Error fetching saved posts:", err);
          toast({ title: "Error", description: "Could not load saved posts.", variant: "destructive" });
          setIsLoadingSavedPosts(false);
        });
    }
  }, [activeActivityTab, user?.uid, toast]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clientSideProfileUpdateAndServerAction = async (formData: FormData) => {
    if (!auth.currentUser) {
        toast({ title: "Error", description: "Not authenticated.", variant: "destructive" });
        return;
    }
    const newDisplayName = formData.get('displayName') as string | null;
    let newPhotoURL = customProfile?.photoURL || user?.photoURL || null;

    setIsUploading(true);

    if (selectedFile) {
      try {
        const imageFileRef = storageRef(storage, `profileImages/${auth.currentUser.uid}/profilePicture-${Date.now()}-${selectedFile.name}`);
        const uploadTask = uploadBytesResumable(imageFileRef, selectedFile);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.error("Upload failed:", error);
              toast({ title: "Upload Error", description: `Failed to upload image. ${error.message}`, variant: "destructive" });
              setIsUploading(false);
              reject(error);
            },
            async () => {
              newPhotoURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('File available at', newPhotoURL);
              resolve();
            }
          );
        });
      } catch (error) {
        setIsUploading(false);
        return; 
      }
    }
    setIsUploading(false);
    setUploadProgress(0);

    const authProfileUpdates: { displayName?: string | null; photoURL?: string | null } = {};
    if (newDisplayName && newDisplayName !== auth.currentUser.displayName) {
      authProfileUpdates.displayName = newDisplayName;
    }
    if (newPhotoURL && newPhotoURL !== auth.currentUser.photoURL) {
      authProfileUpdates.photoURL = newPhotoURL;
    }

    if (Object.keys(authProfileUpdates).length > 0 && auth.currentUser) {
      try {
        await updateFirebaseAuthProfile(auth.currentUser, authProfileUpdates);
        toast({ title: "Auth Profile Updated", description: "Your Firebase Authentication profile has been updated."});
      } catch (error) {
        console.error("Error updating Firebase Auth profile:", error);
        toast({ title: "Auth Update Error", description: `Failed to update Firebase Auth profile. ${ (error as Error).message }`, variant: "destructive" });
      }
    }
    
    if (newPhotoURL && newPhotoURL !== (customProfile?.photoURL || user?.photoURL)) {
        formData.set('photoURL', newPhotoURL);
    } else if (!newPhotoURL && (customProfile?.photoURL || user?.photoURL)) {
        formData.set('photoURL', ''); 
    }

    startEditTransition(() => {
        handleProfileFormSubmit(formData);
    });
  };

  const currentAvatarUrl = previewUrl || customProfile?.photoURL || user?.photoURL || `https://placehold.co/128x128.png?text=${(customProfile?.displayName || user?.displayName || "U").substring(0,1).toUpperCase()}`;
  const displayName = customProfile?.displayName || user?.displayName || "User";
  const fallbackAvatar = displayName?.substring(0, 2).toUpperCase() || 'U';
  const usernameHandle = customProfile?.username ? `@${customProfile.username}` : (user?.email ? `@${user.email.split('@')[0]}` : '@username');
  const bio = customProfile?.bio || "No bio set. Click 'Edit Profile' to add one.";
  const profileSocialLinks = customProfile?.socialLinks ?
    Object.entries(customProfile.socialLinks)
      .filter(([key, value]) => value && socialIcons[key as keyof SocialLinks])
      .map(([key, value]) => ({
        icon: socialIcons[key as keyof SocialLinks],
        href: value as string,
        label: key.charAt(0).toUpperCase() + key.slice(1),
      }))
    : [];

  const authorForCards: AuthorProfileForCard = {
    uid: user?.uid || 'mock-user-id',
    displayName: customProfile?.displayName || user?.displayName || 'WitWaves User',
    photoURL: customProfile?.photoURL || user?.photoURL,
  };

  if (authLoading || (user && (isLoadingProfile || isLoadingPosts))) {
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

  return (
    <div className="w-full">
      <div className="bg-card border-b border-border">
        <div className="container mx-auto max-w-5xl px-4 pt-8 pb-4">
           <div className="relative flex flex-col md:flex-row items-center md:items-end md:space-x-6"> {/* Removed -mt-10 for avatar positioning */}
            <Avatar className="h-28 w-28 md:h-28 md:w-28 border-4 border-background shadow-lg shrink-0 -mt-16 md:-mt-10"> {/* Adjusted margins */}
              <AvatarImage src={currentAvatarUrl} alt={displayName} data-ai-hint="person fashion"/>
              <AvatarFallback>{fallbackAvatar}</AvatarFallback>
            </Avatar>
            <div className="flex-1 mt-4 md:mt-0 text-center md:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">{displayName}</h1>
                  <p className="text-md text-muted-foreground">{usernameHandle}</p>
                </div>
                <div className="mt-3 sm:mt-0 flex space-x-2 justify-center md:justify-start">
                  <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
                     setIsEditModalOpen(isOpen);
                     if (!isOpen) { 
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                     }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Settings2 className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[525px]">
                      <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                      </DialogHeader>
                      <form action={clientSideProfileUpdateAndServerAction} className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Profile Picture</Label>
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-20 w-20">
                              <AvatarImage src={previewUrl || customProfile?.photoURL || user?.photoURL || `https://placehold.co/80x80.png?text=${displayName.substring(0,1).toUpperCase()}`} alt="Profile preview" data-ai-hint="person avatar"/>
                              <AvatarFallback>{displayName.substring(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <Input 
                              id="photoURLForm" 
                              name="photoFile" 
                              type="file" 
                              accept="image/*" 
                              onChange={handleFileChange}
                              ref={fileInputRef}
                              className="text-sm file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                            />
                          </div>
                          {isUploading && (
                            <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                              <div className="bg-primary h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="displayNameForm">Display Name</Label>
                          <Input id="displayNameForm" name="displayName" defaultValue={customProfile?.displayName || user?.displayName || ''} />
                          {editProfileState?.errors?.displayName && <p className="text-sm text-destructive mt-1">{editProfileState.errors.displayName.join(', ')}</p>}
                        </div>
                        <div>
                          <Label htmlFor="usernameForm">Username <span className="text-xs text-muted-foreground">(@handle)</span></Label>
                          <Input id="usernameForm" name="username" defaultValue={customProfile?.username || ''} placeholder="your_cool_handle" />
                           {editProfileState?.errors?.username && <p className="text-sm text-destructive mt-1">{editProfileState.errors.username.join(', ')}</p>}
                        </div>
                        <div>
                          <Label htmlFor="bioForm">Bio</Label>
                          <Textarea id="bioForm" name="bio" defaultValue={customProfile?.bio || ''} placeholder="Tell us about yourself..." rows={3} />
                          {editProfileState?.errors?.bio && <p className="text-sm text-destructive mt-1">{editProfileState.errors.bio.join(', ')}</p>}
                        </div>
                        <h3 className="text-md font-medium pt-2">Social Links</h3>
                        <div>
                          <Label htmlFor="twitterForm">Twitter URL</Label>
                          <Input id="twitterForm" name="twitter" defaultValue={customProfile?.socialLinks?.twitter || ''} placeholder="https://twitter.com/yourhandle" />
                          {editProfileState?.errors?.twitter && <p className="text-sm text-destructive mt-1">{editProfileState.errors.twitter.join(', ')}</p>}
                        </div>
                        <div>
                          <Label htmlFor="linkedinForm">LinkedIn URL</Label>
                          <Input id="linkedinForm" name="linkedin" defaultValue={customProfile?.socialLinks?.linkedin || ''} placeholder="https://linkedin.com/in/yourprofile" />
                          {editProfileState?.errors?.linkedin && <p className="text-sm text-destructive mt-1">{editProfileState.errors.linkedin.join(', ')}</p>}
                        </div>
                        <div>
                          <Label htmlFor="instagramForm">Instagram URL</Label>
                          <Input id="instagramForm" name="instagram" defaultValue={customProfile?.socialLinks?.instagram || ''} placeholder="https://instagram.com/yourprofile" />
                          {editProfileState?.errors?.instagram && <p className="text-sm text-destructive mt-1">{editProfileState.errors.instagram.join(', ')}</p>}
                        </div>
                        <div>
                          <Label htmlFor="portfolioForm">Portfolio/Website URL</Label>
                          <Input id="portfolioForm" name="portfolio" defaultValue={customProfile?.socialLinks?.portfolio || ''} placeholder="https://yourportfolio.com" />
                           {editProfileState?.errors?.portfolio && <p className="text-sm text-destructive mt-1">{editProfileState.errors.portfolio.join(', ')}</p>}
                        </div>
                        {editProfileState?.message && !editProfileState.success && (!editProfileState.errors || Object.keys(editProfileState.errors).length === 0) && (
                           <p className="text-sm text-destructive mt-1">{editProfileState.message}</p>
                        )}
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" onClick={() => {
                                    setIsEditModalOpen(false);
                                    setSelectedFile(null);
                                    setPreviewUrl(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}>Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isEditPending || isEditPendingTransition || isUploading}>
                                {(isEditPending || isEditPendingTransition || isUploading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Changes'}
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
              <div className="mt-3 flex justify-center md:justify-start space-x-6 text-sm text-muted-foreground">
                <div><span className="font-semibold text-foreground">{staticProfileStats.following}</span> Following</div>
                <div><span className="font-semibold text-foreground">{staticProfileStats.followers}</span> Followers</div>
                <div><span className="font-semibold text-foreground">{isLoadingPosts ? <Loader2 className="h-4 w-4 animate-spin inline"/> : userPosts.length}</span> Posts</div>
              </div>
              <p className="mt-3 text-sm text-foreground/80 leading-relaxed max-w-xl text-center md:text-left">
                {bio}
              </p>
              {profileSocialLinks.length > 0 && (
                <div className="mt-3 flex justify-center md:justify-start space-x-3">
                    {profileSocialLinks.map(link => (
                    <Link href={link.href} key={link.label} target="_blank" rel="noopener noreferrer"
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

      <Separator className="my-6 container max-w-5xl" />

      <div className="container mx-auto max-w-5xl px-4 pb-8">
        <Tabs defaultValue="posts" className="w-full" onValueChange={setActiveActivityTab}>
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
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <BookmarkIcon className="mr-2 h-5 w-5 text-blue-500" /> Saved Posts
                </h3>
                {isLoadingSavedPosts ? (
                     <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-3">Loading saved posts...</p></div>
                ) : savedPosts.length === 0 ? (
                    <p className="text-muted-foreground">You haven&apos;t saved any posts yet.</p>
                ) : (
                    <div className="space-y-6">
                        {savedPosts.map(post => (
                            <PostCard key={post.id} post={post} /> // Using PostCard for a slightly different layout than BlogPostCard
                        ))}
                    </div>
                )}
                <Separator className="my-6"/>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Heart className="mr-2 h-5 w-5 text-destructive" /> Liked Posts
                </h3>
                <p className="text-muted-foreground">Your liked posts will appear here.</p>
                 <Separator className="my-6"/>
                 <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <MessageSquareIcon className="mr-2 h-5 w-5 text-green-500" /> Your Comments
                </h3>
                <p className="text-muted-foreground">Your comments will appear here.</p>
            </Card>
          </TabsContent>

          <TabsContent value="lists">
            <Card className="p-6 min-h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">User-created lists will be displayed here.</p>
            </Card>
          </TabsContent>

          <TabsContent value="papers">
            <Card className="p-6 min-h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">User&apos;s academic papers will be displayed here.</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-lg shadow-sm ${className}`}>
      {children}
    </div>
  );
}
