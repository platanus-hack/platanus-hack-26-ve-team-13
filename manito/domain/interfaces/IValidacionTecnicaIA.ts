import { IEvaluacionDetallada } from './IEvaluacionDetallada';
import { IResumenValidacion } from './IResumenValidacion';

export interface IValidacionTecnicaIA {
    resumen_validacion?: IResumenValidacion;
    evaluacion_detallada?: IEvaluacionDetallada;
}
