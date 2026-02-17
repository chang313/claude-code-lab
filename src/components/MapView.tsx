"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Bounds } from "@/types";

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  isWishlisted: boolean;
}

interface MapViewProps {
  center?: { lat: number; lng: number };
  markers: MapMarker[];
  fitBounds?: { lat: number; lng: number }[];
  onMarkerClick: (id: string) => void;
  onBoundsChange?: (bounds: Bounds) => void;
  className?: string;
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
        LatLngBounds: new () => KakaoLatLngBounds;
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

interface KakaoLatLngBounds {
  extend: (latlng: unknown) => void;
}

interface KakaoMap {
  getBounds: () => {
    getSouthWest: () => { getLat: () => number; getLng: () => number };
    getNorthEast: () => { getLat: () => number; getLng: () => number };
  };
  setCenter: (latlng: unknown) => void;
  setBounds: (bounds: KakaoLatLngBounds) => void;
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
  fitBounds,
  onMarkerClick,
  onBoundsChange,
  className,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markerRefs = useRef<KakaoMarker[]>([]);
  const infoWindowRef = useRef<KakaoInfoWindow | null>(null);

  const emitBounds = useCallback(() => {
    if (!mapRef.current || !onBoundsChange) return;
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

    const createMap = () => {
      const mapCenter = center || DEFAULT_CENTER;
      const map = new window.kakao.maps.Map(containerRef.current!, {
        center: new window.kakao.maps.LatLng(mapCenter.lat, mapCenter.lng),
        level: DEFAULT_LEVEL,
      });
      mapRef.current = map;

      if (onBoundsChange) {
        window.kakao.maps.event.addListener(map, "idle", emitBounds);
        setTimeout(emitBounds, 500);
      }
    };

    const initMap = () => {
      window.kakao.maps.load(createMap);
    };

    if (window.kakao?.maps) {
      initMap();
    } else {
      const interval = setInterval(() => {
        if (window.kakao?.maps) {
          clearInterval(interval);
          initMap();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [center, emitBounds, onBoundsChange]);

  // Auto-fit map to bounds
  useEffect(() => {
    if (!mapRef.current || !fitBounds || fitBounds.length === 0) return;

    const bounds = new window.kakao.maps.LatLngBounds();
    fitBounds.forEach((point) => {
      bounds.extend(new window.kakao.maps.LatLng(point.lat, point.lng));
    });
    mapRef.current.setBounds(bounds);
  }, [fitBounds]);

  useEffect(() => {
    if (!mapRef.current || !window.kakao) return;
    const map = mapRef.current;

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
          ${m.isWishlisted ? '<div style="color:green;font-size:12px;">&#10003; 저장됨</div>' : ""}
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
      className={className ?? "w-full h-[calc(100vh-12rem)] rounded-xl overflow-hidden"}
      role="application"
      aria-label="맛집 지도"
    />
  );
}
