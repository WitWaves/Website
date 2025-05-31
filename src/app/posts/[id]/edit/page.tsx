
import PostForm from '@/components/posts/post-form';
import { getPost } from '@/lib/posts';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { use } from 'react';

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
  const resolvedParams = use(params);
  if (searchParams) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const resolvedSearchParams = use(searchParams);
    // You can use resolvedSearchParams if needed in the future
  }
  
  const post = await getPost(resolvedParams.id);

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
