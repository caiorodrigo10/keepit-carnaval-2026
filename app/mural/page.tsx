import { Suspense } from "react";
import { MuralContent } from "./content";
import { MuralSkeleton } from "./skeleton";

export default function MuralPage() {
  return (
    <Suspense fallback={<MuralSkeleton />}>
      <MuralContent />
    </Suspense>
  );
}
