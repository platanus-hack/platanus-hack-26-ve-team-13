import { IOficioPrincipal } from '../interfaces/IOficioPrincipal';
import { INegocioPropio } from '../interfaces/INegocioPropio';
import { IReferencia } from '../interfaces/IReferencia';
import { IValidacionTecnicaIA } from '../interfaces/IValidacionTecnicaIA';
import { IHistorialLaboral } from '../interfaces/IHistorialLaboral';
import { IFechasPerfil } from '../interfaces/IFechasPerfil';
import { IPerfil } from '../interfaces/IPerfil';
import { BusquedaLaboral } from '../enums/Perfil/BusquedaLaboral';

export class Perfil implements IPerfil {
  persona_id: string;
  oficio_principal: IOficioPrincipal;
  oficios_secundarios: string[];
  busqueda_laboral: BusquedaLaboral;
  historial_laboral: IHistorialLaboral;
  negocio_propio: INegocioPropio;
  referencias: IReferencia[];
  validacion_tecnica_ia: IValidacionTecnicaIA;
  fechas: IFechasPerfil;

  constructor(data: IPerfil) {
    this.persona_id = data.persona_id;
    this.oficio_principal = data.oficio_principal;
    this.oficios_secundarios = data.oficios_secundarios || [];
    this.busqueda_laboral = data.busqueda_laboral;
    this.historial_laboral = data.historial_laboral;
    this.negocio_propio = data.negocio_propio;
    this.referencias = data.referencias || [];
    this.validacion_tecnica_ia = data.validacion_tecnica_ia;
    this.fechas = {
      creado_en: data.fechas?.creado_en ? new Date(data.fechas.creado_en) : new Date(),
      actualizado_en: data.fechas?.actualizado_en ? new Date(data.fechas.actualizado_en) : new Date(),
    };
  }
}