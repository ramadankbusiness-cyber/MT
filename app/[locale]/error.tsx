"use client";

import { useEffect } from "react";
import { BrandedErrorScreen } from "@/components/branded-error-screen";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Route error]", { digest: error.digest }, error);
  }, [error]);

  return <BrandedErrorScreen variant="500" errorId={error.digest} onRetry={reset} />;
}
