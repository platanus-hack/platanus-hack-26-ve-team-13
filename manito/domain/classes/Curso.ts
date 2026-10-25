import { CategoriaCurso } from "../enums/Curso/CategoriaCurso";
import { ModalidadCurso } from "../enums/Curso/ModalidadCurso";
import { NivelCurso } from "../enums/Curso/NivelCurso";
import { ICurso } from "../interfaces/ICurso";

export class Curso implements ICurso {
  id: string;
  categoria: CategoriaCurso;
  nivel: NivelCurso;
  cupos?: number | null;
  modalidad: ModalidadCurso;

  constructor(data: ICurso) {
    this.id = data.id;
    this.categoria = data.categoria;
    this.nivel = data.nivel;
    this.cupos = data.cupos;
    this.modalidad = data.modalidad;
  }
}