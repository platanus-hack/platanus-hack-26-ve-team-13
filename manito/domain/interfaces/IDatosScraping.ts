import { EstadoScraping } from '../enums/Perfil/EstadoScraping';

export interface IDatosScraping {
    estado_scraping: EstadoScraping;
    nombre_comercial?: string;
    contribuyente_tipo?: string;
    fecha_verificacion?: Date;
}
