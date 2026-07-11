import { cn } from "@/lib/utils";

type FeatureIconProps = {
  className?: string;
};

export function FeatureSketchIcon({ className }: FeatureIconProps) {
  return (
    <div className={cn("relative size-9 overflow-hidden", className)}>
      <div className="absolute inset-[22.22%_22.22%_16.67%_16.67%]">
        <div className="absolute inset-[-4.55%]">
          <svg
            className="block size-full"
            viewBox="0 0 24.0003 24.0003"
            fill="none"
            aria-hidden
          >
            <path
              d="M1.00019 23.0001C5.00019 3.00013 13.0002 17.0001 23.0002 1.00013"
              stroke="#1A1714"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[13.89%_13.89%_69.44%_69.44%]">
        <div className="absolute inset-[-12.5%]">
          <svg
            className="block size-full"
            viewBox="0 0 7.5 7.5"
            fill="none"
            aria-hidden
          >
            <path
              d="M3.75 6.75C5.4069 6.75 6.75 5.40685 6.75 3.75C6.75 2.09315 5.4069 0.75 3.75 0.75C2.0931 0.75 0.75 2.09315 0.75 3.75C0.75 5.40685 2.0931 6.75 3.75 6.75Z"
              fill="#AD92D3"
              stroke="#1A1714"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function FeatureAiIcon({ className }: FeatureIconProps) {
  return (
    <div className={cn("relative size-9 overflow-hidden", className)}>
      <div className="absolute inset-[22.22%_16.67%_27.78%_16.67%]">
        <div className="absolute inset-[-4.17%_-3.13%]">
          <svg
            className="block size-full"
            viewBox="0 0 25.5 19.5"
            fill="none"
            aria-hidden
          >
            <path
              d="M21.75 0.75H3.75C2.09315 0.75 0.75 2.09315 0.75 3.75V15.75C0.75 17.4069 2.09315 18.75 3.75 18.75H21.75C23.4069 18.75 24.75 17.4069 24.75 15.75V3.75C24.75 2.09315 23.4069 0.75 21.75 0.75Z"
              fill="#AD92D3"
              stroke="#1A1714"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[36.11%_33.33%_41.67%_33.33%]">
        <div className="absolute inset-[-11.25%_-7.5%]">
          <svg
            className="block size-full"
            viewBox="0 0 13.8 9.8"
            fill="none"
            aria-hidden
          >
            <path
              d="M0.9 4.9L4.9 8.9L12.9 0.9"
              stroke="#1A1714"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function FeaturePlayIcon({ className }: FeatureIconProps) {
  return (
    <div className={cn("relative size-9 overflow-hidden", className)}>
      <div className="absolute inset-[27.78%_27.78%_27.78%_38.89%]">
        <div className="absolute inset-[-4.69%_-6.25%]">
          <svg
            className="block size-full"
            viewBox="0 0 13.5 17.5"
            fill="none"
            aria-hidden
          >
            <path
              d="M0.75 0.750001L12.75 8.75L0.75 16.75V0.750001Z"
              fill="#AD92D3"
              stroke="#1A1714"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
