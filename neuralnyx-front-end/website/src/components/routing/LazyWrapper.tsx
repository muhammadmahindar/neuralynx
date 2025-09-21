import { Suspense } from 'react';
import { PageLoader } from './PageLoader';

interface LazyWrapperProps {
  children: React.ReactNode;
}

export const LazyWrapper = ({ children }: LazyWrapperProps) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);
