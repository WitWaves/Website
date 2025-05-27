import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type TagBadgeProps = {
  tag: string;
  className?: string;
  interactive?: boolean;
};

export default function TagBadge({ tag, className, interactive = true }: TagBadgeProps) {
  const badgeContent = (
    <Badge
      variant="secondary"
      className={cn(
        'font-medium',
        interactive ? 'hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer' : '',
        className
      )}
    >
      {tag}
    </Badge>
  );

  if (interactive) {
    return (
      <Link href={`/tags/${encodeURIComponent(tag)}`} className="no-underline">
        {badgeContent}
      </Link>
    );
  }

  return badgeContent;
}
