"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredLead, type StoredLead } from "@/lib/lead-storage";
import { PageLoaderSkeleton } from "@/components/ui/skeleton";
import { UserPhotoUpload } from "./content";

export default function UploadPage() {
  const router = useRouter();
  const [leadData] = useState<StoredLead | null>(() => {
    // Initialize synchronously to get lead data
    if (typeof window !== "undefined") {
      return getStoredLead();
    }
    return null;
  });
  const [isLoading] = useState(() => {
    // Check if we need to redirect (no lead data)
    if (typeof window !== "undefined") {
      return getStoredLead() === null;
    }
    return true;
  });

  useEffect(() => {
    if (!leadData) {
      router.replace("/");
    }
  }, [router, leadData]);

  if (isLoading || !leadData) {
    return <PageLoaderSkeleton />;
  }

  return <UserPhotoUpload lead={leadData} />;
}
