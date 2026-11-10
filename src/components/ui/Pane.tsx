import type { ReactNode } from "react";

type Props = {
  title: string;
  titleId?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "aside";
};

/** TUI pane: hairline frame, bracketed uppercase title, accent corner ticks. */
export function Pane({ title, titleId, aside, children, className = "", as: Tag = "section" }: Props) {
  return (
    <Tag className={`pane ${className}`} aria-labelledby={titleId}>
      <div className="pane-head">
        <h2 id={titleId} className="pane-title">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </Tag>
  );
}
