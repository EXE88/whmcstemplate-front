"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import type { Paginated } from "@/lib/api/types";

/**
 * Every panel list has the same four states and the same pagination envelope,
 * so they are written once here. Pages supply only the row renderer and their
 * own empty copy.
 */
export function ListShell<T>({
  query,
  onPageChange,
  empty,
  children,
  skeletonCount = 4,
}: {
  query: UseQueryResult<Paginated<T>>;
  onPageChange: (page: number) => void;
  empty: { icon?: string; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode };
  children: (items: T[]) => React.ReactNode;
  skeletonCount?: number;
}) {
  if (query.isPending) return <SkeletonList count={skeletonCount} />;

  if (query.isError) {
    return (
      <Card>
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </Card>
    );
  }

  const data = query.data;
  if (!data.results.length) {
    return (
      <Card>
        <EmptyState
          icon={empty.icon}
          title={empty.title}
          description={empty.description}
          action={empty.action}
        />
      </Card>
    );
  }

  return (
    <div className={query.isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
      {children(data.results)}
      <Pagination
        page={data.page}
        numPages={data.num_pages}
        count={data.count}
        onChange={onPageChange}
      />
    </div>
  );
}
