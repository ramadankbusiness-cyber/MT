import { BrandedErrorScreen } from "@/components/branded-error-screen";

export const metadata = { title: "No access" };

export default function ForbiddenPage() {
  return <BrandedErrorScreen variant="403" />;
}
