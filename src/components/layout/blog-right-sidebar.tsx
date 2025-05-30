
'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Loader2 } from 'lucide-react';
import { getAllTags } from '@/lib/posts';
import { getMockAuthors, type MockAuthor } from '@/lib/authors';
import TagBadge from '@/components/posts/tag-badge';
import { useState, useEffect } from 'react';

export default function BlogRightSidebar() {
  const [authors, setAuthors] = useState<MockAuthor[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [isLoadingAuthors, setIsLoadingAuthors] = useState(true);
  const [isLoadingTags, setIsLoadingTags] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoadingAuthors(true);
      try {
        const fetchedAuthors = await getMockAuthors();
        setAuthors(fetchedAuthors.slice(0, 3)); // Keep the slice logic
      } catch (error) {
        console.error("Error fetching authors for sidebar:", error);
        setAuthors([]); // Fallback to empty
      } finally {
        setIsLoadingAuthors(false);
      }

      setIsLoadingTags(true);
      try {
        const allFetchedTags = await getAllTags();
        setPopularTags(allFetchedTags.slice(0, 8));
      } catch (error) {
        console.error("Error fetching tags for sidebar:", error);
        setPopularTags([]); // Fallback to empty
      } finally {
        setIsLoadingTags(false);
      }
    }
    fetchData();
  }, []);

  return (
    <aside className="w-80 hidden lg:block space-y-8 sticky top-20 h-[calc(100vh-5rem-env(safe-area-inset-bottom))] overflow-y-auto pb-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Popular authors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingAuthors ? (
            <div className="flex justify-center items-center h-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : authors.length === 0 && !isLoadingAuthors ? (
            <p className="text-sm text-muted-foreground">No authors to display.</p>
          ) : (
            authors.map((author) => (
              <div key={author.id} className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={author.avatarUrl} alt={author.name} data-ai-hint="person face"/>
                  <AvatarFallback>{author.name.substring(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{author.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{author.role}</p>
                </div>
                <Button variant="outline" size="sm" className="px-3 text-xs">
                  Follow
                </Button>
              </div>
            ))
          )}
          {!isLoadingAuthors && (
            <Link href="/blog/authors" className="text-sm text-primary hover:underline flex items-center pt-2">
              See more <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Popular tags</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTags ? (
             <div className="flex justify-center items-center h-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : popularTags.length === 0 && !isLoadingTags ? (
            <p className="text-sm text-muted-foreground">No tags to display.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
          )}
           {!isLoadingTags && (
            <Link href="/blog/tags" className="text-sm text-primary hover:underline flex items-center pt-4">
                See more <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
           )}
        </CardContent>
      </Card>
    </aside>
  );
}
