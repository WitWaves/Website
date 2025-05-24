import PostForm from '@/components/posts/post-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Create New Post | WitWaves',
  description: 'Write and publish a new article on WitWaves.',
};

export default function NewPostPage() {
  return (
    <div className="py-8">
       <Button variant="outline" asChild className="mb-8">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </Button>
      <PostForm />
    </div>
  );
}
