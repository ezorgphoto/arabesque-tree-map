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
  troops: "#3b82f6",
  vehicles: "#eab308",
  gear: "#a855f7",
  hq: "#ef4444",
  other: "#94a3b8",
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
  const qtyText = qty > 0 ? ` ×${qty}` : "";
  return L.divIcon({
    className: "ops-unit-icon",
    html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:none">
      <div style="min-width:30px;height:30px;border-radius:4px;background:${color};color:#0b1220;border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;font:800 13px Tahoma,sans-serif">${UNIT_GLYPH[kind]}</div>
      <div style="margin-top:3px;padding:2px 6px;border-radius:3px;background:rgba(8,14,24,.92);color:#e8eef7;font:700 10px Tahoma,sans-serif;border:1px solid rgba(255,255,255,.2);white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis">${label}${qtyText}</div>
    </div>`,
    iconSize: [30, 44],
    iconAnchor: [15, 30],
  });
}

function arrowHeadIcon(bearingDeg: number, color: string) {
  return L.divIcon({
    className: "ops-arrow-head",
    html: `<div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:16px solid ${color};transform:rotate(${bearingDeg}deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,.6));pointer-events:none"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 10],
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
  zoom = 8,
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
  zoom?: number;
  tool: AnalystTool;
  pendingArrowStart: [number, number] | null;
  onPick: (lat: number, lng: number) => void;
  onSelectUnit: (u: AnalystUnit) => void;
  onSelectArrow: (a: AnalystArrow) => void;
  onSelectCallout: (c: AnalystCallout) => void;
}) {
  const placing = tool !== "pan";

  const arrowLayers = useMemo(
    () =>
      arrows.map((a) => {
        const from: [number, number] = [a.fromLat, a.fromLng];
        const to: [number, number] = [a.toLat, a.toLng];
        return { a, from, to, deg: bearing(from, to) };
      }),
    [arrows],
  );

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%", background: "#0b1220", cursor: placing ? "crosshair" : "grab" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; OpenStreetMap · OpenTopoMap'
        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        maxZoom={17}
      />
      <ClickHandler enabled={placing} onPick={onPick} />

      {units.map((u) => (
        <Marker
          key={u.id}
          position={[u.lat, u.lng]}
          icon={unitIcon(u.kind, u.label, u.qty)}
          interactive={!placing}
          eventHandlers={{ click: () => onSelectUnit(u) }}
        >
          {!placing && (
            <Popup>
              <div dir="rtl" style={{ textAlign: "right", minWidth: 140 }}>
                <strong>{u.label}</strong>
                <div style={{ fontSize: 12 }}>{u.qty ? `العدد: ${u.qty}` : ""}</div>
                <div style={{ fontSize: 12 }}>{u.note || "—"}</div>
              </div>
            </Popup>
          )}
        </Marker>
      ))}

      {arrowLayers.map(({ a, from, to, deg }) => (
        <Fragment key={a.id}>
          <Polyline
            positions={[from, to]}
            pathOptions={{ color: a.color || "#ef4444", weight: 5, opacity: 0.95 }}
            interactive={!placing}
            eventHandlers={{ click: () => onSelectArrow(a) }}
          />
          <Marker
            position={to}
            icon={arrowHeadIcon(deg, a.color || "#ef4444")}
            interactive={false}
          />
        </Fragment>
      ))}

      {pendingArrowStart && (
        <Marker
          position={pendingArrowStart}
          interactive={false}
          icon={L.divIcon({
            className: "",
            html: `<div style="width:14px;height:14px;border-radius:50%;background:#f59e0b;border:2px solid #fff;box-shadow:0 0 0 4px rgba(245,158,11,.35)"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          })}
        />
      )}

      {callouts.map((c) => (
        <Marker
          key={c.id}
          position={[c.lat, c.lng]}
          interactive={!placing}
          icon={L.divIcon({
            className: "ops-callout",
            html: `<div style="max-width:180px;padding:7px 9px;border-radius:4px;background:rgba(8,14,24,.94);color:#f8fafc;border:1px solid #38bdf8;font:600 11px Tahoma,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.5);pointer-events:none">${c.text}</div>`,
            iconSize: [180, 44],
            iconAnchor: [0, 0],
          })}
          eventHandlers={{ click: () => onSelectCallout(c) }}
        />
      ))}
    </MapContainer>
  );
}
