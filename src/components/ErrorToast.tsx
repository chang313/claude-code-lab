"use client";

import { useEffect } from "react";

interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export default function ErrorToast({
  message,
  onDismiss,
  duration = 3000,
}: ErrorToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div className="absolute bottom-36 left-4 right-4 z-40 flex justify-center">
      <button
        type="button"
        onClick={onDismiss}
        className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in"
      >
        {message}
      </button>
    </div>
  );
}
