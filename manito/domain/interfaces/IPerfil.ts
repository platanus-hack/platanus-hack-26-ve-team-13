import { ObjectId } from 'mongodb';
import { IFechasPerfil } from './IFechasPerfil';
import { IHistorialLaboral } from './IHistorialLaboral';
import { INegocioPropio } from './INegocioPropio';
import { IOficioPrincipal } from './IOficioPrincipal';
import { IReferencia } from './IReferencia';
import { IValidacionTecnicaIA } from './IValidacionTecnicaIA';
import { BusquedaLaboral } from '../enums/Perfil/BusquedaLaboral';


export interface IPerfil {
    _id?: ObjectId;
    persona_id: string; // UUID referenciando Persona
    oficio_principal: IOficioPrincipal;
    oficios_secundarios: string[];
    busqueda_laboral: BusquedaLaboral;
    historial_laboral: IHistorialLaboral;
    negocio_propio: INegocioPropio;
    referencias: IReferencia[];
    validacion_tecnica_ia: IValidacionTecnicaIA;
    fechas: IFechasPerfil;
}
