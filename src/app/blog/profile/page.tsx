
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
import { Settings2, X, Instagram, Linkedin, Briefcase, UserCircle, Github, Link as LinkIcon, Heart, MessageSquareIcon, Edit3, Globe, Users, FileCheck2, ImageUp } from 'lucide-react';
import BlogPostCard from '@/components/posts/blog-post-card';
// import PostCard from '@/components/posts/post-card'; // No longer used directly for liked posts here
import { getPosts, type Post, getLikedPostsByUser } from '@/lib/posts';
import type { AuthorProfileForCard, UserProfile, SocialLinks } from '@/lib/userProfile';
import { useAuth } from '@/contexts/auth-context';
import { updateUserProfileAction, type FormState } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { getUserProfile } from '@/lib/userProfile';
import { auth, storage } from '@/lib/firebase/config';
import { updateProfile as updateFirebaseAuthProfile } from 'firebase/auth';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getCommentsByUser, type UserActivityComment } from '@/lib/comments';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';

const socialIcons: Record<keyof Required<SocialLinks>, typeof LinkIcon> = {
    twitter: X,
    linkedin: Linkedin,
    instagram: Instagram,
    portfolio: Briefcase,
    github: Github,
};

const staticProfileStats = {
    following: 45,
    followers: 45,
};

