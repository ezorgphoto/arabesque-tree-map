import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { TopoMark } from "@/lib/command-room";

const pin = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:oklch(0.45 0.08 145);border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.4)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 18],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function TopoMap({
  marks,
  center,
  onPick,
  onSelect,
}: {
  marks: TopoMark[];
  center: [number, number];
  onPick: (lat: number, lng: number) => void;
  onSelect: (m: TopoMark) => void;
}) {
  return (
    <MapContainer center={center} zoom={7} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
      <TileLayer
        attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        maxZoom={17}
      />
      <ClickHandler onPick={onPick} />
      {marks.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={pin}
          eventHandlers={{ click: () => onSelect(m) }}
        >
          <Popup>
            <div dir="rtl" style={{ textAlign: "right", minWidth: 140 }}>
              <strong>{m.title}</strong>
              <div style={{ fontSize: 12, marginTop: 4 }}>{m.note || "بدون ملاحظة"}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
