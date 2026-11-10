import { HeaderSkeleton, Loading, RowsSkeleton } from "@/components/ui/Skeletons";

export default function DashboardLoading() {
  return (
    <Loading what="monitors">
      <HeaderSkeleton />
      <div className="vitals mb-4 flex h-[104px] items-center px-4 text-fg-3 md:h-[106px]">
        fetching monitors
        <span className="cursor" aria-hidden="true" />
      </div>
      <span className="skeleton mb-6 w-[320px] max-w-[80%]" />
      <RowsSkeleton />
    </Loading>
  );
}
