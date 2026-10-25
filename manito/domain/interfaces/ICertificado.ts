import { ResultadoCertificado } from "../enums/Certificado/ResultadoCertificado";

export interface ICertificado {
  id: number;
  persona_id: string;
  curso_id: string;
  resultado: ResultadoCertificado;
}