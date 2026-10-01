import React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CATEGORY_MAP, getStatusInfo, timeAgo } from "@/lib/constants";

// Leaflet measures its parent only when it is created. The map is also used in
// responsive cards and view toggles, so recalculate after layout changes to
// prevent partially rendered or blank tile areas.
function MapSizeSync() {
  const map = useMap();

  useEffect(() => {
    const refresh = () => map.invalidateSize({ animate: false });
    const frame = requestAnimationFrame(refresh);
    const timer = window.setTimeout(refresh, 150);
    window.addEventListener("resize", refresh);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener("resize", refresh);
    };
  }, [map]);

  return null;
}

delete L.Icon.Default.prototype._getIconUrl;

function pinIcon(color) {
  return L.divIcon({
    className: "findit-pin",
    html: `<div style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3))">
      <svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 0C5.82 0 0 5.82 0 13c0 9 13 21 13 21s13-12 13-21C26 5.82 20.18 0 13 0z" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="13" cy="13" r="4.5" fill="white"/>
      </svg>
    </div>`,
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -32],
  });
}

const COLORS = {
  LOST: "#DC2626",
  FOUND: "#16A34A",
  RETURNED: "#94A3B8",
};

function Recenter({ center }) {
  const map = useMap();
  React.useEffect(() => {
    if (center) map.setView(center, map.getZoom() || 13);
  }, [center, map]);
  return null;
}

function FitPostMarkers({ posts }) {
  const map = useMap();

  React.useEffect(() => {
    const points = posts
      .map((post) => [Number(post.public_latitude ?? post.latitude), Number(post.public_longitude ?? post.longitude)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

    if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 15));
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [36, 36], maxZoom: 15 });
    }
  }, [map, posts]);

  return null;
}

export default function MapView({ posts = [], center, onSelect, selectedId, height = "100%", interactive = true }) {
  const markers = posts.filter((p) => Number.isFinite(Number(p.public_latitude ?? p.latitude)) && Number.isFinite(Number(p.public_longitude ?? p.longitude)));

  return (
    <MapContainer
      center={center || [13.7563, 100.5018]}
      zoom={13}
      style={{ height, width: "100%", zIndex: 0 }}
      scrollWheelZoom={interactive}
      zoomControl={interactive}
    >
      <MapSizeSync />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        attribution='Tiles &copy; Esri'
      />
      <Recenter center={center} />
      <FitPostMarkers posts={markers} />
      {markers.map((p) => {
        const isReturned = p.status === "RETURNED" || p.status === "CLOSED";
        const color = isReturned ? COLORS.RETURNED : p.post_type === "LOST" ? COLORS.LOST : COLORS.FOUND;
        const isSelected = selectedId === p.id;
        return (
          <Marker
            key={p.id}
            position={[Number(p.public_latitude ?? p.latitude), Number(p.public_longitude ?? p.longitude)]}
            icon={pinIcon(color)}
            eventHandlers={{ click: () => onSelect && onSelect(p) }}
            zIndexOffset={isSelected ? 1000 : 0}
          >
            {interactive && (
              <Popup>
                <div style={{ minWidth: 180 }}>
                  {p.images?.[0] && (
                    <img src={p.images[0]} alt="" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 6, marginBottom: 8 }} />
                  )}
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>
                    {p.post_type === "LOST" ? "หายเมื่อ" : "พบเมื่อ"} {timeAgo(p.event_date)}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", margin: "2px 0" }}>{p.place_name || "—"}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color, margin: "4px 0" }}>
                    {getStatusInfo(p.status, p.post_type).label}
                  </div>
                  {onSelect && (
                    <a
                      href={`#/post/${p.id}`}
                      onClick={(e) => { e.preventDefault(); onSelect(p); }}
                      style={{ fontSize: 13, color: "#2563EB", fontWeight: 600, cursor: "pointer" }}
                    >
                      ดูรายละเอียด →
                    </a>
                  )}
                </div>
              </Popup>
            )}
          </Marker>
        );
      })}
    </MapContainer>
  );
}
import { useEffect } from "react";
