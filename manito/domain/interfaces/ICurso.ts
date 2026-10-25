import { CategoriaCurso } from "../enums/Curso/CategoriaCurso";
import { ModalidadCurso } from "../enums/Curso/ModalidadCurso";
import { NivelCurso } from "../enums/Curso/NivelCurso";

export interface ICurso {
  id: string; // UUID
  categoria: CategoriaCurso;
  nivel: NivelCurso;
  cupos?: number | null;
  modalidad: ModalidadCurso;
}