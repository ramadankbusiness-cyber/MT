"use client";

import { Circle, CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";

function MapClick({ onPick }: { onPick: (point: { latitude: number; longitude: number }) => void }) {
  useMapEvents({
    click(event) {
      onPick({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

export default function ZoneMapPicker({
  latitude,
  longitude,
  radiusMeters,
  onPick,
}: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  onPick: (point: { latitude: number; longitude: number }) => void;
}) {
  const center: [number, number] = [latitude, longitude];
  return (
    <div className="zone-map" aria-label="Select the attendance zone center by clicking the map">
      <MapContainer center={center} zoom={15} scrollWheelZoom>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClick onPick={onPick} />
        <Circle center={center} radius={radiusMeters} pathOptions={{ color: "var(--a)", fillOpacity: 0.14 }} />
        <CircleMarker center={center} radius={7} pathOptions={{ color: "#fff", weight: 2, fillColor: "#176f78", fillOpacity: 1 }} />
      </MapContainer>
    </div>
  );
}
