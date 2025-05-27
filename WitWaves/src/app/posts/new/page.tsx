
import PostForm from '@/components/posts/post-form';

export const metadata = {
  title: 'Create New Post | WitWaves',
  description: 'Write and publish a new article on WitWaves.',
};

export default function NewPostPage() {
  return (
    <div className="w-full py-8 px-4 md:px-0"> {/* Adjusted padding for better full-width feel */}
      <PostForm />
    </div>
  );
}
