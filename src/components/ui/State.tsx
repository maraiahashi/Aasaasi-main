// src/components/ui/State.tsx
import React from "react";

export const Loading: React.FC<{ label?: string }> = ({ label = "Loading…" }) => (
  <div className="p-4 text-sm text-gray-500">{label}</div>
);

export const ErrorNote: React.FC<{ error: unknown }> = ({ error }) => (
  <div className="p-4 text-sm text-red-600">
    {error instanceof Error ? error.message : String(error)}
  </div>
);
