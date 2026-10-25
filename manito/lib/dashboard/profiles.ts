// Lee los registros para el panel de Impaktemos: Persona de Supabase unida con su Perfil de Mongo.
import { createClient } from "@supabase/supabase-js";
import { MongoClient } from "mongodb";
import { connection } from "next/server";
import type { DisponibilidadLaboral } from "@/domain/enums/Persona/DisponibilidadLaboral";
import type { IPerfil } from "@/domain/interfaces/IPerfil";
import type { IPersona } from "@/domain/interfaces/IPersona";
import { sugerirCertificaciones, type Certificacion } from "./courses";

// Fila tal como está en Supabase: la columna se llama `disponibilidad` y las fechas llegan como texto
export type PersonaRow = Omit<IPersona, "disponibilidad_laboral" | "fecha_nacimiento"> & {
  disponibilidad: DisponibilidadLaboral;
  fecha_nacimiento: string;
  creado_en: string;
};

export type PerfilDoc = Omit<IPerfil, "_id" | "fechas">;

export type Registro = {
  persona: PersonaRow;
  perfil: PerfilDoc | null;   // puede faltar si el registro se hizo a mano en Supabase
  certificaciones: Certificacion[];
};

const LIMITE = 100;

// Un solo cliente por proceso; el servicio de registro abre y cierra el suyo aparte
let mongo: Promise<MongoClient> | null = null;
const mongoClient = () => (mongo ??= new MongoClient(process.env.MONGODB_URI ?? "").connect());

export const dbConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.MONGODB_URI);

export async function listRegistros(): Promise<Registro[]> {
  await connection();   // siempre datos frescos: nada de esto entra al prerender
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
  const { data: personas, error } = await supabase
    .from("Persona")
    .select("*")
    .order("creado_en", { ascending: false })
    .limit(LIMITE);
  if (error) throw new Error(`Supabase: ${error.message}`);

  const ids = (personas ?? []).map((p) => p.id as string);
  const client = await mongoClient();
  const docs = await client
    .db(process.env.MONGODB_DB_NAME || "Manito")
    .collection("Perfil")
    .find({ persona_id: { $in: ids } }, { projection: { _id: 0 } })
    .toArray();
  // JSON ida y vuelta: las fechas de Mongo pasan a texto para poder mandarlas al cliente
  const perfiles = new Map(docs.map((d) => [d.persona_id as string, JSON.parse(JSON.stringify(d)) as PerfilDoc]));

  return (personas as PersonaRow[]).map((persona) => {
    const perfil = perfiles.get(persona.id) ?? null;
    return { persona, perfil, certificaciones: perfil ? sugerirCertificaciones(perfil) : [] };
  });
}
