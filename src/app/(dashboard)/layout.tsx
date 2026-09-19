import React from "react";
import Navbar from "@/components/modules/Navbar";
import Sidebar from "@/components/modules/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-ink w-full max-w-full overflow-x-hidden">
      <Navbar />
      <div className="flex-1 flex flex-col md:flex-row min-w-0 w-full max-w-full overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 w-full max-w-7xl mx-auto p-3 sm:p-5 lg:p-6 pb-28 md:pb-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
