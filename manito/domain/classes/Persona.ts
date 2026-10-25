import { DisponibilidadLaboral } from "../enums/Persona/DisponibilidadLaboral";
import { EstadoCedula } from "../enums/Persona/EstadoCedula";
import { EstadoVivienda } from "../enums/Persona/EstadoVivienda";
import { NivelEstudio } from "../enums/Persona/NivelEstudio";
import { Refugio } from "../enums/Persona/Refugio";
import { IPersona } from "../interfaces/IPersona";

export class Persona implements IPersona {
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

  constructor(data: IPersona) {
    this.id = data.id;
    this.nombres = data.nombres;
    this.apellidos = data.apellidos;
    this.estado_cedula = data.estado_cedula;
    this.numero_cedula = data.numero_cedula;
    this.fecha_nacimiento = data.fecha_nacimiento;
    this.telefono= data.telefono;
    this.pertenece_refugio = data.pertenece_refugio;
    this.refugio = data.refugio;
    this.direccion = data.direccion;
    this.estado_vivienda = data.estado_vivienda;
    this.nivel_estudio = data.nivel_estudio;
    this.disponibilidad_laboral = data.disponibilidad_laboral;
  }

  // Método de conveniencia
  get nombreCompleto(): string {
    return `${this.nombres} ${this.apellidos}`;
  }
}