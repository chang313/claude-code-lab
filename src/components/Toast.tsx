"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  onDismiss: () => void;
  type: "success" | "error";
  duration?: number;
}

export default function Toast({
  message,
  onDismiss,
  type,
  duration = 3000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div className="absolute bottom-36 left-4 right-4 z-40 flex justify-center">
      <button
        type="button"
        onClick={onDismiss}
        className={`${type === "success" ? "bg-green-600" : "bg-red-600"} text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in`}
      >
        {message}
      </button>
    </div>
  );
}
