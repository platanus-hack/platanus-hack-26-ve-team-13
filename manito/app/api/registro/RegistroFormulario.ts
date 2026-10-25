import { DisponibilidadLaboral } from "@/domain/enums/Persona/DisponibilidadLaboral";
import { EstadoCedula } from "@/domain/enums/Persona/EstadoCedula";
import { EstadoVivienda } from "@/domain/enums/Persona/EstadoVivienda";
import { NivelEstudio } from "@/domain/enums/Persona/NivelEstudio";
import { Refugio } from "@/domain/enums/Persona/Refugio";

export interface RegistroFormulario {
  id: string;
  nombres: string;
  apellidos: string;
  estado_cedula: EstadoCedula;
  numero_cedula?: string | null;
  fecha_nacimiento: Date;
  telefono?: string | null;
  pertenece_refugio: boolean;
  refugio?: Refugio | null;
  direccion?: string | null;
  estado_vivienda: EstadoVivienda;
  nivel_estudio: NivelEstudio;
  disponibilidad_laboral: DisponibilidadLaboral;
  certificados: string[];
}