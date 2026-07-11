import type { Metadata } from "next";

import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "Dashboard — PlayBox",
};

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <DashboardContent />
    </div>
  );
}
