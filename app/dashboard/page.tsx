import { HeroBanner } from '@/components/dashboard/HeroBanner';
import { ImpactGrid } from '@/components/dashboard/ImpactGrid';
import { MissionList } from '@/components/dashboard/MissionList';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { PointsHistoryTable } from '@/components/dashboard/PointsHistoryTable';

/**
 * Order is deliberate: the pitch, then the four numbers that prove it, then the
 * things to do, then what the user already did. Recent activity sits last
 * because it is the only block someone scrolls to on purpose.
 */
export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <HeroBanner />
      <ImpactGrid />
      <QuickActions />
      <MissionList />

      <section>
        <SectionHeader
          title="ความเคลื่อนไหวล่าสุด"
          caption="แต้มเข้า-ออกในบัญชีของคุณ"
          actionLabel="ดูทั้งหมด"
          actionHref="/dashboard/history"
        />
        <PointsHistoryTable />
      </section>
    </div>
  );
}
