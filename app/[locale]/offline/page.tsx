import { BrandedErrorScreen } from "@/components/branded-error-screen";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return <BrandedErrorScreen variant="offline" />;
}
