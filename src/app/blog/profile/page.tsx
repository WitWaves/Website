
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Settings2, Share2, X, Instagram, Linkedin, Briefcase, Link as LinkIcon } from 'lucide-react';
import BlogPostCard from '@/components/posts/blog-post-card';
import { getPosts, type Post } from '@/lib/posts';
import { getMockAuthors, type MockAuthor } from '@/lib/authors';

// Mock data for the profile - replace with actual data fetching later
const userProfile = {
  name: '#Fayee. ZRF',
  handle: '@fayeerzk',
  avatarUrl: 'https://placehold.co/128x128.png?text=FZ',
  coverImageUrl: 'https://placehold.co/1200x300.png',
  bio: 'Exploring the intersections of technology, art, and philosophy. Avid reader, lifelong learner, and occasional writer. Sharing thoughts and discoveries.',
  stats: {
    following: 45,
    followers: '4k', // Assuming 'k' for thousands
    posts: 45,
  },
  socialLinks: [
    { icon: X, href: '#', label: 'Twitter/X' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Briefcase, href: '#', label: 'Portfolio/Work' },
  ],
};

export default async function ProfilePage() {
  const posts = await getPosts(); // For now, show all posts
  const mockAuthors = await getMockAuthors();
  // In a real app, you'd fetch posts by this user_id
  // And the author for BlogPostCard would be this user.
  const userAsAuthor: MockAuthor = {
    id: 'profileUser',
    name: userProfile.name,
    role: 'Profile User',
    avatarUrl: userProfile.avatarUrl,
  }

  return (
    <div className="w-full">
      {/* Cover Image */}
      <div className="relative h-48 md:h-64 w-full rounded-lg overflow-hidden shadow-inner">
        <Image
          src={userProfile.coverImageUrl}
          alt="Cover image"
          layout="fill"
          objectFit="cover"
          className="bg-muted"
          data-ai-hint="abstract gradient"
        />
      </div>

      {/* Profile Info Section */}
      <div className="container mx-auto max-w-5xl px-4 -mt-16">
        <div className="flex flex-col md:flex-row items-center md:items-end md:space-x-6 bg-card p-6 rounded-lg shadow-lg">
          <Avatar className="h-32 w-32 border-4 border-background shadow-md">
            <AvatarImage src={userProfile.avatarUrl} alt={userProfile.name} data-ai-hint="person face"/>
            <AvatarFallback>{userProfile.name.substring(1,3).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 mt-4 md:mt-0 text-center md:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">{userProfile.name}</h1>
                <p className="text-md text-muted-foreground">{userProfile.handle}</p>
              </div>
              <div className="mt-3 sm:mt-0 flex space-x-2 justify-center md:justify-start">
                <Button variant="outline" size="sm">
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
              <div><span className="font-semibold text-foreground">{userProfile.stats.following}</span> Following</div>
              <div><span className="font-semibold text-foreground">{userProfile.stats.followers}</span> Followers</div>
              <div><span className="font-semibold text-foreground">{userProfile.stats.posts}</span> Posts</div>
            </div>
            <p className="mt-4 text-sm text-foreground leading-relaxed max-w-xl">
              {userProfile.bio}
            </p>
            <div className="mt-4 flex justify-center md:justify-start space-x-3">
              {userProfile.socialLinks.map(link => (
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
                >
                  {tab}
                </Button>
              ))}
            </div>
            {posts.length === 0 ? (
              <p className="text-center text-muted-foreground text-lg py-12">No posts found.</p>
            ) : (
              <div className="space-y-8">
                {posts.map((post, index) => (
                   <BlogPostCard key={post.id} post={post} author={userAsAuthor} />
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
                <Button variant="outline" size="sm">Create New List</Button>
            </div>
            <Card className="p-6 min-h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">User-created lists (e.g., "To know", "To learn") will be displayed here.</p>
            </Card>
          </TabsContent>

          <TabsContent value="papers">
            <div className="mb-4 flex justify-between items-center">
                <p className="text-lg font-semibold text-foreground">My Publications</p>
                <Button variant="outline" size="sm">Add New Paper</Button>
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

    