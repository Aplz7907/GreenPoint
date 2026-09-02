import type { LucideIcon } from 'lucide-react';
import {
  Award,
  Cloud,
  Coins,
  Gift,
  HandHeart,
  History,
  LayoutDashboard,
  Newspaper,
  Recycle,
  ScanLine,
  Settings,
  Target,
  Trash2,
} from 'lucide-react';

/**
 * Every screen in this dashboard reads from here rather than from its own
 * inline literals. One file to swap for a real fetch later, and no chance of
 * the sidebar's point balance drifting away from the header's.
 */

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
  { href: '/dashboard/scan', label: 'สแกนขยะ', icon: ScanLine },
  { href: '/dashboard/missions', label: 'ภารกิจ', icon: Target },
  { href: '/dashboard/rewards', label: 'แลกของรางวัล', icon: Gift },
  { href: '/dashboard/history', label: 'ประวัติแต้ม', icon: History },
  { href: '/dashboard/settings', label: 'ตั้งค่า', icon: Settings },
];

/** The four slots the bottom bar can fit on a 360px phone without wrapping. */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  NAV_ITEMS[0],
  NAV_ITEMS[2],
  NAV_ITEMS[3],
  NAV_ITEMS[4],
];

export const USER = {
  name: 'ปาริชาต ใจดี',
  initials: 'ปจ',
  level: 'Eco Hero',
  points: 2450,
};

export type Stat = {
  label: string;
  value: string;
  unit?: string;
  delta: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon chip. Kept together so the tint and its
   *  foreground can never be paired wrongly at the call site. */
  tone: string;
};

export const STATS: Stat[] = [
  {
    label: 'ขยะที่รีไซเคิลแล้ว',
    value: '184',
    unit: 'ชิ้น',
    delta: '+12 สัปดาห์นี้',
    icon: Recycle,
    tone: 'bg-emerald-100 text-emerald-700',
  },
  {
    label: 'แต้มคงเหลือ',
    value: '2,450',
    unit: 'แต้ม',
    delta: '+180 เดือนนี้',
    icon: Coins,
    tone: 'bg-amber-100 text-amber-700',
  },
  {
    label: 'ลด CO₂ ได้',
    value: '36.8',
    unit: 'kg',
    delta: '≈ ปลูกต้นไม้ 3 ต้น',
    icon: Cloud,
    tone: 'bg-sky-100 text-sky-700',
  },
  {
    label: 'ระดับปัจจุบัน',
    value: 'Eco Hero',
    delta: 'อีก 550 แต้มถึง Legend',
    icon: Award,
    tone: 'bg-violet-100 text-violet-700',
  },
];

export type QuickAction = {
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
  tone: string;
};

export const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'แยกขยะ',
    hint: 'สแกนแล้วรับแต้มทันที',
    href: '/dashboard/scan',
    icon: Trash2,
    tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  },
  {
    label: 'บริจาคขยะ',
    hint: 'ส่งต่อให้จุดรับใกล้บ้าน',
    href: '/dashboard/donate',
    icon: HandHeart,
    tone: 'bg-teal-50 text-teal-700 ring-teal-100',
  },
  {
    label: 'แลกของรางวัล',
    hint: 'มี 24 รายการให้เลือก',
    href: '/dashboard/rewards',
    icon: Gift,
    tone: 'bg-amber-50 text-amber-700 ring-amber-100',
  },
  {
    label: 'ข่าวสารสิ่งแวดล้อม',
    hint: 'อ่านเรื่องใกล้ตัววันนี้',
    href: '/dashboard/news',
    icon: Newspaper,
    tone: 'bg-sky-50 text-sky-700 ring-sky-100',
  },
];

export type Mission = {
  title: string;
  detail: string;
  current: number;
  goal: number;
  reward: number;
  badge: 'รายวัน' | 'รายสัปดาห์' | 'พิเศษ';
};

export const MISSIONS: Mission[] = [
  {
    title: 'แยกขวดพลาสติก 5 ชิ้น',
    detail: 'สแกนขวด PET ที่ล้างและบีบแล้ว',
    current: 3,
    goal: 5,
    reward: 50,
    badge: 'รายวัน',
  },
  {
    title: 'สแกนต่อเนื่อง 7 วัน',
    detail: 'เหลืออีก 2 วันก็ครบสตรีค',
    current: 5,
    goal: 7,
    reward: 120,
    badge: 'รายสัปดาห์',
  },
  {
    title: 'ส่งขยะอิเล็กทรอนิกส์ 1 ชิ้น',
    detail: 'รับที่จุดดรอปพาร์ทเนอร์ทุกสาขา',
    current: 0,
    goal: 1,
    reward: 200,
    badge: 'พิเศษ',
  },
];

export type Txn = {
  id: string;
  title: string;
  detail: string;
  date: string;
  points: number;
  status: 'สำเร็จ' | 'รอตรวจสอบ' | 'ไม่ผ่าน';
};

export const TRANSACTIONS: Txn[] = [
  { id: 'TX-1041', title: 'ขวดพลาสติกใส PET', detail: 'สแกน 4 ชิ้น', date: '2 ก.ย. 2026 · 09:14', points: 40, status: 'สำเร็จ' },
  { id: 'TX-1040', title: 'แลกคูปองกาแฟ', detail: 'Amazon Café 1 แก้ว', date: '1 ก.ย. 2026 · 18:02', points: -100, status: 'สำเร็จ' },
  { id: 'TX-1039', title: 'กระป๋องอลูมิเนียม', detail: 'สแกน 6 ชิ้น', date: '1 ก.ย. 2026 · 08:41', points: 30, status: 'สำเร็จ' },
  { id: 'TX-1038', title: 'กล่องกระดาษลูกฟูก', detail: 'รอเจ้าหน้าที่ยืนยันน้ำหนัก', date: '31 ส.ค. 2026 · 17:20', points: 25, status: 'รอตรวจสอบ' },
  { id: 'TX-1037', title: 'โบนัสภารกิจรายสัปดาห์', detail: 'สแกนครบ 7 วัน', date: '30 ส.ค. 2026 · 21:00', points: 120, status: 'สำเร็จ' },
  { id: 'TX-1036', title: 'แลกถุงผ้า Eco Tote', detail: 'รับที่สาขาสยาม', date: '29 ส.ค. 2026 · 12:35', points: -300, status: 'สำเร็จ' },
  { id: 'TX-1035', title: 'ขวดแก้ว', detail: 'ภาพเบลอ อ่านชนิดขยะไม่ได้', date: '28 ส.ค. 2026 · 10:08', points: 0, status: 'ไม่ผ่าน' },
];
