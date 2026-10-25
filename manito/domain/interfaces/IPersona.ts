import { DisponibilidadLaboral } from "../enums/Persona/DisponibilidadLaboral";
import { EstadoCedula } from "../enums/Persona/EstadoCedula";
import { EstadoVivienda } from "../enums/Persona/EstadoVivienda";
import { NivelEstudio } from "../enums/Persona/NivelEstudio";
import { Refugio } from "../enums/Persona/Refugio";

export interface IPersona {
  id: string; // UUID
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
}