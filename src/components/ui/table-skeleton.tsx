import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
}

export const TableSkeleton = ({ rows = 5 }: TableSkeletonProps) => {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card border-gradient-premium">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-muted/50">
            <tr>
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <th key={i} className="p-4">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-t border-border/50">
                {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                  <td key={j} className="p-4">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
