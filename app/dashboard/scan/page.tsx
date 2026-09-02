import { PageHeading } from '@/components/dashboard/PageHeading';
import { WasteScanner } from '@/components/dashboard/WasteScanner';

export default function ScanPage() {
  return (
    <>
      <PageHeading
        title="สแกนขยะ"
        caption="ถ่ายรูปขยะที่แยกและล้างแล้ว ระบบจะบอกชนิดและแต้มที่ได้ทันที"
      />
      <WasteScanner />
    </>
  );
}
