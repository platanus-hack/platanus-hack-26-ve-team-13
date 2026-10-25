import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MongoClient } from 'mongodb';
import { RequestBody } from './RequestBody';

// Clientes de base de datos
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const mongoUri = process.env.MONGODB_URI || '';
const mongoClient = new MongoClient(mongoUri);

export async function sendDatabaseRequest(body: RequestBody) {
  try {
    const { data: persona, error: personaError } = await supabase
      .from('Persona')
      .insert({
        nombres: body.Persona.nombres,
        apellidos: body.Persona.apellidos,
        estado_cedula: body.Persona.estado_cedula,
        numero_cedula: body.Persona.numero_cedula,
        fecha_nacimiento: body.Persona.fecha_nacimiento,
        telefono: body.Persona.telefono,
        pertenece_refugio: body.Persona.pertenece_refugio,
        refugio: body.Persona.refugio,
        direccion: body.Persona.direccion,
        estado_vivienda: body.Persona.estado_vivienda,
        nivel_estudio: body.Persona.nivel_estudio,
        disponibilidad: body.Persona.disponibilidad_laboral,
      })
      .select('id')
      .single();

    if (personaError || !persona) {
      console.error('Error insertando en PostgreSQL:', personaError);
      return NextResponse.json({ error: 'Error al guardar el registro en la base de datos' }, { status: 500 });
    }

    const personaId = persona.id; // UUID retornado de Postgres
    console.info('[db] Persona insertada en Supabase:', personaId);

    // 2. Inicializar documento en MongoDB enlazado por persona_id
    await mongoClient.connect();
    const db = mongoClient.db(process.env.MONGODB_DB_NAME || 'Manito');
    const collection = db.collection('Perfil');

    await collection.insertOne({
      persona_id: personaId,
      oficio_principal: {
        nombre: body.Perfil.oficio_principal.nombre,
        tiempo_experiencia: body.Perfil.oficio_principal.tiempo_experiencia,
        tiene_herramientas: body.Perfil.oficio_principal.tiene_herramientas,
      },
      oficios_secundarios: body.Perfil.oficios_secundarios,
      busqueda_laboral: body.Perfil.busqueda_laboral,
      historial_laboral: {
        trabajos_anteriores: body.Perfil.historial_laboral.trabajos_anteriores,
      },
      negocio_propio: {
        tuvo_negocio: body.Perfil.negocio_propio.tuvo_negocio,
      },
      referencias: body.Perfil.referencias,
      validacion_tecnica_ia: {
        resumen_validacion: {
          nivel_certeza_oficio: body.Perfil.validacion_tecnica_ia.resumen_validacion?.nivel_certeza_oficio,
          puntuacion_global: body.Perfil.validacion_tecnica_ia.resumen_validacion?.puntuacion_global,
          resumen_ia: body.Perfil.validacion_tecnica_ia.resumen_validacion?.resumen_ia
        },
        evaluacion_detallada: body.Perfil.validacion_tecnica_ia.evaluacion_detallada
      }
    });

    console.info('[db] Perfil insertado en Mongo para', personaId);

    return NextResponse.json(
      {
        message: 'Perfil inicial guardado exitosamente',
        persona_id: personaId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error en API route:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  } finally {
    await mongoClient.close();
  }
}