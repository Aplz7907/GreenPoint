/**
 * The icons the app actually needs, hand-written.
 *
 * This file exists so `lucide-react` can stay out of the dependency list: a
 * dozen inline paths cost nothing next to a component library that ships into
 * every client bundle.
 */

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 10.2 12 3.5l9 6.7V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </Svg>
  );
}

export function TrophyIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v1a4 4 0 0 0 4 4" />
      <path d="M17 6h3v1a4 4 0 0 1-4 4" />
      <path d="M12 14v3" />
      <path d="M8.5 20h7" />
    </Svg>
  );
}

export function GiftIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="9" width="18" height="12" rx="1.5" />
      <path d="M3 13.5h18" />
      <path d="M12 9v12" />
      <path d="M7.5 9a2.5 2.5 0 1 1 0-5C10 4 12 9 12 9s2-5 4.5-5a2.5 2.5 0 1 1 0 5" />
    </Svg>
  );
}

export function CameraIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 7.5h3l1.5-2.5h7L17 7.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </Svg>
  );
}

export function HistoryIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

/** The brand mark. Also the decorative motif, at low opacity and large sizes. */
export function LeafIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M11 20.5A7.5 7.5 0 0 1 9.7 5.9C15.6 4.8 17.1 4.3 19.2 1.8c1 2.1 2 4.3 2 8.2 0 5.7-4.9 10.5-10.2 10.5Z" />
      <path d="M2.5 21.5c0-3.1 1.9-5.5 5.2-6.2 2.5-.5 5-2 6.1-3.3" />
    </Svg>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </Svg>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5a8.5 8.5 0 1 0 10.8 10.8Z" />
    </Svg>
  );
}

/** Points, bonuses, "you earned something" — anywhere a number is celebrated. */
export function SparkIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.5l-1.8-5.9L4.5 10.8 10.2 9z" />
    </Svg>
  );
}

export function FlameIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3s5 3.6 5 8.5a5 5 0 0 1-10 0C7 9 9 7 9 7s0 2 1.5 2.5C11.5 10 12 8 12 3Z" />
    </Svg>
  );
}

export function ScaleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 4.5v15" />
      <path d="M6.5 19.5h11" />
      <path d="M4 9h16l-2.5 5H6.5z" />
      <circle cx="12" cy="4.5" r="1.4" />
    </Svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </Svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M9.5 5.5 16 12l-6.5 6.5" />
    </Svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
    </Svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.3h.01" />
    </Svg>
  );
}

export function TargetIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </Svg>
  );
}

export function MapPinIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </Svg>
  );
}

export function StoreIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 4h16l1.2 4.2A2.8 2.8 0 0 1 18.5 12 2.8 2.8 0 0 1 15.7 9.6 2.8 2.8 0 0 1 12 12a2.8 2.8 0 0 1-3.7-2.4A2.8 2.8 0 0 1 5.5 12 2.8 2.8 0 0 1 2.8 8.2z" />
      <path d="M4.5 12v8h15v-8" />
      <path d="M9.5 20v-5h5v5" />
    </Svg>
  );
}

export function RecycleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M9.2 5.6 12 3l2.8 2.6" />
      <path d="M12 3v6.5" />
      <path d="M5.4 14.3 4 17.8l3.6.9" />
      <path d="m4 17.8 5.6-3.3" />
      <path d="m18.6 14.3 1.4 3.5-3.6.9" />
      <path d="m20 17.8-5.6-3.3" />
      <path d="M8 21h8" />
    </Svg>
  );
}

export function BookIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 5.5A2 2 0 0 1 6 3.5h13v14H6a2 2 0 0 0-2 2z" />
      <path d="M4 19.5a2 2 0 0 1 2-2h13v3H6a2 2 0 0 1-2-2z" />
      <path d="M8 7.5h7" />
    </Svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </Svg>
  );
}

/**
 * The scan-frame mark from the prototype's centre button — four corner
 * brackets, not a camera. It reads as "point this at something", which is what
 * the button actually does.
 */
export function ScanIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 9V6.5A2.5 2.5 0 0 1 6.5 4H9" />
      <path d="M15 4h2.5A2.5 2.5 0 0 1 20 6.5V9" />
      <path d="M20 15v2.5a2.5 2.5 0 0 1-2.5 2.5H15" />
      <path d="M9 20H6.5A2.5 2.5 0 0 1 4 17.5V15" />
      <path d="M7.5 12h9" />
    </Svg>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Svg>
  );
}

export function CoinIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.5 9.3A3 3 0 0 0 12 8c-1.7 0-3 .9-3 2.1 0 2.6 6 1.3 6 3.8 0 1.2-1.3 2.1-3 2.1a3 3 0 0 1-2.5-1.3" />
      <path d="M12 6.5v11" />
    </Svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 7h16" />
      <path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
      <path d="M6.2 7 7 19.1A1.9 1.9 0 0 0 8.9 21h6.2a1.9 1.9 0 0 0 1.9-1.9L17.8 7" />
      <path d="M10.5 11v6M13.5 11v6" />
    </Svg>
  );
}

export function BagIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M9 3.5 7 8h10L15 3.5z" />
      <path d="M6.6 8h10.8l1.3 10.9A2 2 0 0 1 16.7 21H7.3a2 2 0 0 1-2-2.1z" />
      <path d="M10 13.5h4" />
    </Svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M18 6l-1.4 1.4M7.4 16.6 6 18M18 18l-1.4-1.4M7.4 7.4 6 6" />
    </Svg>
  );
}

/**
 * The globe. Used at icon scale where `HeroMascot` cannot go — the mascot
 * carries a `clipPath` id, so a second copy on the same page would collide.
 */
export function EarthIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.3 10.2h5.2l2 3-1.7 3.2.9 3.3" />
      <path d="M15.4 20.3 14 17.1l2.7-2.7 4-.5" />
      <path d="m8.9 3.6 1.5 2.4 3.6.5 2.1-2.5" />
    </Svg>
  );
}
