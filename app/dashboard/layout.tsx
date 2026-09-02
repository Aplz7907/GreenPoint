import type { Metadata } from 'next';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export const metadata: Metadata = {
  title: 'EcoPoint — สะสมขยะแลกแต้ม',
  description: 'แยกขยะ สแกนรับแต้ม แล้วแลกของรางวัลจากร้านค้าพาร์ทเนอร์',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
