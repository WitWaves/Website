
import PostForm from '@/components/posts/post-form';
import { getPost } from '@/lib/posts';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
// Removed 'use' import as it's not needed for params/searchParams here

type EditPostPageParams = {
  id: string;
};

type EditPostPageProps = {
  params: EditPostPageParams;
  searchParams?: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: { params: EditPostPageParams }) {
  const post = await getPost(params.id);
  if (!post) {
    return { title: 'Post Not Found' };
  }
  return {
    title: `Edit: ${post.title} | WitWaves`,
    description: `Edit the post titled "${post.title}".`,
  };
}


export default async function EditPostPage({ params, searchParams }: EditPostPageProps) {
  // Directly use params and searchParams without the 'use()' hook
  // const resolvedParams = use(params); // Removed
  // if (searchParams) {
  //   const resolvedSearchParams = use(searchParams); // Removed
  // }
  
  const post = await getPost(params.id); // Use params.id directly

  if (!post) {
    notFound();
  }

  return (
    <div className="py-8">
      <Button variant="outline" asChild className="mb-8">
        <Link href={`/posts/${post.id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Post
        </Link>
      </Button>
      <PostForm post={post} />
    </div>
  );
}
