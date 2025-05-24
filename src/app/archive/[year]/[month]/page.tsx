import { getPostsByArchive, type Post } from '@/lib/posts';
import PostCard from '@/components/posts/post-card';
import { notFound } from 'next/navigation';
import { format, isValid } from 'date-fns';
import { ArrowLeft, CalendarRange } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type ArchivePageProps = {
  params: {
    year: string;
    month: string;
  };
};

export async function generateMetadata({ params }: ArchivePageProps) {
  const year = parseInt(params.year, 10);
  const month = parseInt(params.month, 10) -1; // Adjust for 0-indexed month
  
  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
     return { title: 'Invalid Archive Date | WitWaves' };
  }
  const date = new Date(year, month);
  if (!isValid(date)) {
    return { title: 'Invalid Archive Date | WitWaves' };
  }
  const monthName = format(date, 'MMMM');
  return {
    title: `Archive: ${monthName} ${year} | WitWaves`,
    description: `Browse articles from ${monthName} ${year} on WitWaves.`,
  };
}


export default async function ArchivePage({ params }: ArchivePageProps) {
  const year = parseInt(params.year, 10);
  const month = parseInt(params.month, 10); // URL month is 1-12

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    notFound();
  }

  const posts = await getPostsByArchive(year, month - 1); // month - 1 for 0-indexed Date functions

  const dateForTitle = new Date(year, month - 1);
   if (!isValid(dateForTitle)) {
    notFound();
  }
  const monthName = format(dateForTitle, 'MMMM');

  return (
    <div className="py-8">
      <Button variant="outline" asChild className="mb-8">
        <Link href="/blog"> {/* Updated link to /blog */}
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to all posts
        </Link>
      </Button>
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3 tracking-tight flex items-center justify-center">
          <CalendarRange className="mr-3 h-8 w-8 text-primary" />
          Archive: {monthName} {year}
        </h1>
      </div>

      {posts.length === 0 ? (
        <p className="text-center text-muted-foreground text-lg py-12">
          No posts found for {monthName} {year}.
        </p>
      ) : (
        <div className="space-y-8">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
