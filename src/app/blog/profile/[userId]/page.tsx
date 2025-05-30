
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Instagram, Linkedin, Briefcase, Github, Link as LinkIcon, Globe, Users, FileCheck2, Loader2, X } from 'lucide-react';
import BlogPostCard from '@/components/posts/blog-post-card';
import { getUserProfile, type UserProfile, type SocialLinks, type AuthorProfileForCard } from '@/lib/userProfile';
import { getPostsByUserId, type Post } from '@/lib/posts';

type PublicProfilePageProps = {
  params: {
    userId: string;
  };
};

const socialIcons: Record<keyof Required<SocialLinks>, typeof LinkIcon> = {
    twitter: X, // Assuming X for Twitter
    linkedin: Linkedin,
    instagram: Instagram,
    portfolio: Briefcase,
    github: Github,
};

// Static stats for public profile
const staticProfileStats = {
    following: 45, 
    followers: 120, 
};

const topInterestsStatic = ["Web", "Web Design", "Programming", "Art", "Maths"];


export async function generateMetadata({ params }: PublicProfilePageProps) {
  const userProfile = await getUserProfile(params.userId);
  if (!userProfile) {
    return {
      title: 'User Not Found | WitWaves',
    };
  }
  return {
    title: `${userProfile.displayName || 'User'}'s Profile | WitWaves`,
    description: userProfile.bio || `View the profile and posts of ${userProfile.displayName || 'User'} on WitWaves.`,
  };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const userId = params.userId;
  const userProfile = await getUserProfile(userId);
  const userPosts = await getPostsByUserId(userId);

  if (!userProfile) {
    notFound();
  }

  const displayName = userProfile.displayName || "WitWaves User";
  const fallbackAvatar = displayName?.substring(0, 2).toUpperCase() || 'WW';
  const usernameHandle = userProfile.username ? `@${userProfile.username}` : (userProfile.uid ? `@user_${userProfile.uid.substring(0,6)}` : '@username');
  const bio = userProfile.bio || "This user hasn't set a bio yet.";
  const userRole = "Blog Author"; // Or derive this if available in UserProfile

  const profileSocialLinksArray = userProfile.socialLinks ?
    Object.entries(userProfile.socialLinks)
      .filter(([key, value]) => value && socialIcons[key as keyof Required<SocialLinks>])
      .map(([key, value]) => ({
        icon: socialIcons[key as keyof Required<SocialLinks>],
        href: value as string,
        label: key.charAt(0).toUpperCase() + key.slice(1),
      }))
    : [];
  
  const authorForCards: AuthorProfileForCard = {
    uid: userProfile.uid,
    displayName: userProfile.displayName || 'WitWaves User',
    photoURL: userProfile.photoURL,
  };


  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8 py-6 md:py-8">
      {/* Left Column: Profile Information Card */}
      <aside className="w-full md:w-2/5 lg:w-1/3 shrink-0">
        <Card className="shadow-lg rounded-xl overflow-hidden relative">
          <div className="relative h-32 md:h-36 bg-muted">
            {/* Placeholder for decorative background */}
            <Image
              src="https://placehold.co/400x150.png" 
              alt="Profile background decorative"
              layout="fill"
              objectFit="cover"
              data-ai-hint="abstract tech"
            />
            <Avatar className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 h-24 w-24 md:h-28 md:w-28 border-4 border-card shadow-md">
              <AvatarImage src={userProfile.photoURL || `https://placehold.co/128x128.png?text=${fallbackAvatar}`} alt={displayName} data-ai-hint="person avatar"/>
              <AvatarFallback>{fallbackAvatar}</AvatarFallback>
            </Avatar>
          </div>

          <div className="pt-16 pb-6 px-6 text-center relative">
            {/* User name and handle */}
            <h1 className="text-xl font-semibold text-foreground mt-2">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{usernameHandle}</p>
            <div className="flex items-center justify-center text-sm text-muted-foreground mt-1">
              <LinkIcon className="h-3.5 w-3.5 mr-1.5" /> {/* Placeholder icon */}
              <span>{userRole}</span>
            </div>

            {/* Stats: Following, Followers, Posts */}
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
                <p className="font-semibold text-lg text-foreground">{userPosts.length}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>
            </div>

            {/* Bio */}
            <p className="text-sm text-foreground/80 text-left leading-relaxed mb-4">
              {bio}
            </p>

            {/* Top Interests */}
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
            
            {/* Social Links */}
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

      {/* Right Column: Published Posts */}
      <main className="flex-1 min-w-0">
        <h2 className="text-2xl font-semibold text-foreground mb-6">Published Posts</h2>
        {userPosts.length === 0 ? (
          <p className="text-center text-muted-foreground text-lg py-12">
            This user hasn&apos;t published any posts yet.
          </p>
        ) : (
          <div className="space-y-8">
            {userPosts.map((post) => (
              <BlogPostCard key={post.id} post={post} author={authorForCards} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
