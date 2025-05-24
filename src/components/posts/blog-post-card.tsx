
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/lib/posts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, Bookmark, MessageCircle, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import type { MockAuthor } from '@/lib/authors'; // Import MockAuthor type
import { useState, useEffect } from 'react';

type BlogPostCardProps = {
  post: Post;
  author: MockAuthor; // Add author prop
};

export default function BlogPostCard({ post, author }: BlogPostCardProps) {
  const summary = post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '');

  const [likes, setLikes] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<string | null>(null);

  useEffect(() => {
    // Generate random "k" numbers like "1.2k", "15.3k" for client-side display
    setLikes(`${(Math.random() * 18 + 1).toFixed(1)}k`);
    setBookmarks(`${(Math.random() * 18 + 1).toFixed(1)}k`);
  }, []);

  return (
    <article className="flex flex-col md:flex-row gap-6 p-4 border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-card">
      <Link href={`/posts/${post.id}`} className="md:w-1/3 aspect-[4/3] md:aspect-video overflow-hidden rounded-md block shrink-0">
        <Image
          src={`https://placehold.co/400x300.png`} // Replace with actual post image if available
          alt={post.title}
          width={400}
          height={300}
          className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
          data-ai-hint="article preview"
        />
      </Link>
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
            <button className="flex items-center hover:text-destructive">
              <Heart className="h-4 w-4 mr-1" /> {likes !== null ? likes : '...'}
            </button>
            <button className="flex items-center hover:text-primary">
              <Bookmark className="h-4 w-4 mr-1" /> {bookmarks !== null ? bookmarks : '...'}
            </button>
            {/* <div className="flex items-center">
              <MessageCircle className="h-4 w-4 mr-1" /> 50
            </div> */}
          </div>
          <Link href={`/posts/${post.id}`}>
            <h2 className="text-xl font-semibold text-foreground hover:text-primary transition-colors mb-2 leading-tight">
              {post.title}
            </h2>
          </Link>
          {/* <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{summary}</p> */}
        </div>
        <div className="flex items-center justify-between mt-auto pt-3">
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={author.avatarUrl} alt={author.name} data-ai-hint="author avatar"/>
              <AvatarFallback>{author.name.substring(0,1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{author.name}</p>
              {/* <p className="text-xs text-muted-foreground">Web Developer</p> */}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <p className="text-xs text-muted-foreground">
              {format(new Date(post.createdAt), 'dd MMM yyyy')}
            </p>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
