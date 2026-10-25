// Panel de Impaktemos: cada persona que registró Manito, con su perfil y qué certificación ofrecerle
import { Suspense } from "react";
import { dbConfigured, listRegistros } from "@/lib/dashboard/profiles";
import { AutoRefresh } from "./AutoRefresh";
import { ProfileList } from "./ProfileList";

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-60">Impaktemos · Manito</p>
          <h1 className="text-2xl font-semibold">Registros</h1>
        </div>
        <AutoRefresh />
      </header>
      <Suspense fallback={<p className="text-sm opacity-60">Cargando registros…</p>}>
        <Registros />
      </Suspense>
    </main>
  );
}

async function Registros() {
  if (!dbConfigured()) {
    return <p className="text-sm opacity-60">Faltan NEXT_PUBLIC_SUPABASE_URL y MONGODB_URI en .env.local.</p>;
  }
  const registros = await listRegistros();
  return <ProfileList registros={registros} />;
}
