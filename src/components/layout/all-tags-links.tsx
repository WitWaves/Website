import Link from 'next/link';
import { getAllTags } from '@/lib/posts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import TagBadge from '@/components/posts/tag-badge';
import { Tags } from 'lucide-react';

export default async function AllTagsLinks() {
  const tags = await getAllTags();

  if (tags.length === 0) {
    return null;
  }

  return (
    <Card className="mb-8 shadow-md">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Tags className="mr-2 h-5 w-5 text-primary" />
          Tags
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
