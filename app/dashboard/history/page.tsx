import { PageHeading } from '@/components/dashboard/PageHeading';
import { PointsHistoryTable } from '@/components/dashboard/PointsHistoryTable';

export default function HistoryPage() {
  return (
    <>
      <PageHeading
        title="ประวัติแต้ม"
        caption="ทุกครั้งที่ได้รับและใช้แต้ม ย้อนหลังได้ 12 เดือน"
      />
      <PointsHistoryTable />
    </>
  );
}
