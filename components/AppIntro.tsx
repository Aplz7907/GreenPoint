import {
  EarthIcon,
  GiftIcon,
  RecycleIcon,
  ScanIcon,
} from '@/components/Icons';

/**
 * The app mark: a green bin with the sorted waste going into it.
 *
 * Literal colours, like `HeroScene` and for the same reason — this is a
 * picture, not a surface. The bottle has to stay bottle-blue and the box
 * cardboard-brown in both themes, because "sorted by type" is the whole
 * content of the drawing; recolouring it with the theme would erase it.
 */
const BIN = '#2E7D32';
const BIN_LID = '#1B5E20';

export function BinLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label="ถังรีไซเคิลพร้อมขยะที่แยกแล้ว"
      focusable="false"
    >
      {/* The three items are drawn FIRST so the bin overlaps their base — that
          overlap is what reads as "going in" rather than "sitting beside". */}

      {/* Clear plastic bottle */}
      <g transform="translate(20 4) rotate(-12 12 22)">
        <rect x="7.5" y="0" width="9" height="7" rx="2" fill="#5FA8CC" />
        <path
          d="M8 7h8v3c0 2 4 4 4 8v16a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V18c0-4 4-6 4-8z"
          fill="#9BD5EE"
        />
        <path d="M8 20h3.5v13H8z" fill="#FFFFFF" opacity="0.45" />
      </g>

      {/* Paper */}
      <g transform="translate(47 2) rotate(6 13 16)">
        <rect x="0" y="0" width="26" height="32" rx="3" fill="#FFF6E3" />
        <g stroke="#C7B48C" strokeWidth="2" strokeLinecap="round">
          <path d="M6 9h14M6 15h14M6 21h9" />
        </g>
      </g>

      {/* Cardboard box */}
      <g transform="translate(74 8) rotate(10 16 16)">
        <path d="M2 8h28v22H2z" fill="#D3A06A" />
        <path d="M2 8 16 2l14 6-14 6z" fill="#E8BC8A" />
        <path d="M16 14v16" stroke="#B07E4C" strokeWidth="2" />
      </g>

      {/* Bin */}
      <rect x="52" y="40" width="16" height="7" rx="3.5" fill={BIN_LID} />
      <rect x="28" y="46" width="64" height="11" rx="5.5" fill={BIN_LID} />
      <path
        d="M33 57h54l-5 46a6 6 0 0 1-6 5.4H44a6 6 0 0 1-6-5.4z"
        fill={BIN}
      />

      {/* Recycling triad on the bin front. One arrow, drawn three times at
          120° — hand-placing three of them is how they end up uneven. */}
      <g fill="#FFFFFF" opacity="0.92">
        {[0, 120, 240].map((angle) => (
          <path
            key={angle}
            transform={`rotate(${angle} 60 82)`}
            d="M60 73l6 10h-3.6v8h-4.8v-8H54z"
          />
        ))}
      </g>
    </svg>
  );
}

/**
 * What the app is, for someone who has not signed in yet.
 *
 * Four promises, one line each, under the mark. It lives on the signed-out
 * screens only — a returning user does not need to be told what the product
 * does above their own balance.
 */
const FEATURES = [
  { Icon: ScanIcon, title: 'สแกน', detail: 'เพิ่มแต้ม' },
  { Icon: RecycleIcon, title: 'แยกขยะ', detail: 'ถูกประเภท' },
  { Icon: GiftIcon, title: 'สะสมแต้ม', detail: 'แลกของรางวัล' },
  { Icon: EarthIcon, title: 'รักษ์โลก', detail: 'อย่างยั่งยืน' },
];

export function AppIntro({ className = '' }: { className?: string }) {
  return (
    <section className={className} aria-label="แอปนี้ทำอะไรได้บ้าง">
      <p className="text-center text-sm font-semibold text-ink">
        แอปสะสมขยะแลกแต้ม
      </p>
      <p className="mt-1 text-center text-sm text-ink-subtle text-balance">
        แยกขยะง่าย ๆ ได้แต้ม ช่วยโลก ได้ของรางวัล
      </p>

      {/*
        Two columns, not four. Every label here is two lines of Thai; at a
        quarter of a 360px screen the second line breaks mid-word, which the
        one-word home tiles never have to survive.
      */}
      <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {FEATURES.map(({ Icon, title, detail }) => (
          <li
            key={title}
            className="flex items-center gap-2.5 rounded-control border border-line bg-surface px-3 py-2.5 shadow-soft sm:flex-col sm:gap-1.5 sm:py-3.5 sm:text-center"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary-ink">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-medium leading-tight text-ink">
                {title}
              </span>
              <span className="block text-xs leading-tight text-ink-subtle">
                {detail}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
