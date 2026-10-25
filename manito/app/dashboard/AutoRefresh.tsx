"use client";
// Vuelve a pedir la lista cada pocos segundos para que aparezcan los registros nuevos
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const INTERVAL_MS = 5000;

export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return (
    <p className="flex items-center gap-2 text-xs opacity-60">
      <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
      En vivo · se actualiza cada {INTERVAL_MS / 1000} s
    </p>
  );
}
