// Estado de la conversación y lógica de etapas: register → validate → closing.
// El código decide qué preguntar; Claude solo extrae datos y redacta el acuse.
import { z } from "zod";
import {
  DISTRESS_REPLY,
  GREETING,
  OFF_SCRIPT_REPLY,
  REGISTER_QUESTIONS,
  RETRY_PREFIX,
  closingLine,
  confirmLine,
} from "@/lib/agent/lines";
import { normalizeDate, normalizeIdNumber, normalizeName, normalizePhone } from "@/lib/agent/normalize";
import { buildQuestionPlan } from "@/lib/agent/plan";
import { findTrade } from "@/lib/agent/trades";
import { DeclinableField, type Extraction } from "@/lib/schema/extraction";
import { FormDraft } from "@/lib/schema/form";

//todas las preguntas pendientes de un grupo de registro, que no se hayan respondido ni negado
export const AskKey = z.enum(["nameBirth", "id", "phone", "trade", "confirm", "q18", "q19", "q22"]);
export type AskKey = z.infer<typeof AskKey>;

// Datos que Manito lee de vuelta antes de darlos por buenos
const ConfirmField = DeclinableField.extract(["name", "birthDate", "idNumber", "phone"]);
type ConfirmField = z.infer<typeof ConfirmField>;

//representa una línea de diálogo, y explica si el que habla es Manito o la otra persona
export const Line = z.object({
  speaker: z.enum(["manito", "persona"]),
  text: z.string(),
});
export type Line = z.infer<typeof Line>;

// Lo guarda el cliente y lo reenvía en cada turno; las rutas no guardan nada
export const TurnState = z.object({
  stage: z.enum(["register", "validate", "closing"]),
  form: FormDraft,
  skipped: z.array(DeclinableField),          // negados, o sin entender tras repetir la pregunta
  unconfirmed: z.array(ConfirmField),         // ya en el formulario, falta que la persona los confirme
  asking: AskKey.nullable(),                  // lo que preguntó la última frase de Manito
  askCounts: z.partialRecord(AskKey, z.number().int()),
  offScriptTurns: z.number().int().default(0),  // preguntas o comentarios fuera del guion
  needsHuman: z.boolean().default(false),       // mencionó peligro o una necesidad urgente
  history: z.array(Line),
});
export type TurnState = z.infer<typeof TurnState>;

export type TurnResult = {
  reply: string;
  formPatch: FormDraft;
  evidenceNotes: string[];
  state: TurnState;
  done: boolean;
};

// Extrae datos de la última respuesta; null si Claude falló (la conversación sigue)
export type Extractor = (input: { question: string; answer: string }) => Promise<Extraction | null>;

type RegisterGroup = "nameBirth" | "id" | "phone" | "trade";
const REGISTER_ORDER: RegisterGroup[] = ["nameBirth", "id", "phone", "trade"];
const VALIDATE_KEYS = { 18: "q18", 19: "q19", 22: "q22" } as const;
const MAX_ASKS = 2;
// Veces que Manito responde algo fuera del guion antes de seguir como si no hubiera respuesta
const MAX_OFF_SCRIPT = 2;
const CONFIRM_GROUP: Record<ConfirmField, RegisterGroup> = {
  name: "nameBirth",
  birthDate: "nameBirth",
  idNumber: "id",
  phone: "phone",
};

const isRegisterGroup = (k: AskKey | null): k is RegisterGroup =>
  REGISTER_ORDER.includes(k as RegisterGroup);

export function initialState(): TurnState {
  return {
    stage: "register",
    form: { intakeId: crypto.randomUUID() },
    skipped: [],
    unconfirmed: [],
    asking: "nameBirth",
    askCounts: { nameBirth: 1 },
    offScriptTurns: 0,
    needsHuman: false,
    history: [{ speaker: "manito", text: `${GREETING} ${REGISTER_QUESTIONS.nameBirth.all}` }],
  };
}

function requiredFields(group: RegisterGroup, form: FormDraft): DeclinableField[] {
  switch (group) {
    case "nameBirth":
      return ["name", "birthDate"];
    case "id":
      return ["idStatus"];
    case "phone":
      return ["phone"];
    case "trade":
      // Sin oficio no se preguntan los años
      return form.trade === null ? ["trade"] : ["trade", "yearsBand"];
  }
}

function missingFields(group: RegisterGroup, state: TurnState): DeclinableField[] {
  return requiredFields(group, state.form).filter(
    (f) => state.form[f] === undefined && !state.skipped.includes(f),
  );
}

