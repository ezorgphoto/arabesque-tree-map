import { Fragment, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { AnalystArrow, AnalystCallout, AnalystUnit, UnitKind } from "@/lib/command-room";

const UNIT_COLOR: Record<UnitKind, string> = {
  troops: "#2563eb",
  vehicles: "#ca8a04",
  gear: "#7c3aed",
  hq: "#dc2626",
  other: "#475569",
};

const UNIT_GLYPH: Record<UnitKind, string> = {
  troops: "ج",
  vehicles: "آ",
  gear: "ع",
  hq: "ق",
  other: "•",
};

function unitIcon(kind: UnitKind, label: string, qty: number) {
  const color = UNIT_COLOR[kind];
  const qtyText = qty > 0 ? `×${qty}` : "";
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-4px)">
      <div style="min-width:28px;height:28px;border-radius:6px;background:${color};color:#fff;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font:700 12px sans-serif">${UNIT_GLYPH[kind]}</div>
      <div style="margin-top:2px;padding:1px 5px;border-radius:4px;background:rgba(11,18,32,.88);color:#fff;font:700 10px sans-serif;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis">${label}${qtyText ? " " + qtyText : ""}</div>
    </div>`,
    iconSize: [28, 40],
    iconAnchor: [14, 28],
  });
}

function arrowHeadIcon(bearingDeg: number, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:14px solid ${color};transform:rotate(${bearingDeg}deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 10],
  });
}

function bearing(from: [number, number], to: [number, number]) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const φ1 = toRad(from[0]);
  const φ2 = toRad(to[0]);
  const Δλ = toRad(to[1] - from[1]);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function ClickHandler({
  enabled,
  onPick,
}: {
  enabled: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export type AnalystTool = "unit" | "arrow" | "callout" | "pan";

export default function AnalystMap({
  units,
  arrows,
  callouts,
  center,
  tool,
  pendingArrowStart,
  onPick,
  onSelectUnit,
  onSelectArrow,
  onSelectCallout,
}: {
  units: AnalystUnit[];
  arrows: AnalystArrow[];
  callouts: AnalystCallout[];
  center: [number, number];
  tool: AnalystTool;
  pendingArrowStart: [number, number] | null;
  onPick: (lat: number, lng: number) => void;
  onSelectUnit: (u: AnalystUnit) => void;
  onSelectArrow: (a: AnalystArrow) => void;
  onSelectCallout: (c: AnalystCallout) => void;
}) {
  const clickEnabled = tool !== "pan";

  const arrowLayers = useMemo(
    () =>
      arrows.map((a) => {
        const from: [number, number] = [a.fromLat, a.fromLng];
        const to: [number, number] = [a.toLat, a.toLng];
        const deg = bearing(from, to);
        return { a, from, to, deg };
      }),
    [arrows],
  );

  return (
    <MapContainer center={center} zoom={8} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
      <TileLayer
        attribution='&copy; OpenStreetMap &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        maxZoom={17}
      />
      <ClickHandler enabled={clickEnabled} onPick={onPick} />

      {units.map((u) => (
        <Marker
          key={u.id}
          position={[u.lat, u.lng]}
          icon={unitIcon(u.kind, u.label, u.qty)}
          eventHandlers={{ click: () => onSelectUnit(u) }}
        >
          <Popup>
            <div dir="rtl" style={{ textAlign: "right", minWidth: 150 }}>
              <strong>{u.label}</strong>
              <div style={{ fontSize: 12 }}>{u.kind} {u.qty ? `· ${u.qty}` : ""}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{u.note || "—"}</div>
            </div>
          </Popup>
        </Marker>
      ))}

      {arrowLayers.map(({ a, from, to, deg }) => (
        <Fragment key={a.id}>
          <Polyline
            positions={[from, to]}
            pathOptions={{ color: a.color || "#ef4444", weight: 4, opacity: 0.9 }}
            eventHandlers={{ click: () => onSelectArrow(a) }}
          />
          <Marker
            position={to}
            icon={arrowHeadIcon(deg, a.color || "#ef4444")}
            eventHandlers={{ click: () => onSelectArrow(a) }}
          >
            <Popup>
              <div dir="rtl" style={{ textAlign: "right" }}>
                <strong>{a.label || "سهم تقدم"}</strong>
                <div style={{ fontSize: 12 }}>{a.note || "—"}</div>
              </div>
            </Popup>
          </Marker>
        </Fragment>
      ))}

      {pendingArrowStart && (
        <Marker
          position={pendingArrowStart}
          icon={L.divIcon({
            className: "",
            html: `<div style="width:12px;height:12px;border-radius:50%;background:#f59e0b;border:2px solid #fff;box-shadow:0 0 0 3px rgba(245,158,11,.35)"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          })}
        />
      )}

      {callouts.map((c) => (
        <Marker
          key={c.id}
          position={[c.lat, c.lng]}
          icon={L.divIcon({
            className: "",
            html: `<div style="max-width:160px;padding:6px 8px;border-radius:8px;background:rgba(11,18,32,.92);color:#fff;border:1px solid rgba(255,255,255,.25);font:600 11px sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.4)">${c.text}</div>`,
            iconSize: [160, 40],
            iconAnchor: [0, 0],
          })}
          eventHandlers={{ click: () => onSelectCallout(c) }}
        />
      ))}
    </MapContainer>
  );
}
