import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MongoClient } from 'mongodb';
import { RegistroFormulario } from './RegistroFormulario';

// Clientes de base de datos
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const mongoUri = process.env.MONGODB_URI || '';
const mongoClient = new MongoClient(mongoUri);

export async function POST(req: NextRequest) {
  try {
    const body: RegistroFormulario = await req.json();

    // Validar campos requeridos
    if (!body.nombres || !body.apellidos || !body.telefono || !body.fecha_nacimiento) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios para el registro' },
        { status: 400 }
      );
    }

    // 1. Guardar en PostgreSQL (vía Supabase)
    const { data: persona, error: personaError } = await supabase
      .from('Persona')
      .insert({
        nombres: body.nombres,
        apellidos: body.apellidos,
        estado_cedula: body.estado_cedula,
        numero_cedula: ['vigente', 'vencida'].includes(body.estado_cedula) ? body.numero_cedula : null,
        fecha_nacimiento: body.fecha_nacimiento,
        telefono: body.telefono,
        pertenece_refugio: body.pertenece_refugio,
        refugio: body.refugio,
        direccion: body.direccion,
        estado_vivienda: body.estado_vivienda,
        nivel_estudio: body.nivel_estudio,
        disponibilidad: body.disponibilidad_laboral,
      })
      .select('id')
      .single();

    if (personaError || !persona) {
      console.error('Error insertando en PostgreSQL:', personaError);
      return NextResponse.json({ error: 'Error al guardar el registro en la base de datos' }, { status: 500 });
    }

    const personaId = persona.id; // UUID retornado de Postgres

    // 2. Guardar Certificados en PostgreSQL si existen
    if (body.certificados && body.certificados.length > 0) {
      const certificadosToInsert = body.certificados
        .filter((c: string) => c.trim() !== '')
        .map((nombre_curso: string) => ({
          persona_id: personaId,
          nombre_curso_certificado: nombre_curso.trim(),
        }));

      if (certificadosToInsert.length > 0) {
        const { error: certError } = await supabase
          .from('certificado')
          .insert(certificadosToInsert);

        if (certError) {
          console.error('Error insertando certificados:', certError);
        }
      }
    }

    // 3. Inicializar documento en MongoDB enlazado por persona_id
    await mongoClient.connect();
    const db = mongoClient.db(process.env.MONGODB_DB_NAME || 'Manito');
    const collection = db.collection('Perfil');

    await collection.insertOne({
      persona_id: personaId,
      oficio_principal: {
        nombre: '',
        tiempo_experiencia: '10 meses',
        tiene_herramientas: 'Las perdi',
      },
      oficios_secundarios: [],
      busqueda_laboral: 'empleo',
      historial_laboral: {
        trabajos_anteriores: [],
      },
      negocio_propio: {
        tuvo_negocio: false,
      },
      referencias: [],
      validacion_tecnica_ia: {
        preguntas_dinamicas_chat: [],
      }
    });

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