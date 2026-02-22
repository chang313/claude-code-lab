"use client";

interface StarRatingProps {
  value: 1 | 2 | 3 | 4 | 5 | null;
  onChange?: (rating: 1 | 2 | 3 | 4 | 5) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
};

export default function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: StarRatingProps) {
  return (
    <div className="flex gap-0.5" role="group" aria-label="별점">
      {([1, 2, 3, 4, 5] as const).map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`${sizeClasses[size]} ${
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          } transition-transform ${
            value !== null && star <= value
              ? "text-yellow-400"
              : "text-gray-300"
          }`}
          aria-label={`${star}점`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
