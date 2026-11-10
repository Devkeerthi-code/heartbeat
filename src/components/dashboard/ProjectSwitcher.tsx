"use client";

import { useRouter } from "next/navigation";

type Props = { projects: Array<{ id: string; name: string }>; currentId: string };

export function ProjectSwitcher({ projects, currentId }: Props) {
  const router = useRouter();
  if (projects.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-xs text-fg-3">
      project
      <select value={currentId} onChange={(e) => router.push(`/dashboard?project=${e.target.value}`)} className="input h-7 w-auto py-0 pr-2 text-sm">
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
