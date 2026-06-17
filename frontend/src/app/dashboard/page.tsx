"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import "leaflet/dist/leaflet.css";
import { 
  PlaneIcon, 
  HotelIcon, 
  ShieldIcon, 
  CalendarIcon, 
  PinIcon, 
  WalletIcon, 
  BriefcaseIcon,
  UserIcon
} from "../components/Icons";

interface AgentConfig {
  roomId: string;
  requirementsAnalystId: string;
  requirementsAnalystHandle: string;
  transitPlannerId: string;
  transitPlannerHandle: string;
  accommodationScoutId: string;
  accommodationScoutHandle: string;
  financialAuditorId: string;
  financialAuditorHandle: string;
}

interface Message {
  id: string;
  content: string;
  sender_name: string | null;
  sender_type: string;
  inserted_at: string;
  message_type: string;
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

export default function DashboardPage() {
  const pathname = usePathname();
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [mounted, setMounted] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(true);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Builder States (Executive Input Flow)
  const [inputMode, setInputMode] = useState<"builder" | "express">("builder");
  const [originCity, setOriginCity] = useState(CITIES[5]); // Default Origin: New York
  const [selectedCity, setSelectedCity] = useState(CITIES[3]); // Default Destination: Monterrey
  const [startDate, setStartDate] = useState("2026-07-15");
  const [endDate, setEndDate] = useState("2026-07-20");
  const [budget, setBudget] = useState(1500);
  const [purpose, setPurpose] = useState("Technology conference");

  // Map Refs and State
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // Panel Tabs for the Swarm Audit Ledger
  const [auditTab, setAuditTab] = useState<"chat" | "json">("chat");

  const hasSwarmStarted = isSubmitting || messages.length > 0;

  // Archive and clear the previous session logs on initial load to start fresh by default
  useEffect(() => {
    fetch("/api/messages", { method: "DELETE" })
      .then(() => {
        setMessages([]);
      })
      .catch((err) => console.error("Error clearing initial session:", err));
  }, []);

  // Fetch config on mount
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        if (data.roomId) {
          setRoomId(data.roomId);
        }
      })
      .catch((err) => console.error("Error loading config:", err));
  }, []);

  // Poll messages
  useEffect(() => {
    if (!roomId || !isPolling) return;

    const fetchMessages = () => {
      fetch(`/api/messages?roomId=${roomId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.data)) {
            const sorted = [...data.data].sort(
              (a, b) =>
                new Date(a.inserted_at).getTime() -
                new Date(b.inserted_at).getTime()
            );
            setMessages(sorted);
          }
        })
        .catch((err) => console.error("Error fetching messages:", err));
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2500);
    return () => clearInterval(interval);
  }, [roomId, isPolling]);

  // Map Initializer Effect
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

      // Light/Grayscale CartoDB Positron Tile layer
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
  }, []);

  // Map Marker, Flight Polyline, & FlyTo Effect
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    let active = true;
    const activeIntervals: any[] = [];

    import("leaflet").then((L) => {
      if (!active) return;

      // Clear old markers/lines
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      CITIES.forEach((city) => {
        const coords = HUB_COORDS[city.id];
        if (!coords) return;

        const isSelected = city.id === selectedCity.id;
        const isOrigin = city.id === originCity.id;

        // Hide non-active nodes when swarm is active to reduce map clutter
        if (hasSwarmStarted && !isSelected && !isOrigin) return;

        const iconHtml = `
          <div class="relative flex items-center justify-center">
            <div class="w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center transition-all duration-300 ${
              isSelected 
                ? "bg-accent scale-110 shadow-md" 
                : isOrigin 
                  ? "bg-zinc-800 scale-105 shadow-sm" 
                  : "bg-white hover:bg-zinc-100"
            }">
              <div class="w-1.5 h-1.5 rounded-full bg-zinc-800 ${isSelected || isOrigin ? "bg-white" : ""}"></div>
            </div>
            <div class="absolute -top-6 whitespace-nowrap bg-white/95 px-2 py-0.5 rounded border border-zinc-200 text-[10px] font-bold shadow-sm ${
              isSelected 
                ? "text-black border-black font-extrabold" 
                : isOrigin 
                  ? "text-zinc-800 border-zinc-650 font-bold" 
                  : "text-zinc-500"
            }">
              ${city.name} ${isSelected ? "(Dest)" : isOrigin ? "(Orig)" : ""}
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "custom-hub-marker",
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const marker = L.marker(coords, { icon: customIcon })
          .addTo(map)
          .on("click", () => {
            if (city.id !== originCity.id && !hasSwarmStarted) {
              setSelectedCity(city);
            }
          });

        markersRef.current.push(marker);
      });

      // Draw dashed flight path connecting origin and destination
      const originCoords = HUB_COORDS[originCity.id];
      const destCoords = HUB_COORDS[selectedCity.id];
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
      }

      // If swarm hasn't started, just fly to selected
      if (!hasSwarmStarted) {
        const selectedCoords = HUB_COORDS[selectedCity.id];
        if (selectedCoords) {
          map.flyTo(selectedCoords, 4, { duration: 1.5 });
        }
      }
    });

    return () => {
      active = false;
      activeIntervals.forEach(clearInterval);
    };
  }, [selectedCity, originCity, mapReady, hasSwarmStarted]);

  // Adjust Leaflet bounds when Swarm triggers to fit both hubs
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    setTimeout(() => {
      map.invalidateSize();
      const originCoords = HUB_COORDS[originCity.id];
      const destCoords = HUB_COORDS[selectedCity.id];
      if (originCoords && destCoords) {
        if (hasSwarmStarted) {
          const bounds: [[number, number], [number, number]] = [originCoords, destCoords];
          map.fitBounds(bounds, { padding: [100, 100], duration: 1.5 });
        } else {
          map.setView(destCoords, 4);
        }
      }
    }, 600); // wait for CSS layout transitions
  }, [hasSwarmStarted, mapReady, originCity, selectedCity, inputMode]);

  // Handle submit query
  const handleTriggerSwarm = async (queryText: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: queryText,
          roomId: roomId,
        }),
      });

      if (!res.ok) {
        console.error("Failed to send message:", await res.text());
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) return;

    let finalQuery = "";
    if (inputMode === "builder") {
      finalQuery = `I need to travel from ${originCity.name}, ${originCity.country} to ${selectedCity.name}, ${selectedCity.country} from ${startDate} to ${endDate} for ${purpose.toLowerCase()}. Budget $${budget} USD.`;
    } else {
      if (!inputText.trim()) return;
      finalQuery = inputText;
      setInputText("");
    }

    handleTriggerSwarm(finalQuery);
  };

  // Reset function to clear messaging queue and return to form view
  const handleResetSession = async () => {
    setMessages([]);
    setIsSubmitting(false);
    try {
      await fetch("/api/messages", { method: "DELETE" });
    } catch (err) {
      console.error("Error resetting session:", err);
    }
  };

  // Determine active agent based on latest message
  const getActiveAgent = () => {
    if (!isSubmitting && messages.length === 0) return null;
    if (messages.length === 0) return "ingest";

    const latestMsg = messages[messages.length - 1];
    if (latestMsg.sender_type === "User") return "ingest";

    const sender = latestMsg.sender_name?.toLowerCase() || "";
    if (sender.includes("analyst") || sender.includes("ingest")) return "ingest";
    if (sender.includes("transit") || sender.includes("mobility")) return "transit";
    if (sender.includes("accommodation") || sender.includes("lodging")) return "lodging";
    if (sender.includes("auditor") || sender.includes("cumplimiento")) return "auditor";

    const content = latestMsg.content;
    if (content.includes("Requirements Analyst") || content.includes("🔍")) return "ingest";
    if (content.includes("Transit Planner") || content.includes("✈️")) return "transit";
    if (content.includes("Accommodation Scout") || content.includes("🏨")) return "lodging";
    if (content.includes("Financial Auditor") || content.includes("📊") || content.includes("✅") || content.includes("❌")) return "auditor";

    return "ingest";
  };

  const cleanMsgContent = (content: string) => {
    let cleaned = content.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "");
    cleaned = cleaned.replace(/^[🔍✈️🏨📊✅❌\s\-\:\.\!\?]+/, "");
    return cleaned.trim();
  };

  const getLatestTravelState = (): TravelState | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const content = messages[i].content.trim();
      if (content.startsWith("{") && content.includes('"request"')) {
        try {
          const stateObj = JSON.parse(content);
          if (stateObj.request && stateObj.transit && stateObj.lodging) {
            return stateObj as TravelState;
          }
        } catch (e) {
          // Keep searching
        }
      }
    }
    return null;
  };

  const activeAgent = getActiveAgent();
  const travelState = getLatestTravelState();

  const selectedFlight = travelState?.transit?.options?.find(f => f.id === travelState.transit.selected_option_id);
  const selectedHotel = travelState?.lodging?.options?.find(h => h.id === travelState.lodging.selected_option_id);

  return (
    <div className="flex flex-col h-screen bg-white text-black font-sans antialiased overflow-hidden transition-all duration-300">
      {/* HEADER */}
      <header className="flex-shrink-0 flex items-center justify-between px-8 py-5 bg-white border-b border-zinc-150 shadow-[0_1px_2px_rgba(0,0,0,0.01)] z-35">
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
          <a href="/dashboard" className="text-xs font-bold text-black border-b-2 border-black pb-0.5">
            Navigator
          </a>
          <a href="/history" className="text-xs font-semibold text-zinc-500 hover:text-black transition-all">
            History
          </a>
        </nav>

        <div className="flex items-center gap-4">
          {hasSwarmStarted && (
            <button
              onClick={handleResetSession}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-zinc-950 hover:bg-black border border-zinc-800 hover:border-zinc-700 text-white cursor-pointer active:scale-95 transition-all shadow-sm flex items-center gap-1.5 group"
            >
              <svg className="w-3 h-3 transform group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" />
              </svg>
              <span>Configure New Plan</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-150 bg-zinc-50 text-zinc-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[9px] font-bold tracking-wider uppercase">
              System Online
            </span>
          </div>
        </div>
      </header>

      {/* MAP CENTRIC CONTAINER: Map fills the viewport height */}
      <div className="flex-1 relative overflow-hidden bg-zinc-50">
        
        {/* LEAFLET MAP LAYER */}
        <div 
          ref={mapContainerRef} 
          className="absolute inset-0 w-full h-full z-10 transition-all duration-500" 
          style={{ filter: "grayscale(100%) contrast(1.1) brightness(0.98)" }}
        />

        {/* FLOATING CONFIGURATION CARD (Slides left and disappears when Swarm runs) */}
        <aside 
          className={`absolute top-6 left-6 bottom-6 w-[360px] bg-white/95 backdrop-blur border border-zinc-200 rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] z-20 flex flex-col gap-4 overflow-y-auto transition-all duration-500 transform ${
            hasSwarmStarted 
              ? "-translate-x-[420px] opacity-0 pointer-events-none" 
              : mounted 
                ? "translate-x-0 opacity-100" 
                : "-translate-x-[420px] opacity-0"
          }`}
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-md font-bold text-zinc-900 tracking-tight">Configuration Hub</h2>
            <p className="text-[11px] text-zinc-400">Configure corporate relocations.</p>
          </div>

          <div className="flex p-0.5 bg-zinc-100 rounded-full w-fit border border-zinc-200 flex-shrink-0">
            <button
              onClick={() => setInputMode("builder")}
              className={`px-4 py-1.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                inputMode === "builder" ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-black"
              }`}
            >
              Map Hub
            </button>
            <button
              onClick={() => setInputMode("express")}
              className={`px-4 py-1.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                inputMode === "express" ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-black"
              }`}
            >
              Text Request
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-4">
              
              {inputMode === "builder" ? (
                <div className="flex flex-col gap-4">
                  
                  {/* Origin / Dest dropdowns */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                        <PinIcon className="w-3 h-3 text-zinc-400" />
                        From
                      </label>
                      <select
                        value={originCity.id}
                        onChange={(e) => {
                          const city = CITIES.find((c) => c.id === e.target.value);
                          if (city) setOriginCity(city);
                        }}
                        className="w-full px-2.5 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:border-black text-[11px] bg-zinc-50/40 cursor-pointer appearance-none"
                      >
                        {CITIES.map((c) => (
                          <option key={`origin-${c.id}`} value={c.id} disabled={c.id === selectedCity.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                        <PinIcon className="w-3 h-3 text-zinc-400" />
                        To
                      </label>
                      <select
                        value={selectedCity.id}
                        onChange={(e) => {
                          const city = CITIES.find((c) => c.id === e.target.value);
                          if (city) setSelectedCity(city);
                        }}
                        className="w-full px-2.5 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:border-black text-[11px] bg-zinc-50/40 cursor-pointer appearance-none"
                      >
                        {CITIES.map((c) => (
                          <option key={`dest-${c.id}`} value={c.id} disabled={c.id === originCity.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3 text-zinc-400" />
                        Departure
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:border-black text-[11px] bg-zinc-50/40"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3 text-zinc-400" />
                        Return
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:border-black text-[11px] bg-zinc-50/40"
                      />
                    </div>
                  </div>

                  {/* Purpose */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <BriefcaseIcon className="w-3 h-3 text-zinc-400" />
                      Purpose
                    </label>
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:border-black text-[11px] bg-zinc-50/40 cursor-pointer appearance-none"
                    >
                      <option value="Technology conference">Technology Conference</option>
                      <option value="Key client meeting">Key Client Meeting</option>
                      <option value="Internal hub audit">Internal Hub Audit</option>
                      <option value="Annual strategy planning">Annual Strategy Planning</option>
                    </select>
                  </div>

                  {/* Slider */}
                  <div className="flex flex-col gap-1.5 p-3 border border-zinc-200 rounded-xl bg-zinc-50/30">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                        <WalletIcon className="w-3 h-3 text-zinc-400" />
                        Budget
                      </span>
                      <span className="font-bold">${budget} USD</span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="5000"
                      step="100"
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      className="w-full accent-black cursor-pointer bg-zinc-200 h-1 rounded-lg"
                    />
                  </div>
                </div>
              ) : (
                /* EXPRESS REQUEST INPUT */
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Request Details</label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="e.g., I need to travel from New York to Monterrey from July 15 to 20, 2026 for a technology conference. Budget $1500 USD."
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:border-black text-xs bg-zinc-50/30 resize-none"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || (inputMode === "express" && !inputText.trim())}
              className="w-full py-3 rounded-xl bg-zinc-950 hover:bg-black border border-zinc-800 hover:border-zinc-700 text-white font-semibold text-xs transition-all active:scale-[0.99] disabled:bg-zinc-100 disabled:text-zinc-400 shadow cursor-pointer flex items-center justify-center gap-2 mt-auto group"
            >
              <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>{isSubmitting ? "Planning Relocation..." : "Plan Relocation Itinerary"}</span>
            </button>
          </form>
        </aside>

        {/* FLOATING ITINERARY CONSENSUS CARD (Slides in from the left overlaying map) */}
        <section 
          key={hasSwarmStarted ? "consensus-active" : "consensus-inactive"}
          className={`absolute top-6 left-6 bottom-6 w-[380px] bg-white/95 backdrop-blur border border-zinc-200 rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] z-20 flex flex-col gap-4 overflow-y-auto transition-all duration-500 transform ${
            hasSwarmStarted ? "translate-x-0 opacity-100" : "-translate-x-[450px] opacity-0 pointer-events-none"
          }`}
        >
          <div className="pb-3 border-b border-zinc-100 flex justify-between items-center animate-fade-in-up">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Itinerary Consensus</span>
            {travelState?.audit?.status === "approved" ? (
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Approved</span>
            ) : travelState?.audit?.status === "rejected" ? (
              <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">Budget Loop</span>
            ) : (
              <span className="text-[9px] font-bold text-zinc-500 bg-zinc-50 border border-zinc-150 px-2 py-0.5 rounded animate-pulse">Pending</span>
            )}
          </div>

          {/* Budget progress bar */}
          <div className="flex flex-col gap-1.5 p-3 border border-zinc-150 rounded-xl bg-zinc-50/50 animate-fade-in-up delay-100">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-zinc-455 uppercase text-[8px]">Aggregation</span>
              <span>${((travelState?.transit?.total_cost || 0) + (travelState?.lodging?.total_cost || 0))} / ${travelState?.request?.budget || budget} USD</span>
            </div>
            <div className="w-full bg-zinc-200 h-1 rounded-full overflow-hidden flex">
              {travelState && (
                <>
                  <div className="bg-accent h-full" style={{ width: `${Math.min(100, ((travelState.transit.total_cost / (travelState.request.budget || budget)) * 100))}%` }} />
                  <div className="bg-zinc-400 h-full border-l border-white" style={{ width: `${Math.min(100, ((travelState.lodging.total_cost / (travelState.request.budget || budget)) * 100))}%` }} />
                </>
              )}
            </div>
          </div>

          {/* Flight Card */}
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
                  <p className="text-[9px] text-zinc-450 mt-1 border-t border-zinc-100 pt-1 leading-normal italic">
                    {selectedFlight.details}
                  </p>
                )}
              </div>
            ) : (
              <span className="text-[10px] text-zinc-400 italic">Locating optimal flight...</span>
            )}
          </div>

          {/* Hotel Card */}
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
                  <p className="text-[9px] text-zinc-450 border-t border-zinc-100 pt-1 leading-normal italic">
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
              <span className="text-[10px] text-zinc-400 italic">Evaluating compliant hotels...</span>
            )}
          </div>

          {/* Audit & Compliance Seal */}
          <div className="border border-zinc-150 rounded-xl p-3 flex flex-col gap-3 mt-auto bg-zinc-50/50 animate-fade-in-up delay-400">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldIcon className="w-3.5 h-3.5 text-accent" />
                Compliance Report
              </span>
              {travelState?.audit?.status === "approved" && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </div>

            {travelState ? (
              <div className="flex flex-col gap-2">
                {/* Visual Checklist */}
                <div className="flex flex-col gap-1.5 bg-white border border-zinc-150 rounded-lg p-2 text-[9px] text-zinc-700">
                  <div className="flex justify-between items-center">
                    <span>Aggregate Budget Cap</span>
                    {((travelState.transit.total_cost + travelState.lodging.total_cost) <= (travelState.request.budget || budget)) ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-0.5">✓ Passed</span>
                    ) : (
                      <span className="text-rose-600 font-bold flex items-center gap-0.5">✗ Limit Loop</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Swarm Consensus Check</span>
                    {travelState.audit.status === "approved" ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-0.5">✓ Consensus Reached</span>
                    ) : travelState.audit.status === "rejected" ? (
                      <span className="text-rose-600 font-bold flex items-center gap-0.5">✗ Restructure Loop</span>
                    ) : (
                      <span className="text-amber-500 font-bold flex items-center gap-0.5">⟳ Auditing...</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Corporate Travel Rules</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-0.5">✓ Standard Class Only</span>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-600 italic leading-relaxed pl-1 border-l-2 border-zinc-300">
                  "{travelState.audit.comments || "Auditing aggregate cost limits..."}"
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-zinc-400 italic leading-relaxed">
                Auditing aggregate cost limits...
              </p>
            )}

            {travelState?.audit?.status === "approved" && (
              <button 
                onClick={() => alert("Relocation Plan Successfully Reserved")}
                className="w-full py-2.5 rounded-xl bg-zinc-950 hover:bg-black border border-zinc-800 hover:border-zinc-700 text-white font-bold text-[10px] shadow-sm cursor-pointer mt-1 flex items-center justify-center gap-1.5 group"
              >
                <svg className="w-3.5 h-3.5 transform group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Book Relocation Plan</span>
              </button>
            )}
          </div>
        </section>

        {/* FLOATING SWARM AUDIT LEDGER CARD (Slides in from the right overlaying map) */}
        <section 
          key={hasSwarmStarted ? "ledger-active" : "ledger-inactive"}
          className={`absolute top-6 right-6 bottom-6 w-[400px] bg-white/95 backdrop-blur border border-zinc-200 rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] z-20 flex flex-col gap-4 overflow-hidden transition-all duration-500 transform ${
            hasSwarmStarted ? "translate-x-0 opacity-100" : "translate-x-[450px] opacity-0 pointer-events-none"
          }`}
        >
          {/* Swarm Trace flowchart inside Ledger Header */}
          <div className="pb-3 border-b border-zinc-150 flex flex-col gap-3 flex-shrink-0 animate-fade-in-up">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Swarm Collaboration Trace</span>
              {isSubmitting && <span className="text-[10px] font-semibold text-zinc-800 animate-pulse">Running...</span>}
            </div>
            
            <div className="flex items-center justify-between w-full py-1 relative">
              <div className="absolute left-[8%] right-[8%] top-1/2 h-[1px] bg-zinc-150 -translate-y-1/2 z-0" />
              {isSubmitting && activeAgent === "ingest" && <div className="absolute left-[8%] w-[28%] top-1/2 h-[1px] -translate-y-1/2 z-0 data-packet-line" />}
              {isSubmitting && activeAgent === "transit" && <div className="absolute left-[36%] w-[28%] top-1/2 h-[1px] -translate-y-1/2 z-0 data-packet-line" />}
              {isSubmitting && activeAgent === "lodging" && <div className="absolute left-[64%] w-[28%] top-1/2 h-[1px] -translate-y-1/2 z-0 data-packet-line" />}

              <div className="flex flex-col items-center z-10 w-[20%]">
                <div className={`w-8 h-8 rounded-full border border-zinc-200 bg-white flex items-center justify-center transition-all ${activeAgent === "ingest" ? "agent-active-pulse" : "text-zinc-500"}`}>
                  <BriefcaseIcon className={`w-4 h-4 ${activeAgent === "ingest" ? "text-white" : "text-zinc-400"}`} />
                </div>
              </div>
              <div className="flex flex-col items-center z-10 w-[20%]">
                <div className={`w-8 h-8 rounded-full border border-zinc-200 bg-white flex items-center justify-center transition-all ${activeAgent === "transit" ? "agent-active-pulse" : "text-zinc-500"}`}>
                  <PlaneIcon className={`w-4 h-4 ${activeAgent === "transit" ? "text-white" : "text-zinc-400"}`} />
                </div>
              </div>
              <div className="flex flex-col items-center z-10 w-[20%]">
                <div className={`w-8 h-8 rounded-full border border-zinc-200 bg-white flex items-center justify-center transition-all ${activeAgent === "lodging" ? "agent-active-pulse" : "text-zinc-500"}`}>
                  <HotelIcon className={`w-4 h-4 ${activeAgent === "lodging" ? "text-white" : "text-zinc-400"}`} />
                </div>
              </div>
              <div className="flex flex-col items-center z-10 w-[20%]">
                <div className={`w-8 h-8 rounded-full border border-zinc-200 bg-white flex items-center justify-center transition-all ${activeAgent === "auditor" ? "agent-active-pulse" : "text-zinc-500"}`}>
                  <ShieldIcon className={`w-4 h-4 ${activeAgent === "auditor" ? "text-white" : "text-zinc-400"}`} />
                </div>
              </div>
            </div>

            {/* Live Agent Action Description */}
            {isSubmitting && activeAgent && (
              <div className="px-3 py-2 rounded-lg border border-blue-100 bg-blue-50/50 text-[10px] text-blue-700 font-medium leading-normal animate-pulse flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                </span>
                <span>
                  {activeAgent === "ingest" && "Ingestion Analyst: Structuring criteria & aligning travel boundaries..."}
                  {activeAgent === "transit" && "Transit Planner: Querying flight routes, carriers & seat availability..."}
                  {activeAgent === "lodging" && "Accommodation Scout: Screening hotels for location proximity & compliance..."}
                  {activeAgent === "auditor" && "Financial Auditor: Running budget audits & verifying policy caps..."}
                </span>
              </div>
            )}
          </div>

          {/* Tab buttons & Active Room Status Badge */}
          <div className="flex flex-col gap-2 flex-shrink-0 animate-fade-in-up delay-100">
            <div className="flex items-center justify-between">
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

            {/* Room Connection Badge placed cleanly inside logs header */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-150 bg-zinc-50/50 text-zinc-650">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-semibold font-mono tracking-wider">
                {roomId ? `CONNECTED ROOM: ${roomId}` : "CONNECTING TO AGENTS..."}
              </span>
            </div>
          </div>

          {/* Chat */}
          <div className={`flex-1 overflow-y-auto py-2 space-y-3.5 min-h-0 animate-fade-in-up delay-200 ${auditTab === "chat" ? "block" : "hidden"}`}>
            {messages.map((m) => {
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
          <div className={`flex-1 overflow-y-auto py-2 min-h-0 animate-fade-in-up delay-200 ${auditTab === "json" ? "block" : "hidden"}`}>
            {travelState ? (
              <pre className="text-[9px] font-mono text-zinc-655 bg-white p-3 border border-zinc-200 rounded-lg overflow-x-auto leading-relaxed h-full max-h-[350px]">
                {JSON.stringify(travelState, null, 2)}
              </pre>
            ) : (
              <span className="text-xs text-zinc-450 italic font-sans">No JSON registered yet.</span>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
