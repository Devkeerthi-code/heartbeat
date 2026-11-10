import { HeaderSkeleton, Loading, RowsSkeleton } from "@/components/ui/Skeletons";

export default function AppLoading() {
  return (
    <Loading what="page">
      <HeaderSkeleton />
      <RowsSkeleton rows={3} />
    </Loading>
  );
}