function registerQuestion(group: RegisterGroup, missing: DeclinableField[]): string {
  const q: Record<string, string> = REGISTER_QUESTIONS[group];
  return missing.length === 1 && q[missing[0]] ? q[missing[0]] : q.all;
}

// La pregunta que corresponde a `key` en este estado, para repetirla tal cual
function questionFor(key: AskKey | null, state: TurnState): string {
  if (key === "confirm") {
    return confirmLine(Object.fromEntries(state.unconfirmed.map((f) => [f, state.form[f]])));
  }
  if (isRegisterGroup(key)) return registerQuestion(key, missingFields(key, state));
  return buildQuestionPlan(state.form).questions.find((q) => VALIDATE_KEYS[q.id] === key)?.text ?? "";
}

// Pasa la extracción por los normalizadores y el esquema; descarta lo inválido
export function toFormPatch(x: Extraction): FormDraft {
  const trade = x.trade?.trim();
  const raw: Record<string, unknown> = {
    name: x.name && normalizeName(x.name),
    birthDate: x.birthDate && normalizeDate(x.birthDate),
    idStatus: x.idStatus,
    idNumber: x.idNumber && normalizeIdNumber(x.idNumber),
    phone: x.phone && normalizePhone(x.phone),
    trade: x.noTrade ? null : trade ? (findTrade(trade)?.id ?? trade.toLowerCase()) : undefined,
    yearsBand: x.yearsBand,
    tools: x.tools,
  };
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const isNoTrade = key === "trade" && x.noTrade;
    if (value == null && !isNoTrade) continue;
    const field = FormDraft.shape[key as keyof typeof FormDraft.shape];
    if (field.safeParse(value).success) patch[key] = value;
  }
  return patch as FormDraft;
}

