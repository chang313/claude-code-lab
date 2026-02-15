"use client";

import { useEffect, useRef, useCallback } from "react";

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  isWishlisted: boolean;
}

interface Bounds {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
}

interface MapViewProps {
  center?: { lat: number; lng: number };
  markers: MapMarker[];
  onMarkerClick: (id: string) => void;
  onBoundsChange: (bounds: Bounds) => void;
}

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        Map: new (
          container: HTMLElement,
          options: { center: unknown; level: number },
        ) => KakaoMap;
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (options: { map: KakaoMap; position: unknown }) => KakaoMarker;
        InfoWindow: new (options: { content: string }) => KakaoInfoWindow;
        event: {
          addListener: (
            target: unknown,
            type: string,
            handler: () => void,
          ) => void;
        };
      };
    };
  }
}

interface KakaoMap {
  getBounds: () => {
    getSouthWest: () => { getLat: () => number; getLng: () => number };
    getNorthEast: () => { getLat: () => number; getLng: () => number };
  };
  setCenter: (latlng: unknown) => void;
}

interface KakaoMarker {
  setMap: (map: KakaoMap | null) => void;
}

interface KakaoInfoWindow {
  open: (map: KakaoMap, marker: KakaoMarker) => void;
  close: () => void;
}

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 }; // Seoul City Hall
const DEFAULT_LEVEL = 5;

export default function MapView({
  center,
  markers,
  onMarkerClick,
  onBoundsChange,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markerRefs = useRef<KakaoMarker[]>([]);
  const infoWindowRef = useRef<KakaoInfoWindow | null>(null);

  const emitBounds = useCallback(() => {
    if (!mapRef.current) return;
    const bounds = mapRef.current.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    onBoundsChange({
      sw: { lat: sw.getLat(), lng: sw.getLng() },
      ne: { lat: ne.getLat(), lng: ne.getLng() },
    });
  }, [onBoundsChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const initMap = () => {
      const mapCenter = center || DEFAULT_CENTER;
      const map = new window.kakao.maps.Map(containerRef.current!, {
        center: new window.kakao.maps.LatLng(mapCenter.lat, mapCenter.lng),
        level: DEFAULT_LEVEL,
      });
      mapRef.current = map;

      window.kakao.maps.event.addListener(map, "idle", emitBounds);

      // Initial bounds emit
      setTimeout(emitBounds, 500);
    };

    if (window.kakao?.maps?.Map) {
      initMap();
    } else {
      // SDK not loaded yet — poll until ready
      const interval = setInterval(() => {
        if (window.kakao?.maps?.Map) {
          clearInterval(interval);
          initMap();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [center, emitBounds]);

  useEffect(() => {
    if (!mapRef.current || !window.kakao) return;
    const map = mapRef.current;

    // Clear existing markers
    markerRefs.current.forEach((m) => m.setMap(null));
    markerRefs.current = [];
    infoWindowRef.current?.close();

    markers.forEach((m) => {
      const position = new window.kakao.maps.LatLng(m.lat, m.lng);
      const marker = new window.kakao.maps.Marker({ map, position });
      markerRefs.current.push(marker);

      const infoContent = `
        <div style="padding:8px;min-width:150px;font-size:14px;">
          <strong>${m.name}</strong>
          ${m.isWishlisted ? '<div style="color:green;font-size:12px;">✓ Saved</div>' : ""}
        </div>
      `;
      const infoWindow = new window.kakao.maps.InfoWindow({
        content: infoContent,
      });

      window.kakao.maps.event.addListener(marker, "click", () => {
        infoWindowRef.current?.close();
        infoWindow.open(map, marker);
        infoWindowRef.current = infoWindow;
        onMarkerClick(m.id);
      });
    });
  }, [markers, onMarkerClick]);

  return (
    <div
      id="kakao-map"
      ref={containerRef}
      className="w-full h-[calc(100vh-12rem)] rounded-xl overflow-hidden"
      role="application"
      aria-label="Restaurant map"
    />
  );
}
