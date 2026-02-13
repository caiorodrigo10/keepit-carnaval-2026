import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Keepit Admin",
    default: "Keepit Admin",
  },
  description: "Painel administrativo Keepit Carnaval 2026",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