// funcion corre cada vez que la persona habla, y decide qué responder y qué preguntar a continuación
export async function runTurn(state: TurnState, userText: string, extract: Extractor): Promise<TurnResult> {
  if (state.stage === "closing") {
    return { reply: closingLine(state.form.name), formPatch: {}, evidenceNotes: [], state, done: true };
  }

  const lastLine = state.history.findLast((l) => l.speaker === "manito")?.text ?? "";
  const extraction = await extract({ question: lastLine, answer: userText });
  const formPatch = extraction ? toFormPatch(extraction) : {};

  // Fuera del guion: Manito responde con una frase fija, nunca improvisada
  const offScript = extraction?.offScript ?? null;
  const offScriptLine = offScript === "distress" ? DISTRESS_REPLY : offScript ? OFF_SCRIPT_REPLY : "";
  const gaveData = Object.keys(formPatch).length > 0 ||
    (extraction?.declined.length ?? 0) > 0 || extraction?.confirmed != null;

  // Sin datos nuevos: se repite la misma pregunta y no cuenta como respuesta fallida
  if (offScript && !gaveData && (offScript === "distress" || state.offScriptTurns < MAX_OFF_SCRIPT)) {
    const reply = `${offScriptLine} ${questionFor(state.asking, state)}`;
    const held: TurnState = {
      ...state,
      offScriptTurns: state.offScriptTurns + 1,
      needsHuman: state.needsHuman || offScript === "distress",
      history: [
        ...state.history,
        { speaker: "persona", text: userText },
        { speaker: "manito", text: reply },
      ],
    };
    return { reply, formPatch: {}, evidenceNotes: [], state: held, done: false };
  }

  const next: TurnState = {
    ...state,
    form: { ...state.form, ...formPatch },
    skipped: [...new Set([...state.skipped, ...(extraction?.declined ?? [])])],
    askCounts: { ...state.askCounts },
    offScriptTurns: state.offScriptTurns + (offScript ? 1 : 0),
    needsHuman: state.needsHuman || offScript === "distress",
    history: [...state.history, { speaker: "persona", text: userText }],
  };

  // Hubo avance si la respuesta llenó o negó un campo que faltaba en el grupo preguntado
  // (repetir un dato que ya teníamos no cuenta)
  const asked = state.asking;
  const progress = isRegisterGroup(asked) &&
    missingFields(asked, next).length < missingFields(asked, state).length;

  // Una pregunta sin avance se repite una sola vez; luego se sigue sin ese dato
  if (isRegisterGroup(asked) && !progress && (state.askCounts[asked] ?? 0) >= MAX_ASKS) {
    next.skipped = [...new Set([...next.skipped, ...missingFields(asked, next)])];
  }

  // Datos nuevos o corregidos en esta respuesta, que hay que leer de vuelta
  const toConfirm = ConfirmField.options.filter(
    (f) => formPatch[f] !== undefined && formPatch[f] !== state.form[f],
  );

  // Respuesta a "¿Está bien?": sí → quedan confirmados; corrige o no se entiende →
  // se vuelve a leer (una vez); no → se borran y se vuelve a preguntar
  let rejected: ConfirmField[] = [];
  const confirmCount = state.askCounts.confirm ?? 0;
  if (state.asking === "confirm") {
    if (toConfirm.length === 0 && extraction?.confirmed === true) {
      next.unconfirmed = [];
      delete next.askCounts.confirm;
    } else if ((toConfirm.length > 0 || extraction?.confirmed == null) && confirmCount < MAX_ASKS) {
      // se queda en unconfirmed y se lee otra vez
    } else {
      rejected = [...new Set([...state.unconfirmed, ...toConfirm])];
      for (const f of rejected) delete next.form[f];
      next.unconfirmed = [];
    }
  }
  if (rejected.length === 0) next.unconfirmed = [...new Set([...next.unconfirmed, ...toConfirm])];

  // Lo rechazado se pregunta otra vez; si ya se repitió, se sigue sin ese dato
  const retryGroup = confirmCount < MAX_ASKS
    ? REGISTER_ORDER.find(
        (g) => rejected.some((f) => CONFIRM_GROUP[f] === g) && (next.askCounts[g] ?? 0) < MAX_ASKS,
      )
    : undefined;
  if (rejected.length > 0 && !retryGroup) {
    next.skipped = [...new Set([...next.skipped, ...rejected])];
    delete next.askCounts.confirm;
  }

  let ack = extraction?.ack.trim() ?? "";
  let nextAsk: AskKey | null = null;
  let nextLine: string;

  const pending = next.stage === "register"
    ? REGISTER_ORDER.find((g) => missingFields(g, next).length > 0)
    : undefined;
  // Se confirma cuando el grupo de esos datos ya no tiene preguntas pendientes
  const confirmNow = next.unconfirmed.length > 0 &&
    !next.unconfirmed.some((f) => CONFIRM_GROUP[f] === pending);

  if (retryGroup) {
    nextAsk = retryGroup;
    next.askCounts[retryGroup] = (next.askCounts[retryGroup] ?? 0) + 1;
    ack = "";
    const again = rejected.filter((f) => CONFIRM_GROUP[f] === retryGroup);
    nextLine = `${RETRY_PREFIX} ${registerQuestion(retryGroup, again)}`;
  } else if (confirmNow) {
    nextAsk = "confirm";
    next.askCounts.confirm = (next.askCounts.confirm ?? 0) + 1;
    const data = Object.fromEntries(next.unconfirmed.map((f) => [f, next.form[f]]));
    nextLine = confirmLine(data);
    // Repetir porque no se entendió el sí o el no
    if (state.asking === "confirm" && toConfirm.length === 0) {
      ack = "";
      nextLine = `${RETRY_PREFIX} ${nextLine}`;
    }
  } else if (pending) {
    nextAsk = pending;
    // Si respondió una parte, la pregunta por el resto cuenta como nueva
    const count = pending === asked && progress ? 1 : (next.askCounts[pending] ?? 0) + 1;
    next.askCounts[pending] = count;
    nextLine = registerQuestion(pending, missingFields(pending, next));
    if (count > 1) {
      ack = "";
      nextLine = `${RETRY_PREFIX} ${nextLine}`;
    }
  } else {
    next.stage = "validate";
    // Se recalcula del formulario; si no hay oficio, el plan viene vacío
    const plan = buildQuestionPlan(next.form);
    const askedIdx = plan.questions.findIndex((q) => VALIDATE_KEYS[q.id] === asked);
    const nextQ = plan.questions[askedIdx + 1];
    if (nextQ) {
      nextAsk = VALIDATE_KEYS[nextQ.id];
      next.askCounts[nextAsk] = 1;
      nextLine = nextQ.text;
    } else {
      next.stage = "closing";
      ack = "";
      nextLine = closingLine(next.form.name);
    }
  }

  // Si además dijo algo fuera del guion, la frase fija reemplaza el acuse,
  // y no se dice "no te entendí" porque sí se entendió
  if (offScript) {
    ack = offScriptLine;
    if (nextLine.startsWith(RETRY_PREFIX)) nextLine = nextLine.slice(RETRY_PREFIX.length).trimStart();
  }

  const reply = [ack, nextLine].filter(Boolean).join(" ");
  next.asking = nextAsk;
  next.history.push({ speaker: "manito", text: reply });

  return {
    reply,
    formPatch,
    evidenceNotes: extraction?.evidenceNotes ?? [],
    state: next,
    done: next.stage === "closing",
  };
}
