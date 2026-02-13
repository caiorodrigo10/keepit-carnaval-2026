import { Suspense } from "react";
import { ScreenDisplay } from "./content";
import { ScreenLoadingFallback } from "./fallback";

interface TelaoPageProps {
  params: Promise<{
    "screen-id": string;
  }>;
}

export async function generateMetadata({ params }: TelaoPageProps) {
  const resolvedParams = await params;
  const screenId = resolvedParams["screen-id"];

  return {
    title: `Telao ${screenId} | Keepit Carnaval 2026`,
    description: "Exibicao de fotos do Carnaval 2026 no Anhembi",
    robots: "noindex, nofollow",
  };
}

export default async function TelaoPage({ params }: TelaoPageProps) {
  const resolvedParams = await params;
  const screenId = resolvedParams["screen-id"];

  return (
    <Suspense fallback={<ScreenLoadingFallback />}>
      <ScreenDisplay screenId={screenId} />
    </Suspense>
  );
}
