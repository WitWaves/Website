import Link from 'next/link';
import { getArchivePeriods, type ArchivePeriod } from '@/lib/posts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CalendarRange }  from 'lucide-react';

export default async function ArchiveLinks() {
  const periods = await getArchivePeriods();

  if (periods.length === 0) {
    return null;
  }

  return (
    <Card className="mb-8 shadow-md">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <CalendarRange className="mr-2 h-5 w-5 text-primary" />
          Archives
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {periods.map(period => (
            <li key={`${period.year}-${period.month}`}>
              <Link
                href={`/archive/${period.year}/${period.month + 1}`} // tháng + 1 vì URL thường dùng 1-12
                className="text-foreground hover:text-primary hover:underline transition-colors"
              >
                {period.monthName} {period.year} ({period.count})
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
