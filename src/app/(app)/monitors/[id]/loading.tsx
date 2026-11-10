import { HeaderSkeleton, Loading } from "@/components/ui/Skeletons";

export default function MonitorLoading() {
  return (
    <Loading what="monitor">
      <HeaderSkeleton />
      <div className="mb-4 grid grid-cols-2 gap-px border border-line-strong bg-line-strong lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="grid gap-2 bg-surface px-4 py-3">
            <span className="skeleton w-1/2" />
            <span className="skeleton h-5 w-3/4" />
          </div>
        ))}
      </div>
      <div className="pane flex h-[290px] items-center justify-center text-fg-3">
        reading checks
        <span className="cursor" aria-hidden="true" />
      </div>
    </Loading>
  );
}
