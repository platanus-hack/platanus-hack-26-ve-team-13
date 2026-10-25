'use client';

import { useState } from 'react';

export default function RegistroPerfilPage() {
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    estado_cedula: 'vigente',
    numero_cedula: '',
    fecha_nacimiento: '',
    telefono: '',
    pertenece_refugio: true,
    refugio: 'Ciudad Piar',
    direccion: '',
    estado_vivienda: 'refugio',
    nivel_estudio: '',
    certificadosInput: '',
    disponibilidad_laboral: 'completa',
  });

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    // Si el elemento no tiene name asignado, mostramos advertencia en consola (útil para depurar)
    if (!name) {
      console.warn('Advertencia: Un elemento del formulario no tiene el atributo "name".', e.target);
      return;
    }

    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({
        ...prev,
        [name]: checked, // Asigna un booleano (true/false)
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value, // Asigna string/número
      }));
    }
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje(null);

    // Separar los certificados ingresados por coma
    const listaCertificados = formData.certificadosInput
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const payload = {
      nombres: formData.nombres,
      apellidos: formData.apellidos,
      estado_cedula: formData.estado_cedula,
      numero_cedula: formData.numero_cedula,
      fecha_nacimiento: formData.fecha_nacimiento,
      telefono: formData.telefono,
      pertenece_refugio: formData.pertenece_refugio,
      refugio: formData.refugio,
      direccion: formData.direccion,
      estado_vivienda: formData.estado_vivienda,
      nivel_estudio: formData.nivel_estudio,
      certificados: listaCertificados,
      disponibilidad_laboral: formData.disponibilidad_laboral,
    };

    try {
      const res = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al enviar el formulario.');
      }

      setMensaje({
        tipo: 'exito',
        texto: `¡Perfil registrado con éxito! ID asignado: ${data.perfil_id}`,
      });
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-4">
          Registro de Perfil Personal
        </h1>

        {mensaje && (
          <div
            className={`p-4 mb-6 rounded-lg text-sm font-medium ${
              mensaje.tipo === 'exito' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECCIÓN 1: Quién eres */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-700">1. ¿Quién eres?</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombres</label>
                <input
                  type="text"
                  name="nombres"
                  required
                  value={formData.nombres}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Apellidos</label>
                <input
                  type="text"
                  name="apellidos"
                  required
                  value={formData.apellidos}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">¿Tienes cédula?</label>
                <select
                  name="estado_cedula"
                  value={formData.estado_cedula}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="vigente">Sí, vigente</option>
                  <option value="vencida">Sí, vencida</option>
                  <option value="perdida">La perdí</option>
                  <option value="no_tiene">No tengo</option>
                </select>
              </div>

              {['vigente', 'vencida'].includes(formData.estado_cedula) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Número de cédula</label>
                  <input
                    type="text"
                    name="numero_cedula"
                    required
                    value={formData.numero_cedula}
                    onChange={handleChange}
                    placeholder="V-12345678"
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de nacimiento</label>
              <input
                type="date"
                name="fecha_nacimiento"
                required
                value={formData.fecha_nacimiento}
                onChange={handleChange}
                className="w-full sm:w-1/2 rounded-lg border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </section>

          {/* SECCIÓN 2: Cómo te encontramos */}
          <section className="space-y-4 border-t pt-6">
            <h2 className="text-lg font-semibold text-slate-700">2. ¿Cómo te encontramos?</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Número de Teléfono</label>
              <input
                type="tel"
                name="telefono"
                required
                placeholder="+58 412 1234567"
                value={formData.telefono}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="checkbox"
                id="pertenece_refugio"
                name="pertenece_refugio"
                checked={formData.pertenece_refugio}
                onChange={handleChange}
                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="pertenece_refugio" className="text-sm font-medium text-slate-700">
                ¿Vives en un refugio?
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">¿En cual refugio?</label>
                <select
                  name="refugio"
                  value={formData.refugio}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Ciudad Piar">Ciudad Piar</option>
                  <option value="La Lucha">La Lucha</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">¿En qué estado está tu vivienda?</label>
              <select
                name="estado_vivienda"
                value={formData.estado_vivienda}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="refugio">Refugio</option>
                <option value="casa_propia_buen_estado">Casa propia en buen estado</option>
                <option value="casa_propia_damnificada">Casa propia dañada</option>
                <option value="alquilada_buen_estado">Alquilada en buen estado</option>
                <option value="alquilada_buen_damnificada">Alquilada dañada</option>
                <option value="casa_familiar_buen_estado">Casa de un familiar en buen estado</option>
                <option value="casa_familiar_damnificada">Casa de un familiar damnificada</option>
                <option value="sin_hogar">Sin hogar</option>
              </select>
            </div>
          </section>

          {/* SECCIÓN 3: Tu situación */}
          <section className="space-y-4 border-t pt-6">
            <h2 className="text-lg font-semibold text-slate-700">3. Tu situación</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">¿Hasta qué nivel estudiaste?</label>
              <select
                name="nivel_estudio"
                value={formData.nivel_estudio}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="sin_escolaridad">Sin escolaridad</option>
                <option value="primaria">Primaria</option>
                <option value="bachillerato">Bachillerato</option>
                <option value="tecnico_tsu">Técnico o TSU</option>
                <option value="universitario">Universitario</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cursos o certificados (separados por coma)
              </label>
              <input
                type="text"
                name="certificadosInput"
                placeholder="Ej. Curso de Plomería INCE, Electricidad Básica"
                value={formData.certificadosInput}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">¿Puedes trabajar fuera de La Guaira?</label>
              <select
                name="disponibilidad_laboral"
                value={formData.disponibilidad_laboral}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="completa">Completa</option>
                <option value="solo_local">Solo en La Guaira</option>
                <option value="depende_transporte">Depende del transporte</option>
              </select>
            </div>
          </section>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-slate-400"
          >
            {loading ? 'Guardando...' : 'Guardar y Continuar'}
          </button>
        </form>
      </div>
    </main>
  );
}