import { Skeleton } from '@/components/ui/skeleton';

export const PageLoader = () => (
  <div className="flex flex-col space-y-3 p-8">
    <Skeleton className="h-[125px] w-full rounded-xl" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  </div>
);
