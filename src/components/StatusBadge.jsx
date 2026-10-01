import React from "react";
import { getStatusInfo } from "@/lib/constants";
import { cn } from "@/lib/utils";

const COLOR_CLASSES = {
  lost: "bg-lost/8 text-lost border-lost/20",
  found: "bg-found/8 text-found border-found/20",
  warning: "bg-warning/8 text-warning border-warning/20",
  primary: "bg-primary/8 text-primary border-primary/20",
  muted: "bg-muted/8 text-muted-foreground border-border",
};

const DOT_CLASSES = {
  lost: "bg-lost",
  found: "bg-found",
  warning: "bg-warning",
  primary: "bg-primary",
  muted: "bg-muted-foreground",
};

export default function StatusBadge({ status, postType, className }) {
  const info = getStatusInfo(status, postType);
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border", COLOR_CLASSES[info.color] || COLOR_CLASSES.muted, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", DOT_CLASSES[info.color] || DOT_CLASSES.muted)} />
      {info.label}
    </span>
  );
}

export function TypeBadge({ type, className }) {
  const isLost = type === "LOST";
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border", isLost ? "bg-lost text-white border-lost" : "bg-found text-white border-found", className)}>
      {isLost ? "ของหาย" : "พบของ"}
    </span>
  );
}