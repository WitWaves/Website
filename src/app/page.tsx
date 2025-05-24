import { getPosts, type Post } from '@/lib/posts';
import PostCard from '@/components/posts/post-card';
import ArchiveLinks from '@/components/layout/archive-links';
import AllTagsLinks from '@/components/layout/all-tags-links';

export default async function HomePage() {
  const posts = await getPosts();

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-bold mb-8 text-center tracking-tight">Welcome to WitWaves</h1>
        <p className="text-xl text-muted-foreground mb-12 text-center">
          Weaving words, igniting ideas. Explore our latest articles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8">
          {posts.length === 0 ? (
            <p className="text-center text-muted-foreground text-lg py-12">No posts yet. Check back soon!</p>
          ) : (
            posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))
          )}
        </div>
        <aside className="md:col-span-4 space-y-8">
          <ArchiveLinks />
          <AllTagsLinks />
        </aside>
      </div>
    </div>
  );
}