const topInterestsStatic = ["Web", "Web Design", "Programming", "Art", "Maths"];
const activitySubTabs = [{id: "liked", label: "Liked"}, {id: "comments", label: "Comments"}];


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

  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [isLoadingLikedPosts, setIsLoadingLikedPosts] = useState(false);
  const [userComments, setUserComments] = useState<UserActivityComment[]>([]);
  const [isLoadingUserComments, setIsLoadingUserComments] = useState(false);
  const [activeActivityTab, setActiveActivityTab] = useState<string>("posts");
  const [activeActivitySubTab, setActiveActivitySubTab] = useState<string>(activitySubTabs[0].id);


  useEffect(() => {
    async function fetchAndFilterPosts() {
      if (authLoading) return;
      if (!user?.uid) {
        setIsLoadingPosts(false);
        setUserPosts([]);
        return;
      }
      setIsLoadingPosts(true);
      console.log('[ProfilePage] Fetching posts for user:', user.uid);
      try {
        const allPosts = await getPosts();
        console.log('[ProfilePage] All posts fetched for profile consideration:', allPosts);
        const filteredPosts = allPosts.filter(post => post.userId === user.uid);
        console.log('[ProfilePage] Filtered posts for current user:', filteredPosts);
        setUserPosts(filteredPosts);
      } catch (error) {
        console.error("[ProfilePage] Error fetching user posts:", error);
        setUserPosts([]);
      } finally {
        setIsLoadingPosts(false);
      }
    }
    fetchAndFilterPosts();
  }, [user, authLoading]);

  useEffect(() => {
    async function fetchCustomProfile() {
      if (authLoading) return;
      if (user?.uid) {
        setIsLoadingProfile(true);
        console.log('[ProfilePage] Fetching custom profile for user:', user.uid);
        try {
          const profileDataFromDb = await getUserProfile(user.uid);
          console.log('[ProfilePage] Custom profile data from DB:', profileDataFromDb);
          if (profileDataFromDb) {
            setCustomProfile(profileDataFromDb);
          } else {
            console.log('[ProfilePage] No custom profile in DB, creating fallback from Auth data.');
            setCustomProfile({
              uid: user.uid,
              displayName: user.displayName || "User",
              photoURL: user.photoURL || undefined,
              username: user.email?.split('@')[0] || 'username',
              bio: "",
              socialLinks: {},
            });
          }
        } catch (error) {
            console.error("[ProfilePage] Error fetching custom profile:", error);
            setCustomProfile({ // Fallback on error
              uid: user.uid,
              displayName: user.displayName || "User",
              photoURL: user.photoURL || undefined,
              username: user.email?.split('@')[0] || 'username',
              bio: "Error loading profile details.",
              socialLinks: {},
            });
        } finally {
            setIsLoadingProfile(false);
        }
      } else {
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
        console.log('[ProfilePage] Re-fetching custom profile after successful edit for user:', user.uid);
        getUserProfile(user.uid).then(profileDataFromDb => {
            if (profileDataFromDb) {
                setCustomProfile(profileDataFromDb);
            } else {
                 setCustomProfile({
                    uid: user.uid,
                    displayName: auth.currentUser?.displayName || user.displayName || "User",
                    photoURL: auth.currentUser?.photoURL || user.photoURL || undefined,
                    username: user.email?.split('@')[0] || 'username',
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

  useEffect(() => {
    if (activeActivityTab === 'activity' && user?.uid) {
      console.log('[ProfilePage] Activity tab active for user:', user.uid);

      // Fetch Liked Posts
      if (!likedPosts.length && !isLoadingLikedPosts) { // Only fetch if not already fetched or loading
        setIsLoadingLikedPosts(true);
        console.log('[ProfilePage] Fetching liked posts for user:', user.uid);
        getLikedPostsByUser(user.uid)
          .then(data => {
            console.log('[ProfilePage] Fetched liked posts data (client-side):', data);
            setLikedPosts(data);
          })
          .catch(err => {
            console.error("[ProfilePage] Error fetching liked posts (client-side):", err);
            toast({ title: "Error Loading Liked Posts", description: "Could not load your liked posts. Check browser and server console logs for Firestore errors (rules or missing indexes might be the cause).", variant: "destructive" });
            setLikedPosts([]);
          })
          .finally(() => setIsLoadingLikedPosts(false));
      }

      // Fetch User Comments
      if (!userComments.length && !isLoadingUserComments) { // Only fetch if not already fetched or loading
        setIsLoadingUserComments(true);
        console.log('[ProfilePage] Fetching user comments for user:', user.uid);
        getCommentsByUser(user.uid)
          .then(data => {
            console.log('[ProfilePage] Fetched user comments data (client-side):', data);
            setUserComments(data);
          })
          .catch(err => {
            console.error("[ProfilePage] Error fetching user comments (client-side):", err);
            toast({ title: "Error Loading Your Comments", description: "Could not load your comments. Check browser and server console logs for Firestore errors (rules or missing indexes might be the cause).", variant: "destructive" });
            setUserComments([]);
          })
          .finally(() => setIsLoadingUserComments(false));
        }
    }
  }, [activeActivityTab, user?.uid, toast, likedPosts.length, userComments.length, isLoadingLikedPosts, isLoadingUserComments]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clientSideProfileUpdateAndServerAction = async (formData: FormData) => {
    if (!auth.currentUser || !user) {
        toast({ title: "Error", description: "Not authenticated.", variant: "destructive" });
        return;
    }
    const newDisplayName = formData.get('displayName') as string;
    let newPhotoURL = previewUrl || customProfile?.photoURL || user?.photoURL || null;

    if (selectedFile) {
      setIsUploading(true);
      setUploadProgress(0);
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
      } finally {
        setIsUploading(false);
      }
    }

    const authProfileUpdates: { displayName?: string | null; photoURL?: string | null } = {};
    if (newDisplayName && newDisplayName !== auth.currentUser.displayName) {
      authProfileUpdates.displayName = newDisplayName;
    }
    if (newPhotoURL && newPhotoURL !== auth.currentUser.photoURL) {
      authProfileUpdates.photoURL = newPhotoURL;
    } else if (newPhotoURL === null && auth.currentUser.photoURL !== null) { 
      authProfileUpdates.photoURL = null;
    }


    if (Object.keys(authProfileUpdates).length > 0 && auth.currentUser) {
      try {
        await updateFirebaseAuthProfile(auth.currentUser, authProfileUpdates);
        console.log("Firebase Auth profile updated with:", authProfileUpdates);
      } catch (error) {
        console.error("Error updating Firebase Auth profile:", error);
        toast({ title: "Auth Update Error", description: `Failed to update Firebase Auth profile. ${ (error as Error).message }`, variant: "destructive" });
      }
    }

    if (newPhotoURL) {
        formData.set('photoURL', newPhotoURL);
    } else if (newPhotoURL === null && (customProfile?.photoURL || user?.photoURL)) {
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
  const userRole = "Blog Author"; 

  const profileSocialLinksArray = customProfile?.socialLinks ?
    Object.entries(customProfile.socialLinks)
      .filter(([key, value]) => value && socialIcons[key as keyof Required<SocialLinks>])
      .map(([key, value]) => ({
        icon: socialIcons[key as keyof Required<SocialLinks>],
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
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <Image src="https://firebasestorage.googleapis.com/v0/b/witwaves.firebasestorage.app/o/Website%20Elements%2FLoading%20-%20Black%20-%20Transparent.gif?alt=media&token=528739e3-b870-4d1d-b450-70d860dad2df" alt="Loading profile..." width={64} height={64} />
        <p className="ml-3 mt-3">Loading profile...</p>
      </div>
    );
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
    <div className="flex flex-col md:flex-row gap-6 md:gap-8 py-6 md:py-8">
      <aside className="w-full md:w-2/5 lg:w-1/3 shrink-0">
        <Card className="shadow-lg rounded-xl overflow-hidden relative">
          <div className="relative h-32 md:h-36 bg-muted">
            <Image
              src="https://placehold.co/400x150.png"
              alt="Profile background decorative"
              layout="fill"
              objectFit="cover"
              data-ai-hint="abstract waves"
            />
            <Avatar className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 h-24 w-24 md:h-28 md:w-28 border-4 border-card shadow-md">
              <AvatarImage src={currentAvatarUrl} alt={displayName} data-ai-hint="person fashion"/>
              <AvatarFallback>{fallbackAvatar}</AvatarFallback>
            </Avatar>
          </div>

          <div className="pt-16 pb-6 px-6 text-center relative">
            <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
                setIsEditModalOpen(isOpen);
                if (!isOpen) {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            }}>
              <DialogTrigger asChild>
                <Button variant="link" size="sm" className="absolute top-4 right-4 text-xs px-3 py-1.5 text-primary hover:text-primary/80">
                  Edit profile
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); clientSideProfileUpdateAndServerAction(new FormData(e.currentTarget));}} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Profile Picture</Label>
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={previewUrl || customProfile?.photoURL || user?.photoURL || `https://placehold.co/80x80.png?text=${(displayName || 'U').substring(0,1).toUpperCase()}`} alt="Profile preview" data-ai-hint="person avatar"/>
                        <AvatarFallback>{(displayName || 'U').substring(0,2).toUpperCase()}</AvatarFallback>
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
                    <Textarea
                      id="bioForm"
                      name="bio"
                      defaultValue={customProfile?.bio || ''}
                      placeholder="Tell us about yourself... (approx. 100 words)"
                      rows={3}
                      maxLength={600}
                    />
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
                   <div>
                    <Label htmlFor="githubForm">GitHub URL</Label>
                    <Input id="githubForm" name="github" defaultValue={customProfile?.socialLinks?.github || ''} placeholder="https://github.com/yourusername" />
                     {editProfileState?.errors?.github && <p className="text-sm text-destructive mt-1">{editProfileState.errors.github.join(', ')}</p>}
                  </div>
                  {editProfileState?.message && !editProfileState.success && (!editProfileState.errors || Object.keys(editProfileState.errors).length === 0 || (Object.keys(editProfileState.errors).length === 1 && editProfileState.errors.photoURL)) && (
                     <p className="text-sm text-destructive mt-1">{editProfileState.message}</p>
                  )}
                   {editProfileState?.errors?.photoURL && <p className="text-sm text-destructive mt-1">{editProfileState.errors.photoURL.join(', ')}</p>}
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
                          {(isEditPending || isEditPendingTransition || isUploading) ? (
                            <Image src="https://firebasestorage.googleapis.com/v0/b/witwaves.firebasestorage.app/o/Website%20Elements%2FLoading%20-%20Black%20-%20Transparent.gif?alt=media&token=528739e3-b870-4d1d-b450-70d860dad2df" alt="Loading..." width={20} height={20} className="mr-2" />
                          ) : 'Save Changes'}
                      </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <h1 className="text-xl font-semibold text-foreground mt-2">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{usernameHandle}</p>
            <div className="flex items-center justify-center text-sm text-muted-foreground mt-1">
              <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
              <span>{userRole}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 my-4 text-center">
              <div>
                <p className="font-semibold text-lg text-foreground">{staticProfileStats.following}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </div>
              <div>
                <p className="font-semibold text-lg text-foreground">{staticProfileStats.followers}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
              <div>
                <p className="font-semibold text-lg text-foreground">{isLoadingPosts ? <Image src="https://firebasestorage.googleapis.com/v0/b/witwaves.firebasestorage.app/o/Website%20Elements%2FLoading%20-%20Black%20-%20Transparent.gif?alt=media&token=528739e3-b870-4d1d-b450-70d860dad2df" alt="Loading count" width={20} height={20} className="inline" /> : userPosts.length}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>
            </div>

            <p className="text-sm text-foreground/80 text-left leading-relaxed mb-4">
              {bio}
            </p>

            <div className="text-left mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Top interests</h3>
              <div className="flex flex-wrap gap-2">
                {topInterestsStatic.map(interest => (
                  <Button key={interest} variant="outline" size="sm" className="text-xs px-3 py-1.5 bg-muted/50 hover:bg-muted">
                    {interest}
                  </Button>
                ))}
              </div>
            </div>

            {profileSocialLinksArray.length > 0 && (
              <div className="flex justify-center space-x-4 py-2 border-t border-border">
                  {profileSocialLinksArray.map(link => (
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
        </Card>
      </aside>

      <main className="flex-1 min-w-0">
        <Tabs defaultValue="posts" className="w-full" onValueChange={setActiveActivityTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1 rounded-lg border">
            <TabsTrigger value="posts" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Posts</TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            <div className="mb-4 flex space-x-1 border border-border rounded-lg p-1 bg-muted/50 w-fit">
              {["Published", "Drafts", "Archived"].map((tab, index) => (
                <Button
                  key={tab}
                  variant={index === 0 ? "secondary" : "ghost"}
                  size="sm"
                  className={index === 0 ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}
                >
                  {tab}
                </Button>
              ))}
            </div>
            {isLoadingPosts ? (
              <div className="flex flex-col justify-center items-center h-40">
                <Image src="https://firebasestorage.googleapis.com/v0/b/witwaves.firebasestorage.app/o/Website%20Elements%2FLoading%20-%20Black%20-%20Transparent.gif?alt=media&token=528739e3-b870-4d1d-b450-70d860dad2df" alt="Loading posts..." width={48} height={48} />
                 <p className="ml-3 mt-2">Loading posts...</p>
              </div>
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
            <Card className="p-0 border-0 shadow-none">
                <div className="mb-4 flex space-x-1 border border-border rounded-lg p-1 bg-muted/50 w-fit">
                  {activitySubTabs.map((subTab) => (
                    <Button
                      key={subTab.id}
                      variant={activeActivitySubTab === subTab.id ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setActiveActivitySubTab(subTab.id)}
                      className={activeActivitySubTab === subTab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}
                    >
                      {subTab.label}
                    </Button>
                  ))}
                </div>

                {activeActivitySubTab === 'liked' && (
                  <section>
                     <h3 className="text-md font-medium mb-3 text-muted-foreground">Liked Posts</h3>
                     {isLoadingLikedPosts ? (
                         <div className="flex flex-col justify-center items-center h-40">
                            <Image src="https://firebasestorage.googleapis.com/v0/b/witwaves.firebasestorage.app/o/Website%20Elements%2FLoading%20-%20Black%20-%20Transparent.gif?alt=media&token=528739e3-b870-4d1d-b450-70d860dad2df" alt="Loading liked posts..." width={48} height={48} />
                            <p className="ml-3 mt-2">Loading liked posts...</p>
                         </div>
                    ) : likedPosts.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-4">Your liked posts will appear here.</p>
                    ) : (
                        <div className="space-y-3">
                            {likedPosts.map(post => (
                                <div key={post.id} className="p-3 border rounded-md bg-muted/50 text-sm">
                                    <p className="mb-1 text-foreground/80">
                                        You liked <Link href={`/posts/${post.id}`} className="text-primary hover:underline font-medium">{post.title}</Link>
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Originally published on: {format(new Date(post.createdAt), 'MMM d, yyyy')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                  </section>
                )}

                {activeActivitySubTab === 'comments' && (
                  <section>
                     <h3 className="text-md font-medium mb-3 text-muted-foreground">Your Comments</h3>
                     {isLoadingUserComments ? (
                        <div className="flex flex-col justify-center items-center h-40">
                            <Image src="https://firebasestorage.googleapis.com/v0/b/witwaves.firebasestorage.app/o/Website%20Elements%2FLoading%20-%20Black%20-%20Transparent.gif?alt=media&token=528739e3-b870-4d1d-b450-70d860dad2df" alt="Loading your comments..." width={48} height={48} />
                            <p className="ml-3 mt-2">Loading your comments...</p>
                        </div>
                    ) : userComments.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-4">You haven&apos;t made any comments yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {userComments.map(comment => (
                                <div key={comment.id} className="p-3 border rounded-md bg-muted/50 text-sm">
                                    <p className="mb-1 text-foreground/80">
                                        You commented on <Link href={`/posts/${comment.postSlug || comment.postId}`} className="text-primary hover:underline font-medium">{comment.postTitle || `Post ID: ${comment.postId}`}</Link>:
                                    </p>
                                    <blockquote className="pl-3 border-l-2 border-border italic text-foreground">
                                        "{comment.text.length > 100 ? `${comment.text.substring(0, 100)}...` : comment.text}"
                                    </blockquote>
                                    <p className="text-xs text-muted-foreground mt-1.5">{format(new Date(comment.createdAt), 'MMM d, yyyy, HH:mm')}</p>
                                </div>
                            ))}
                        </div>
                    )}
                  </section>
                )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

    