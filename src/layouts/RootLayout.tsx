import React from "react";
import { Outlet } from "react-router-dom";
import ApiStatusBanner from "@/components/system/ApiStatusBanner";

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <ApiStatusBanner />
      {/* Put your header/nav here if you have one */}
      <main className="w-full">
        <Outlet />
      </main>
    </div>
  );
}
