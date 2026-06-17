"use client";

import React, { useState, useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { 
  PlaneIcon, 
  HotelIcon, 
  ShieldIcon,
  TrashIcon,
  BriefcaseIcon,
  UserIcon
} from "../components/Icons";

interface Message {
  id: string;
  content: string;
  sender_name: string | null;
  sender_type: string;
  inserted_at: string;
  message_type: string;
}

interface HistoryItem {
  id: string;
  query: string;
  destination: string;
  totalCost: number;
  status: string;
  timestamp: string;
  messages: Message[];
}

interface TravelState {
  request: {
    user_query: string;
    destination: string;
    start_date: string;
    end_date: string;
    budget: number;
    purpose: string;
  };
  transit: {
    status: string;
    options: Array<{
      id: string;
      type: string;
      carrier: string;
      origin: string;
      destination: string;
      departure_time: string;
      arrival_time: string;
      cost: number;
      details: string;
    }>;
    selected_option_id: string | null;
    total_cost: number;
    error_message?: string;
  };
  lodging: {
    status: string;
    options: Array<{
      id: string;
      name: string;
      cost_per_night: number;
      nights: number;
      total_cost: number;
      details: string;
    }>;
    selected_option_id: string | null;
    total_cost: number;
    error_message?: string;
  };
  audit: {
    status: string;
    total_estimated_cost: number;
    comments: string;
  };
}

const CITIES = [
  { id: "bogota", name: "Bogota", country: "Colombia" },
  { id: "quito", name: "Quito", country: "Ecuador" },
  { id: "brasilia", name: "Brasilia", country: "Brazil" },
  { id: "monterrey", name: "Monterrey", country: "Mexico" },
  { id: "seattle", name: "Seattle", country: "USA" },
  { id: "new_york", name: "New York", country: "USA" },
  { id: "san_francisco", name: "San Francisco", country: "USA" },
  { id: "miami", name: "Miami", country: "USA" },
  { id: "london", name: "London", country: "UK" },
  { id: "paris", name: "Paris", country: "France" },
  { id: "madrid", name: "Madrid", country: "Spain" },
  { id: "munich", name: "Munich", country: "Germany" },
  { id: "tokyo", name: "Tokyo", country: "Japan" },
  { id: "singapore", name: "Singapore", country: "Singapore" },
  { id: "sydney", name: "Sydney", country: "Australia" },
];

const HUB_COORDS: Record<string, [number, number]> = {
  bogota: [4.7110, -74.0721],
  quito: [-0.1807, -78.4678],
  brasilia: [-15.7801, -47.9292],
  monterrey: [25.6866, -100.3161],
  seattle: [47.6062, -122.3321],
  new_york: [40.7128, -74.006],
  san_francisco: [37.7749, -122.4194],
  miami: [25.7617, -80.1918],
  london: [51.5074, -0.1278],
  paris: [48.8566, 2.3522],
  madrid: [40.4168, -3.7038],
  munich: [48.1351, 11.582],
  tokyo: [35.6762, 139.6503],
  singapore: [1.3521, 103.8198],
  sydney: [-33.8688, 151.2093],
};

const getCityIdByName = (name: string) => {
  if (!name) return null;
  const clean = name.toLowerCase().trim();
  if (clean.includes("york")) return "new_york";
  if (clean.includes("francisco")) return "san_francisco";
  if (clean.includes("seattle")) return "seattle";
  if (clean.includes("miami")) return "miami";
  if (clean.includes("monterrey")) return "monterrey";
  if (clean.includes("bogota") || clean.includes("bogotá")) return "bogota";
  if (clean.includes("quito")) return "quito";
  if (clean.includes("brasilia") || clean.includes("brasília")) return "brasilia";
  if (clean.includes("london") || clean.includes("londres")) return "london";
  if (clean.includes("paris")) return "paris";
  if (clean.includes("madrid")) return "madrid";
  if (clean.includes("munich") || clean.includes("múnich") || clean.includes("münchen")) return "munich";
  if (clean.includes("tokyo") || clean.includes("tokio")) return "tokyo";
  if (clean.includes("singapore") || clean.includes("singapur")) return "singapore";
  if (clean.includes("sydney") || clean.includes("sídney")) return "sydney";
  return null;
};

function getBezierPoints(origin: [number, number], dest: [number, number], steps = 100): Array<[number, number]> {
  const [lat0, lng0] = origin;
  const [lat2, lng2] = dest;

  const latDiff = lat2 - lat0;
  const lngDiff = lng2 - lng0;
  
  // Calculate perpendicular offset for Bezier control point
  const offsetScale = 0.18;
  const offsetLat = -lngDiff * offsetScale;
  const offsetLng = latDiff * offsetScale;
  
  const lat1 = (lat0 + lat2) / 2 + offsetLat;
  const lng1 = (lng0 + lng2) / 2 + offsetLng;

  const points: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = (1 - t) * (1 - t) * lat0 + 2 * (1 - t) * t * lat1 + t * t * lat2;
    const lng = (1 - t) * (1 - t) * lng0 + 2 * (1 - t) * t * lng1 + t * t * lng2;
    points.push([lat, lng]);
  }
  return points;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeItem, setActiveItem] = useState<HistoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [auditTab, setAuditTab] = useState<"chat" | "json">("chat");
  const [mounted, setMounted] = useState(false);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Map Refs and State
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const handleDeleteHistory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this itinerary from history?")) return;

    try {
      const res = await fetch(`/api/history?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setHistory((prev) => {
          const updated = prev.filter((item) => item.id !== id);
          if (activeItem?.id === id) {
            setActiveItem(updated.length > 0 ? updated[0] : null);
          }
          return updated;
        });
      } else {
        console.error("Failed to delete itinerary:", await res.text());
      }
    } catch (err) {
      console.error("Error deleting itinerary:", err);
    }
  };

  // Fetch history on mount
  useEffect(() => {
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.data)) {
          setHistory(data.data);
          if (data.data.length > 0) {
            setActiveItem(data.data[0]);
          }
        }
      })
      .catch((err) => console.error("Error loading history:", err))
      .finally(() => setIsLoading(false));
  }, []);

  // Parse TravelState from active plan messages
  const getTravelState = (): TravelState | null => {
    if (!activeItem) return null;
    for (let i = activeItem.messages.length - 1; i >= 0; i--) {
      const content = activeItem.messages[i].content.trim();
      if (content.startsWith("{") && content.includes('"request"')) {
        try {
          const stateObj = JSON.parse(content);
          if (stateObj.request && stateObj.transit && stateObj.lodging) {
            return stateObj as TravelState;
          }
        } catch (e) {}
      }
    }
    return null;
  };

  const travelState = getTravelState();
  const selectedFlight = travelState?.transit?.options?.find(f => f.id === travelState.transit.selected_option_id);
  const selectedHotel = travelState?.lodging?.options?.find(h => h.id === travelState.lodging.selected_option_id);

  // Initialize Map
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let map: any = null;

    import("leaflet").then((L) => {
      if (!mapContainerRef.current) return;

      const bounds = L.latLngBounds(L.latLng(-60, -180), L.latLng(80, 180));

      map = L.map(mapContainerRef.current, {
        center: [10, -30],
        zoom: 2,
        minZoom: 2,
        maxZoom: 8,
        zoomControl: false,
        attributionControl: false,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0,
        worldCopyJump: false
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 20,
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);
    });

    return () => {
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, []); // Run only once on mount

  // Draw Polylines & Markers on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !travelState) return;

    let active = true;
    const activeIntervals: any[] = [];

    import("leaflet").then((L) => {
      if (!active) return;

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const originName = travelState.transit?.options[0]?.origin || "New York";
      const destName = travelState.request?.destination || "Monterrey";

      const originId = getCityIdByName(originName);
      const destId = getCityIdByName(destName);

      const originCoords = originId ? HUB_COORDS[originId] : null;
      const destCoords = destId ? HUB_COORDS[destId] : null;

      if (originCoords) {
        const originHtml = `
          <div class="relative flex items-center justify-center">
            <div class="w-3.5 h-3.5 rounded-full border border-black bg-zinc-800 scale-105 shadow-sm flex items-center justify-center">
              <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
            <div class="absolute -top-6 whitespace-nowrap bg-white/95 px-2 py-0.5 rounded border border-zinc-200 text-[10px] font-bold shadow-sm text-zinc-800">
              ${originName} (Orig)
            </div>
          </div>
        `;
        const marker = L.marker(originCoords, {
          icon: L.divIcon({
            html: originHtml,
            className: "custom-hub-marker",
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          })
        }).addTo(map);
        markersRef.current.push(marker);
      }

      if (destCoords) {
        const destHtml = `
          <div class="relative flex items-center justify-center">
            <div class="w-3.5 h-3.5 rounded-full border border-black bg-accent scale-110 shadow-md flex items-center justify-center">
              <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
            <div class="absolute -top-6 whitespace-nowrap bg-white/95 px-2 py-0.5 rounded border border-zinc-200 text-[10px] font-bold shadow-sm text-black border-black font-extrabold">
              ${destName} (Dest)
            </div>
          </div>
        `;
        const marker = L.marker(destCoords, {
          icon: L.divIcon({
            html: destHtml,
            className: "custom-hub-marker",
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          })
        }).addTo(map);
        markersRef.current.push(marker);
      }

      if (originCoords && destCoords) {
        const bezierPoints = getBezierPoints(originCoords, destCoords);
        const flightPath = L.polyline(bezierPoints, {
          color: "var(--accent-color, #2563eb)",
          weight: 3,
          opacity: 0.85,
          className: "leaflet-line-flow",
          dashArray: "6, 8"
        }).addTo(map);
        markersRef.current.push(flightPath);

        // Spawn airplane animation
        if (bezierPoints.length > 1) {
          const initLatDiff = bezierPoints[1][0] - bezierPoints[0][0];
          const initLngDiff = bezierPoints[1][1] - bezierPoints[0][1];
          const initAngle = Math.atan2(initLngDiff, initLatDiff) * (180 / Math.PI);

          const planeIcon = L.divIcon({
            html: `
              <div class="plane-rotate" style="transform: rotate(${initAngle}deg); transform-origin: center; transition: transform 0.04s linear;">
                <svg class="w-6 h-6 text-accent filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z"/>
                </svg>
              </div>
            `,
            className: "custom-airplane-marker",
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const planeMarker = L.marker(bezierPoints[0], { icon: planeIcon }).addTo(map);
          markersRef.current.push(planeMarker);

          let step = 0;
          const totalSteps = bezierPoints.length;
          const intervalId = setInterval(() => {
            if (!active) return;
            if (step >= totalSteps - 1) {
              step = 0;
            }
            
            const currentPos = bezierPoints[step];
            const nextPos = bezierPoints[step + 1] || currentPos;
            
            const latDiff = nextPos[0] - currentPos[0];
            const lngDiff = nextPos[1] - currentPos[1];
            const angle = Math.atan2(lngDiff, latDiff) * (180 / Math.PI);
            
            planeMarker.setLatLng(currentPos);
            
            const element = planeMarker.getElement();
            if (element) {
              const rotateContainer = element.querySelector(".plane-rotate") as HTMLElement;
              if (rotateContainer) {
                rotateContainer.style.transform = `rotate(${angle}deg)`;
              }
            }
            step++;
          }, 40);

          activeIntervals.push(intervalId);
        }

        const bounds: [[number, number], [number, number]] = [originCoords, destCoords];
        map.fitBounds(bounds, { padding: [80, 80], duration: 1.0 });
      }
    });

    return () => {
      active = false;
      activeIntervals.forEach(clearInterval);
    };
  }, [activeItem?.id, mapReady, travelState]);

  const cleanMsgContent = (content: string) => {
    let cleaned = content.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "");
    cleaned = cleaned.replace(/^[🔍✈️🏨📊✅❌\s\-\:\.\!\?]+/, "");
    return cleaned.trim();
  };

  return (
    <div className="flex flex-col h-screen bg-white text-black font-sans antialiased overflow-hidden">
      {/* HEADER */}
      <header className="flex-shrink-0 flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-150 shadow-[0_1px_2px_rgba(0,0,0,0.01)] z-30">
        <a href="/" className="transition-all duration-300 hover:scale-[1.02]" title="Nexis Home">
          <img 
            src="/logonexis.jpeg" 
            alt="Nexis Logo" 
            className="h-9 w-auto rounded-lg object-contain" 
          />
        </a>

        {/* Premium Corporate Navigation */}
        <nav className="flex items-center gap-6">
          <a href="/" className="text-xs font-semibold text-zinc-500 hover:text-black transition-all">
            Home
          </a>
          <a href="/dashboard" className="text-xs font-semibold text-zinc-500 hover:text-black transition-all">
            Navigator
          </a>
          <a href="/history" className="text-xs font-bold text-black border-b-2 border-black pb-0.5">
            History
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-150 bg-zinc-50 text-zinc-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[9px] font-bold tracking-wider uppercase">
              System Online
            </span>
          </div>
        </div>
      </header>

      {/* BODY SECTION */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-zinc-50">
        
        {/* SIDEBAR: HISTORY LIST (1/3 Screen) */}
        <aside className={`w-[320px] lg:w-[380px] bg-white border-r border-zinc-200 flex flex-col flex-shrink-0 min-h-0 transition-all duration-500 transform ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
          <div className="p-5 border-b border-zinc-150 flex flex-col gap-1">
            <h2 className="text-md font-bold text-zinc-900 tracking-tight">Relocation History</h2>
            <p className="text-[11px] text-zinc-400">Inspect past multi-agent negotiations and consensus.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="text-xs text-zinc-400 italic p-4 text-center">Loading past logs...</div>
            ) : history.length === 0 ? (
              <div className="text-xs text-zinc-400 italic p-4 text-center">No relocation logs stored yet.</div>
            ) : (
              history.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => setActiveItem(item)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col gap-2 relative group animate-fade-in-up ${
                    activeItem?.id === item.id
                      ? "border-black bg-zinc-50/50 shadow-sm"
                      : "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50/20 bg-white"
                  }`}
                  style={{ animationDelay: `${Math.min(600, (index + 1) * 80)}ms` }}
                >
                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteHistory(item.id);
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-100 text-zinc-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all duration-200"
                    title="Delete Itinerary"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex justify-between items-start pr-6">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                      {new Date(item.timestamp).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                    {item.status === "approved" ? (
                      <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Approved</span>
                    ) : (
                      <span className="text-[8px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">Budget Loop</span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-zinc-900 line-clamp-2 leading-relaxed">
                    "{item.query}"
                  </h3>
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 font-medium">
                    <span>To: {item.destination}</span>
                    <span className="font-bold text-zinc-800">${item.totalCost} USD</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* DETAILS PANEL: MAP & DECISION MATRIX (2/3 Screen) */}
        <main className="flex-1 relative overflow-hidden flex flex-col min-w-0">
          
          {/* Leaflet Map layer for active history item */}
          <div 
            ref={mapContainerRef} 
            className="absolute inset-0 w-full h-full z-10" 
            style={{ filter: "grayscale(100%) contrast(1.1) brightness(0.98)" }}
          />

          {activeItem ? (
            <>
              {/* FLOATING ITINERARY CONSENSUS WIDGET */}
              <section 
                key={`consensus-${activeItem?.id}`}
                className="absolute top-6 left-6 bottom-6 w-[360px] bg-white/95 backdrop-blur border border-zinc-200 rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] z-20 flex flex-col gap-4 overflow-y-auto animate-fade-in-up"
              >
                <div className="pb-3 border-b border-zinc-100 flex justify-between items-center animate-fade-in-up">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Itinerary Consensus</span>
                  {travelState?.audit?.status === "approved" ? (
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Approved</span>
                  ) : (
                    <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">Budget Loop</span>
                  )}
                </div>

                {/* Budget aggregate */}
                <div className="flex flex-col gap-1.5 p-3 border border-zinc-150 rounded-xl bg-zinc-50/50 animate-fade-in-up delay-100">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-zinc-455 uppercase text-[8px]">Aggregation</span>
                    <span>${((travelState?.transit?.total_cost || 0) + (travelState?.lodging?.total_cost || 0))} / ${travelState?.request?.budget || 0} USD</span>
                  </div>
                  <div className="w-full bg-zinc-200 h-1 rounded-full overflow-hidden flex">
                    {travelState && (
                      <>
                        <div className="bg-accent h-full" style={{ width: `${Math.min(100, ((travelState.transit.total_cost / (travelState.request.budget || 1)) * 100))}%` }} />
                        <div className="bg-zinc-400 h-full border-l border-white" style={{ width: `${Math.min(100, ((travelState.lodging.total_cost / (travelState.request.budget || 1)) * 100))}%` }} />
                      </>
                    )}
                  </div>
                </div>

                {/* Flight Details */}
                <div className="border border-zinc-150 rounded-xl p-3 flex flex-col gap-2 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] animate-fade-in-up delay-200">
                  <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase tracking-wider items-center">
                    <span className="flex items-center gap-1.5">
                      <PlaneIcon className="w-3.5 h-3.5 text-accent" />
                      Transit Hubs
                    </span>
                    {selectedFlight && <span className="text-black font-mono font-bold">${travelState?.transit?.total_cost} USD</span>}
                  </div>
                  {selectedFlight ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-zinc-950">{selectedFlight.carrier}</span>
                        <span className="text-[9px] text-zinc-500 font-semibold bg-zinc-100 px-1.5 py-0.5 rounded uppercase">{selectedFlight.type}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-zinc-600 font-mono mt-0.5">
                        <span>{selectedFlight.origin} → {selectedFlight.destination}</span>
                        {selectedFlight.departure_time && (
                          <span>{selectedFlight.departure_time} - {selectedFlight.arrival_time}</span>
                        )}
                      </div>
                      {selectedFlight.details && (
                        <p className="text-[9px] text-zinc-455 mt-1 border-t border-zinc-100 pt-1 leading-normal italic">
                          {selectedFlight.details}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-zinc-400 italic">No flights selected.</span>
                  )}
                </div>

                {/* Hotel Details */}
                <div className="border border-zinc-150 rounded-xl p-3 flex flex-col gap-2 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] animate-fade-in-up delay-300">
                  <div className="flex justify-between text-[9px] font-bold text-zinc-400 uppercase tracking-wider items-center">
                    <span className="flex items-center gap-1.5">
                      <HotelIcon className="w-3.5 h-3.5 text-accent" />
                      Lodging Stay
                    </span>
                    {selectedHotel && <span className="text-black font-mono font-bold">${travelState?.lodging?.total_cost} USD</span>}
                  </div>
                  {selectedHotel ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-950">{selectedHotel.name}</span>
                        <span className="text-[10px] text-zinc-500 font-medium">
                          ${selectedHotel.cost_per_night}/night | {selectedHotel.nights} nights
                        </span>
                      </div>
                      {selectedHotel.details && (
                        <p className="text-[9px] text-zinc-455 border-t border-zinc-100 pt-1 leading-normal italic">
                          {selectedHotel.details}
                        </p>
                      )}

                      {/* Swarm Alternatives */}
                      {travelState?.lodging?.options && travelState.lodging.options.length > 1 && (
                        <div className="border-t border-zinc-100 pt-2 mt-1 flex flex-col gap-1">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400">Alternative properties evaluated:</span>
                          <div className="flex flex-col gap-1">
                            {travelState.lodging.options
                              .filter(h => h.id !== travelState.lodging.selected_option_id)
                              .map(alt => (
                                <div key={alt.id} className="flex justify-between items-center text-[9px] text-zinc-500 hover:text-zinc-800 transition-colors">
                                  <span className="truncate max-w-[220px]">• {alt.name}</span>
                                  <span className="font-mono font-semibold">${alt.total_cost} USD</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-zinc-400 italic">No lodging selected.</span>
                  )}
                </div>

                {/* Compliance Report */}
                <div className="border border-zinc-150 rounded-xl p-3 flex flex-col gap-3 mt-auto bg-zinc-50/50 animate-fade-in-up delay-400">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldIcon className="w-3.5 h-3.5 text-accent" />
                    Compliance Report
                  </span>

                  <div className="flex flex-col gap-2">
                    {/* Visual Checklist */}
                    {travelState && (
                      <div className="flex flex-col gap-1.5 bg-white border border-zinc-150 rounded-lg p-2 text-[9px] text-zinc-700">
                        <div className="flex justify-between items-center">
                          <span>Aggregate Budget Cap</span>
                          {((travelState.transit.total_cost + travelState.lodging.total_cost) <= (travelState.request.budget || 0)) ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-0.5">✓ Passed</span>
                          ) : (
                            <span className="text-rose-600 font-bold flex items-center gap-0.5">✗ Limit Loop</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Swarm Consensus Check</span>
                          {travelState.audit.status === "approved" ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-0.5">✓ Consensus Reached</span>
                          ) : (
                            <span className="text-rose-600 font-bold flex items-center gap-0.5">✗ Restructure Loop</span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Corporate Travel Rules</span>
                          <span className="text-emerald-600 font-semibold flex items-center gap-0.5">✓ Standard Class Only</span>
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-zinc-650 italic leading-relaxed pl-1 border-l-2 border-zinc-300">
                      "{travelState?.audit?.comments || "No compliance audit log recorded."}"
                    </p>
                  </div>
                </div>
              </section>

              {/* FLOATING SWARM AUDIT LEDGER WIDGET */}
              <section 
                key={`ledger-${activeItem?.id}`}
                className="absolute top-6 right-6 bottom-6 w-[380px] lg:w-[420px] bg-white/95 backdrop-blur border border-zinc-200 rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] z-20 flex flex-col gap-4 overflow-hidden animate-scale-in"
              >
                <div className="flex items-center justify-between flex-shrink-0 animate-fade-in-up">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Swarm Audit Ledger</span>
                  <div className="flex p-0.5 bg-zinc-200/50 rounded-full border border-zinc-200">
                    <button
                      onClick={() => setAuditTab("chat")}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                        auditTab === "chat" ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-black"
                      }`}
                    >
                      Logs
                    </button>
                    <button
                      onClick={() => setAuditTab("json")}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                        auditTab === "json" ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-black"
                      }`}
                    >
                      JSON
                    </button>
                  </div>
                </div>

                {/* Chat messages */}
                <div className={`flex-1 overflow-y-auto py-2 space-y-3.5 min-h-0 animate-fade-in-up delay-100 ${auditTab === "chat" ? "block" : "hidden"}`}>
                  {activeItem.messages.map((m) => {
                    const isUser = m.sender_type === "User";
                    let name = m.sender_name || "User";
                    let badgeClass = "text-zinc-500 bg-zinc-50 border-zinc-200";
                    let RoleIcon = UserIcon;
                    
                    if (name.includes("Analyst")) {
                      name = "Requirements Analyst";
                      badgeClass = "text-purple-600 bg-purple-50 border-purple-200";
                      RoleIcon = BriefcaseIcon;
                    } else if (name.includes("Transit")) {
                      name = "Transit Planner";
                      badgeClass = "text-blue-600 bg-blue-50 border-blue-200";
                      RoleIcon = PlaneIcon;
                    } else if (name.includes("Accommodation")) {
                      name = "Accommodation Scout";
                      badgeClass = "text-emerald-600 bg-emerald-50 border-emerald-200";
                      RoleIcon = HotelIcon;
                    } else if (name.includes("Auditor")) {
                      name = "Financial Auditor";
                      badgeClass = "text-amber-600 bg-amber-50 border-amber-200";
                      RoleIcon = ShieldIcon;
                    } else if (isUser) {
                      name = "User";
                      badgeClass = "text-zinc-700 bg-zinc-100 border-zinc-300";
                      RoleIcon = UserIcon;
                    }

                    return (
                      <div key={m.id} className="flex flex-col gap-1.5 border-b border-zinc-100 pb-3 last:border-0 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-bold border uppercase tracking-wider ${badgeClass}`}>
                            <RoleIcon className="w-3.5 h-3.5" />
                            {name}
                          </span>
                          <span className="text-[7.5px] font-mono text-zinc-400">
                            {new Date(m.inserted_at).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit"
                            })}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-700 font-mono leading-normal whitespace-pre-wrap break-words pl-1">
                          {m.content.startsWith("{") ? "Synchronized updated state payload." : cleanMsgContent(m.content)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Raw JSON */}
                <div className={`flex-1 overflow-y-auto py-2 min-h-0 animate-fade-in-up delay-100 ${auditTab === "json" ? "block" : "hidden"}`}>
                  {travelState ? (
                    <pre className="text-[9px] font-mono text-zinc-655 bg-white p-3 border border-zinc-200 rounded-lg overflow-x-auto leading-relaxed h-full max-h-[350px]">
                      {JSON.stringify(travelState, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-xs text-zinc-450 italic font-sans">No JSON state payload registered.</span>
                  )}
                </div>
              </section>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs italic bg-zinc-50 z-30">
              Select a relocation itinerary from the history list to inspect coordinates, agent logs, and consensus details.
            </div>
          )}
        </main>

      </div>
    </div>
  );
}
