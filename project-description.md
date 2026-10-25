# Manito

**Plataforma de respuesta post-crisis: censo rápido y oportunidades reales.**

Manito es un asistente de voz que registra a las personas afectadas por una emergencia, valida su oficio conversando con ellas y las conecta con formación y trabajo a través de Impaktemos.

## El problema

Después de un desastre, como el terremoto de La Guaira, miles de personas pierden su casa, sus herramientas y su fuente de ingreso al mismo tiempo. Las organizaciones que quieren ayudarlas a volver a trabajar chocan con lo mismo:

- **El censo es lento.** Se hace con planillas en papel en refugios, persona por persona, y tarda semanas en llegar a una base de datos.
- **El oficio no se puede comprobar.** Mucha gente trabajó toda la vida sin título ni constancia. "Soy albañil" puede significar 20 años de obra o haber ayudado una vez.
- **No hay un siguiente paso claro.** Aunque se tenga el dato, nadie sabe a quién mandar a un empleo, a quién darle herramientas y a quién ofrecerle un curso.

## La solución

Una llamada de pocos minutos con Manito reemplaza la planilla y la entrevista de oficio.

1. **Censo por voz.** Manito pregunta nombre, fecha de nacimiento, cédula, teléfono, vivienda y disponibilidad. Lee de vuelta cada dato para que la persona lo confirme, porque al teléfono un número mal escuchado es un registro perdido.
2. **Validación del oficio.** No se queda con "soy albañil". Pide que le cuenten paso a paso un trabajo típico ("¿cómo frisas una pared?") y hace una repregunta según los años que declaró. Quien tiene el oficio responde con detalles concretos y el vocabulario de la obra; quien no, no.
3. **Evaluación con evidencia.** Al terminar, un modelo puntúa cuatro criterios de 0 a 3: especificidad, conocimiento práctico, coherencia y evidencia externa. Cada puntaje lleva una cita textual de lo que dijo la persona, para que un humano pueda revisarlo.
4. **Una ruta para cada persona.** El perfil sale con un siguiente paso concreto:

| Ruta | Qué significa |
|---|---|
| 🟢 Listo para matching | Enviar a búsqueda de empleo |
| 🟡 Listo con apoyo | Primero herramientas o documentos, luego empleo |
| 🔵 Formación | Ofrecer formación en un oficio |
| 🔴 Revisión humana | Las respuestas no cuadraron; una persona hace seguimiento. No es un rechazo |

Si en cualquier momento la persona menciona peligro o una necesidad urgente, el perfil queda marcado para contactarla de inmediato.

## Panel para Impaktemos

Cada registro aparece en vivo en un panel para el equipo de Impaktemos:

- Lista de personas registradas, de la más nueva a la más vieja, con su oficio, experiencia y ruta.
- Perfil completo con los datos del censo y la evaluación con citas.
- **Certificaciones sugeridas.** Según el oficio, el nivel que demostró y los trabajos anteriores, el panel propone qué certificaciones de Impaktemos ofrecerle.
- **Enviar a compañía privada.** Un botón para mandar el perfil a empresas que buscan personal.

## Principios

1. **Habla como la gente.** Todo es en español venezolano, por voz y sin formularios. Funciona para quien no sabe leer bien o no tiene smartphone.
2. **Nunca descarta a nadie.** Una conversación que no cuadra va a revisión humana, no al rechazo. Quien no tiene oficio va a formación.
3. **Cada juicio tiene evidencia.** Ningún puntaje alto sin una cita de lo que dijo la persona.
4. **El código manda, el modelo ayuda.** El orden de las preguntas lo decide el código, no el modelo. El LLM solo extrae datos y evalúa, así la conversación es predecible y auditable.

## Cómo está hecho

| Componente | Stack |
|---|---|
| App y panel | Next.js 16, React 19, Tailwind |
| Conversación | Claude Haiku 5.5 extrae los datos de cada respuesta en tiempo real |
| Evaluación | Claude Sonnet 5.5 puntúa el oficio con citas textuales |
| Voz | ElevenLabs Scribe v2 (voz a texto en tiempo real) y Flash v2.5 (texto a voz) |
| Datos | Supabase Postgres (datos de la persona) y MongoDB (perfil y evaluación) |
| Validación | Esquemas Zod y tests con Vitest |

El banco de oficios incluye albañil, electricista, carpintero, costurera, recepcionista y programador, cada uno con sus pasos esperados, vocabulario y herramientas, que se usan como referencia al evaluar.

## Track

🚨 Emergencies

## Equipo

- Ana Julia Figueredo ([@ajotas94impaktemos](https://github.com/ajotas94impaktemos))
- Miguel La Corte ([@miguellacorte](https://github.com/miguellacorte))
- Oliver Garcia ([@ogsieiro](https://github.com/ogsieiro))
