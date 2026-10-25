import { NivelConfianza } from '../enums/Perfil/NivelConfianza';
import { NivelDemostrado } from '../enums/Perfil/NivelDemostrado';
import { NivelVsExperiencia } from '../enums/Perfil/NivelVsExperiencia';
import { RutaAtencion } from '../enums/Perfil/RutaAtencion';
import { TipoVerificacion } from '../enums/Perfil/TipoVerificacion';

export interface IPuntaje {
    puntaje: number; // 0-3
    citas: string[]; // textuales de la conversación
    razon: string;
}

export interface IVerificacionPendiente {
    tipo: TipoVerificacion;
    detalle: string;
}

// Evaluación completa del agente de voz (Manito)
export interface IEvaluacionDetallada {
    puntajes: {
        especificidad: IPuntaje;
        conocimiento_practico: IPuntaje;
        coherencia: IPuntaje;
        evidencia_externa: IPuntaje;
    };
    nivel_demostrado: NivelDemostrado;
    nivel_vs_experiencia: NivelVsExperiencia;
    confianza: NivelConfianza;
    ruta: RutaAtencion;
    necesita_humano: boolean; // mencionó peligro o una necesidad urgente
    observaciones: string[];
    herramientas_necesarias: string[];
    verificaciones_pendientes: IVerificacionPendiente[];
    modelo: string;
    evaluado_en: Date;
}
