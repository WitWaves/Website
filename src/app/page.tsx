import { getPosts, type Post } from '@/lib/posts';
import PostCard from '@/components/posts/post-card';
import ArchiveLinks from '@/components/layout/archive-links';
import AllTagsLinks from '@/components/layout/all-tags-links';
import { Separator } from '@/components/ui/separator';

export default async function HomePage() {
  const posts = await getPosts();

  return (
    <div className="space-y-16">
      <section className="text-center py-8 rounded-lg bg-gradient-to-r from-primary/10 via-background to-accent/10">
        <h1 className="text-5xl font-bold mb-4 tracking-tight text-primary">Welcome to WitWaves</h1>
        <p className="text-xl text-foreground/80 max-w-2xl mx-auto">
          Weaving words, igniting ideas. Explore our latest articles and insights from the community.
        </p>
      </section>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8">
        <main className="lg:col-span-8 space-y-10">
          <h2 className="text-3xl font-semibold tracking-tight border-b pb-3 mb-8">Latest Posts</h2>
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 bg-card rounded-lg shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text text-muted-foreground mb-4"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
              <h3 className="text-xl font-medium text-foreground">No Posts Yet</h3>
              <p className="text-muted-foreground mt-1">Check back soon, or create the first post!</p>
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))
          )}
        </main>
        <aside className="lg:col-span-4 space-y-10 lg:mt-[76px]">
          <ArchiveLinks />
          <AllTagsLinks />
        </aside>
      </div>
    </div>
  );
}
