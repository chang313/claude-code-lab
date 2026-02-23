"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Bounds, MarkerType } from "@/types";

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  markerType: MarkerType;
  starRating?: number | null;
  category?: string;
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
        Marker: new (options: { map: KakaoMap; position: unknown; image?: KakaoMarkerImage }) => KakaoMarker;
        MarkerImage: new (src: string, size: KakaoSize, options?: { offset: KakaoPoint }) => KakaoMarkerImage;
        Point: new (x: number, y: number) => KakaoPoint;
        Size: new (width: number, height: number) => KakaoSize;
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

interface KakaoMarkerImage {
  _brand: "KakaoMarkerImage";
}

interface KakaoSize {
  _brand: "KakaoSize";
}

interface KakaoPoint {
  _brand: "KakaoPoint";
}

interface KakaoInfoWindow {
  open: (map: KakaoMap, marker: KakaoMarker) => void;
  close: () => void;
}

// Circular SVG marker icons as data URIs (20x20px, ASCII-only for btoa() compat)
// Red dot for search, blue heart for wishlist, orange star for visited
const MARKER_SVGS: Record<MarkerType, string> = {
  search: [
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">',
    '<circle cx="10" cy="10" r="9" fill="#E74C3C"/>',
    '<circle cx="10" cy="10" r="3" fill="white"/>',
    "</svg>",
  ].join(""),
  wishlist: [
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">',
    '<circle cx="10" cy="10" r="9" fill="#3498DB"/>',
    '<path d="M10 7c-1-1.4-3-1.7-4 0s-.7 3.7 4 6.7c4.7-3 5-5 4-6.7s-3-1.4-4 0z" fill="white"/>',
    "</svg>",
  ].join(""),
  visited: [
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">',
    '<circle cx="10" cy="10" r="9" fill="#F39C12"/>',
    '<path d="M10 5l1.5 3 3.2.5-2.3 2.2.5 3.3L10 12.2 7.1 14l.5-3.3L5.3 8.5 8.5 8z" fill="white"/>',
    "</svg>",
  ].join(""),
};

// Lazy: only build data URIs in browser (btoa unavailable during SSR)
let markerIconCache: Record<MarkerType, string> | null = null;
function getMarkerIconSrc(type: MarkerType): string {
  if (!markerIconCache) {
    markerIconCache = {
      search: `data:image/svg+xml;base64,${btoa(MARKER_SVGS.search)}`,
      wishlist: `data:image/svg+xml;base64,${btoa(MARKER_SVGS.wishlist)}`,
      visited: `data:image/svg+xml;base64,${btoa(MARKER_SVGS.visited)}`,
    };
  }
  return markerIconCache[type];
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
      const markerImage = new window.kakao.maps.MarkerImage(
        getMarkerIconSrc(m.markerType),
        new window.kakao.maps.Size(20, 20),
        { offset: new window.kakao.maps.Point(10, 10) },
      );
      const marker = new window.kakao.maps.Marker({ map, position, image: markerImage });
      markerRefs.current.push(marker);

      let statusHtml = "";
      if (m.markerType === "visited" && m.starRating) {
        const stars = "★".repeat(m.starRating) + "☆".repeat(5 - m.starRating);
        statusHtml = `<div style="color:#F39C12;font-size:12px;">${stars} 저장됨</div>`;
      } else if (m.markerType === "wishlist") {
        statusHtml = '<div style="color:#3498DB;font-size:12px;">♡ 가고 싶은 곳</div>';
      }

      const infoContent = `
        <div style="padding:8px;min-width:150px;font-size:14px;">
          <strong>${m.name}</strong>
          ${statusHtml}
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
