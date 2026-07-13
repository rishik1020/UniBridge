import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

export const StarRating = ({ value, onChange, size = "md", readOnly = false, className }: StarRatingProps) => {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  return (
    <div className={cn("inline-flex items-center gap-1", className)} role={readOnly ? "img" : "radiogroup"} aria-label={`Rating ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= display;
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => !readOnly && setHover(0)}
            onClick={() => !readOnly && onChange?.(n)}
            className={cn(
              "transition-transform",
              !readOnly && "hover:scale-110 cursor-pointer",
              readOnly && "cursor-default"
            )}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                sizeMap[size],
                filled ? "fill-warning text-warning" : "fill-transparent text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
    </div>
  );
};