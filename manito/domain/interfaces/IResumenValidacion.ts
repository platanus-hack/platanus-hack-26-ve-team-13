import { NivelCerteza } from '../enums/Perfil/NivelCerteza';

export interface IResumenValidacion {
    nivel_certeza_oficio: NivelCerteza;
    puntuacion_global: number;
    resumen_ia: string;
}
