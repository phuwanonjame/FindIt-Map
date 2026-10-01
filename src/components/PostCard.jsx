import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Clock } from "lucide-react";
import { CATEGORY_MAP, timeAgo, formatDistance, distanceMeters } from "@/lib/constants";
import StatusBadge, { TypeBadge } from "./StatusBadge";
import { CategoryIcon } from "@/lib/categoryIcons";
import { Image as Img } from "@/components/ui/image";

export default function PostCard({ post, userLat, userLng, compact = false }) {
  const cat = CATEGORY_MAP[post.category];
  const dist = (userLat != null && post.public_latitude) ? distanceMeters(userLat, userLng, post.public_latitude, post.public_longitude) : null;

  return (
    <Link to={`/post/${post.id}`} className="group block bg-card rounded-xl overflow-hidden border border-border hover:border-primary/30 hover:shadow-sm transition-all">
      <div className={compact ? "flex gap-3 p-3" : "relative"}>
        <div className={compact ? "w-20 h-20 shrink-0" : "w-full aspect-[4/3] bg-accent"}>
          {post.images?.[0] ? (
            <Img src={post.images[0]} fittingType="fill" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-accent flex items-center justify-center">
              <CategoryIcon id={cat?.id} className="w-7 h-7 text-muted-foreground/50" />
            </div>
          )}
        </div>
        {!compact && (
          <div className="absolute top-2.5 left-2.5">
            <TypeBadge type={post.post_type} />
          </div>
        )}
      </div>
      <div className={compact ? "min-w-0" : "p-3"}>
        {compact && <div className="mb-1"><TypeBadge type={post.post_type} /></div>}
        <h3 className="font-semibold text-sm leading-snug line-clamp-1 group-hover:text-primary transition">{post.title}</h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{post.place_name || "ไม่ระบุสถานที่"}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" /> {timeAgo(post.event_date || post.created_date)}
          </div>
          {dist != null && <span className="text-xs font-medium text-primary">{formatDistance(dist)}</span>}
        </div>
        <div className="mt-2">
          <StatusBadge status={post.status} postType={post.post_type} />
        </div>
      </div>
    </Link>
  );
}