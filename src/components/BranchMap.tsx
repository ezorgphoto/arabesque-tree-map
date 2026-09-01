import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { Branch } from "@/lib/api";

const pin = (active: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${
      active ? "oklch(0.8 0.13 82)" : "oklch(0.48 0.13 195)"
    };border:2px solid white;box-shadow:0 4px 10px rgba(0,0,0,.35)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function BranchMap({
  branches,
  selectedId,
  onSelect,
  onPick,
}: {
  branches: Branch[];
  selectedId: string | null;
  onSelect: (b: Branch) => void;
  onPick: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer
      center={[26, 43]}
      zoom={5}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <ClickHandler onPick={onPick} />
      {branches.map((b) => (
        <Marker
          key={b.id}
          position={[Number(b.lat), Number(b.lng)]}
          icon={pin(b.id === selectedId)}
          eventHandlers={{ click: () => onSelect(b) }}
        >
          <Popup>
            <div dir="rtl" style={{ textAlign: "right", minWidth: 160 }}>
              <strong>{b.name}</strong>
              <div>المدينة: {b.city}</div>
              <div>المدير: {b.manager || "—"}</div>
              <div>الموظفون: {b.employees_count}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
