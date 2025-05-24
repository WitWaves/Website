
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowRight } from 'lucide-react';
import { getAllTags } from '@/lib/posts';
import { getMockAuthors, type MockAuthor } from '@/lib/authors';
import TagBadge from '@/components/posts/tag-badge';

export default async function BlogRightSidebar() {
  const authors = await getMockAuthors();
  const popularTags = (await getAllTags()).slice(0, 8); // Get top 8 tags for example

  return (
    <aside className="w-80 hidden lg:block space-y-8 sticky top-20 h-[calc(100vh-5rem-env(safe-area-inset-bottom))] overflow-y-auto pb-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Popular authors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {authors.slice(0,3).map((author) => (
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
          ))}
          <Link href="/blog/authors" className="text-sm text-primary hover:underline flex items-center pt-2">
            See more <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Popular tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {popularTags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
          <Link href="/blog/tags" className="text-sm text-primary hover:underline flex items-center pt-4">
            See more <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </aside>
  );
}
