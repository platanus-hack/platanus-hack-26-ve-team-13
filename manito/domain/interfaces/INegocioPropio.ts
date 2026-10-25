import { IDatosScraping } from './IDatosScraping';

export interface INegocioPropio {
    tuvo_negocio: boolean;
    tenia_rif?: boolean;
    numero_rif?: string;
    datos_scraping?: IDatosScraping;
}
