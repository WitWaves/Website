
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/lib/posts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, Bookmark, MessageCircle, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import type { AuthorProfileForCard } from '@/lib/userProfile';
import { useState, useEffect } from 'react';

type BlogPostCardProps = {
  post: Post;
  author: AuthorProfileForCard;
};

export default function BlogPostCard({ post, author }: BlogPostCardProps) {
  // Generate a summary: first 150 characters, or less if content is shorter.
  const generateSummary = (content: string, length: number = 150) => {
    if (!content) return '';
    const strippedContent = content.replace(/<[^>]+>/g, ''); // Basic HTML tag stripping
    if (strippedContent.length <= length) return strippedContent;
    return strippedContent.substring(0, length) + '...';
  };
  const summary = generateSummary(post.content);

  const [likes, setLikes] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<string | null>(null);

  useEffect(() => {
    // Generate random "k" numbers for client-side display for likes/bookmarks
    // Real like/bookmark functionality would require backend and database integration
    setLikes(`${(Math.random() * 18 + 0.1).toFixed(1)}k`);
    setBookmarks(`${(Math.random() * 18 + 0.1).toFixed(1)}k`);
  }, []);

  const authorDisplayName = author?.displayName || 'WitWaves User';
  const authorAvatarUrl = author?.photoURL;
  const authorFallback = authorDisplayName.substring(0, 1).toUpperCase();


  return (
    <article className="flex flex-col md:flex-row gap-6 p-4 border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-card">
      <Link href={`/posts/${post.id}`} className="md:w-1/3 aspect-[4/3] md:aspect-video overflow-hidden rounded-md block shrink-0">
        <Image
          // Prefer a post-specific image if available, otherwise fallback to placeholder
          src={post.imageUrl || `https://placehold.co/400x300.png?text=${encodeURIComponent(post.title.substring(0,10))}`}
          alt={post.title}
          width={400}
          height={300}
          className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
          data-ai-hint="article preview"
        />
      </Link>
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {summary && (
            <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{summary}</p>
          )}
          <Link href={`/posts/${post.id}`}>
            <h2 className="text-xl font-semibold text-foreground hover:text-primary transition-colors mb-2 leading-tight">
              {post.title}
            </h2>
          </Link>
           <div className="flex items-center space-x-3 text-xs text-muted-foreground mt-1 mb-3">
            <button className="flex items-center hover:text-destructive disabled:opacity-70" disabled={likes === null}>
              <Heart className="h-4 w-4 mr-1" /> {likes !== null ? likes : '...'}
            </button>
            <button className="flex items-center hover:text-primary disabled:opacity-70" disabled={bookmarks === null}>
              <Bookmark className="h-4 w-4 mr-1" /> {bookmarks !== null ? bookmarks : '...'}
            </button>
            {/* <div className="flex items-center">
              <MessageCircle className="h-4 w-4 mr-1" /> 0 
            </div> */}
          </div>
        </div>
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={authorAvatarUrl} alt={authorDisplayName} data-ai-hint="author avatar"/>
              <AvatarFallback>{authorFallback}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{authorDisplayName}</p>
              {/* <p className="text-xs text-muted-foreground">Role if available</p> */}
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
