"use client";

import { useRef, useCallback, useEffect, useState } from "react";

type SheetState = "hidden" | "peek" | "expanded";

interface BottomSheetProps {
  state: SheetState;
  onStateChange: (state: SheetState) => void;
  children: React.ReactNode;
}

const DRAG_THRESHOLD = 50;

function getTranslateY(state: SheetState): string {
  switch (state) {
    case "hidden":
      return "100%";
    case "peek":
      return "70%";
    case "expanded":
      return "20%";
  }
}

export default function BottomSheet({
  state,
  onStateChange,
  children,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const currentTranslateY = useRef(0);
  const isDragging = useRef(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (sheetRef.current) {
      const pct = parseFloat(getTranslateY(state));
      currentTranslateY.current = (window.innerHeight * pct) / 100;
    }
  }, [state]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    isDragging.current = true;
    setDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !sheetRef.current) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    const pct = parseFloat(getTranslateY("peek"));
    const baseY = (window.innerHeight * pct) / 100;
    const newY = Math.max(0, baseY + dy);
    sheetRef.current.style.transform = `translateY(${newY}px)`;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setDragging(false);
      const dy = e.changedTouches[0].clientY - dragStartY.current;

      if (sheetRef.current) {
        sheetRef.current.style.transform = "";
      }

      if (dy < -DRAG_THRESHOLD) {
        // Swiped up
        if (state === "hidden") onStateChange("peek");
        else if (state === "peek") onStateChange("expanded");
      } else if (dy > DRAG_THRESHOLD) {
        // Swiped down
        if (state === "expanded") onStateChange("peek");
        else if (state === "peek") onStateChange("hidden");
      }
    },
    [state, onStateChange],
  );

  return (
    <div
      ref={sheetRef}
      className={`fixed inset-x-0 bottom-0 z-30 bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] ${
        dragging ? "" : "transition-transform duration-300 ease-out"
      }`}
      style={{
        transform: dragging ? undefined : `translateY(${getTranslateY(state)})`,
        height: "100%",
      }}
    >
      <div
        className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>
      <div className="overflow-y-auto px-4 pb-24" style={{ height: "calc(100% - 2.5rem)" }}>
        {children}
      </div>
    </div>
  );
}
