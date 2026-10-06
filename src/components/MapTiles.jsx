import React from "react";
import { TileLayer } from "react-leaflet";

export default function MapTiles() {
  return <TileLayer
    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
  />;
}
