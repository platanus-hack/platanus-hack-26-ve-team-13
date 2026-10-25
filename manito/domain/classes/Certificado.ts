import { ResultadoCertificado } from "../enums/Certificado/ResultadoCertificado";
import { ICertificado } from "../interfaces/ICertificado";

export class Certificado implements ICertificado {
  id: number;
  persona_id: string;
  curso_id: string;
  resultado: ResultadoCertificado;

  constructor(data: ICertificado) {
    this.id = data.id;
    this.persona_id = data.persona_id;
    this.curso_id = data.curso_id;
    this.resultado = data.resultado;
  }
}