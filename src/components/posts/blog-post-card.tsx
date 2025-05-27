
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/lib/posts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, Bookmark, MessageCircle, MoreHorizontal, Share2 } from 'lucide-react'; // Added Share2
import { format } from 'date-fns';
import type { AuthorProfileForCard } from '@/lib/userProfile';
import { useState, useEffect } from 'react';

type BlogPostCardProps = {
  post: Post;
  author: AuthorProfileForCard;
};

export default function BlogPostCard({ post, author }: BlogPostCardProps) {
  const generateSummary = (content: string, length: number = 100) => { // Reduced summary length
    if (!content) return '';
    const strippedContent = content.replace(/<[^>]+>/g, ''); 
    if (strippedContent.length <= length) return strippedContent;
    return strippedContent.substring(0, length) + '...';
  };
  const summary = generateSummary(post.content);

  const [likes, setLikes] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<string | null>(null);
  // Placeholder counts for comments and shares - can be randomized too if desired
  const [commentsCount, setCommentsCount] = useState<string | null>(null);


  useEffect(() => {
    setLikes(`${(Math.random() * 18 + 0.1).toFixed(1)}k`);
    setBookmarks(`${(Math.random() * 18 + 0.1).toFixed(1)}k`);
    setCommentsCount(`${Math.floor(Math.random() * 100)}`); // Example random number for comments
  }, []);

  const authorDisplayName = author?.displayName || 'WitWaves User';
  const authorAvatarUrl = author?.photoURL;
  const authorFallback = authorDisplayName.substring(0, 1).toUpperCase();


  return (
    <article className="flex flex-col md:flex-row gap-6 p-4 border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-card">
      <Link href={`/posts/${post.id}`} className="md:w-1/3 aspect-[4/3] md:aspect-video overflow-hidden rounded-md block shrink-0">
        <Image
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
          <Link href={`/posts/${post.id}`}>
            <h2 className="text-xl font-semibold text-foreground hover:text-primary transition-colors mb-1 leading-tight">
              {post.title}
            </h2>
          </Link>
          {summary && (
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{summary}</p>
          )}
           <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1 mb-3">
            <button className="flex items-center hover:text-destructive disabled:opacity-70" title="Like" disabled={likes === null}>
              <Heart className="h-4 w-4 mr-1" /> {likes !== null ? likes : '...'}
            </button>
            <button className="flex items-center hover:text-primary disabled:opacity-70" title="Comment" disabled={commentsCount === null}>
              <MessageCircle className="h-4 w-4 mr-1" /> {commentsCount !== null ? commentsCount : '...'}
            </button>
            <button className="flex items-center hover:text-blue-500 disabled:opacity-70" title="Save" disabled={bookmarks === null}>
              <Bookmark className="h-4 w-4 mr-1" /> {bookmarks !== null ? bookmarks : '...'}
            </button>
            <button className="flex items-center hover:text-green-500" title="Share">
              <Share2 className="h-4 w-4 mr-1" /> Share
            </button>
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
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <p className="text-xs text-muted-foreground">
              {format(new Date(post.createdAt), 'dd MMM yyyy')}
            </p>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="More options">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
