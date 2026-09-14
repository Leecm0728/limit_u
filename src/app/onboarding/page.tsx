import { Suspense } from "react";
import { Onboarding } from "@/features/onboarding";
export default function Page() {
  return (
    <Suspense fallback={<main className="workspace">입력 준비 중…</main>}>
      <Onboarding />
    </Suspense>
  );
}
