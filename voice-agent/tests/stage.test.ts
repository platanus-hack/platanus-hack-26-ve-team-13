import { describe, expect, it } from "vitest";
import { DISTRESS_REPLY, OFF_SCRIPT_REPLY, RETRY_PREFIX } from "@/lib/agent/lines";
import { initialState, runTurn, toFormPatch, type Extractor, type TurnState } from "@/lib/agent/stage";
import type { Extraction } from "@/lib/schema/extraction";

const empty: Extraction = {
  ack: "",
  name: null,
  lastNames: null,
  birthDate: null,
  idStatus: null,
  idNumber: null,
  phone: null,
  trade: null,
  noTrade: false,
  yearsBand: null,
  tools: null,
  confirmed: null,
  offScript: null,
  declined: [],
  evidenceNotes: [],
};

// Devuelve las extracciones en orden, como lo haría Claude
function scripted(...turns: Partial<Extraction>[]): Extractor {
  let i = 0;
  return async () => ({ ...empty, ...turns[i++] });
}

async function play(extract: Extractor, answers: string[], state: TurnState = initialState()) {
  const replies: string[] = [];
  let done = false;
  for (const answer of answers) {
    const r = await runTurn(state, answer, extract);
    state = r.state;
    done = r.done;
    replies.push(r.reply);
  }
  return { state, replies, done };
}

describe("toFormPatch", () => {
  it("normalizes formats and maps the trade to its id", () => {
    const patch = toFormPatch({
      ...empty,
      name: "José  Rodríguez",
      lastNames: "Rodríguez",
      birthDate: "3 de marzo de 1980",
      idStatus: "valid",
      idNumber: "V-15.234.876",
      phone: "0412-555-1234",
      trade: "Albañil",
      yearsBand: "gt10",
      tools: "lost",
    });
    expect(patch).toEqual({
      name: "José Rodríguez",
      lastNames: "Rodríguez",
      birthDate: "1980-03-03",
      idStatus: "valid",
      idNumber: "V-15234876",
      phone: "04125551234",
      trade: "masonry",
      yearsBand: "gt10",
      tools: "lost",
    });
  });

  it("drops what can't be normalized", () => {
    expect(toFormPatch({ ...empty, birthDate: "en el 80, en marzo", phone: "el de siempre" })).toEqual({});
  });

  it("keeps lastNames only together with name", () => {
    expect(toFormPatch({ ...empty, lastNames: "Rodríguez" })).toEqual({});
  });

  it("noTrade → trade null", () => {
    expect(toFormPatch({ ...empty, noTrade: true, trade: "algo" })).toEqual({ trade: null });
  });
});

describe("runTurn: demo script (PRD section 5)", () => {
  it("asks the scripted questions in order and fills the form", async () => {
    const extract = scripted(
      { ack: "Mucho gusto, José.", name: "José Rodríguez", birthDate: "3 de marzo de 1980" },
      { confirmed: true },
      { idStatus: "valid", idNumber: "V-15.234.876" },
      { confirmed: true },
      { ack: "Listo.", phone: "0412-555-1234" },
      { ack: "Perfecto.", confirmed: true },
      { ack: "Lo siento mucho.", trade: "albañil", yearsBand: "gt10", tools: "lost" },
      { evidenceNotes: ["describe los pasos en orden"] },
      {},
      { evidenceNotes: ["ofrece una referencia"] },
    );
    const { state, replies, done } = await play(extract, ["a1", "sí", "a2", "sí", "a3", "sí", "a4", "a5", "a6", "a7"]);

    expect(replies).toEqual([
      "Mucho gusto, José. Para confirmar: José Rodríguez, fecha de nacimiento 3 de marzo de 1980. ¿Está bien?",
      "¿Tienes cédula? Si la tienes, dime el número.",
      "Para confirmar: cédula V-15.234.876. ¿Está bien?",
      "¿A qué número te escribimos por WhatsApp?",
      "Listo. Para confirmar: teléfono 0412-555-1234. ¿Está bien?",
      "Perfecto. ¿A qué te dedicabas antes del terremoto, y desde hace cuánto?",
      "Lo siento mucho. Cuéntame paso a paso cómo frisas una pared.",
      "¿Y qué haces si la mezcla te queda muy aguada?",
      "¿Alguien puede dar fe de tu trabajo?",
      "¡Listo, José! Estoy armando tu perfil y te escribimos con los próximos pasos.",
    ]);
    expect(done).toBe(true);
    expect(state.stage).toBe("closing");
    expect(state.form).toMatchObject({
      name: "José Rodríguez",
      birthDate: "1980-03-03",
      idStatus: "valid",
      idNumber: "V-15234876",
      phone: "04125551234",
      trade: "masonry",
      yearsBand: "gt10",
      tools: "lost",
    });
    expect(state.unconfirmed).toEqual([]);
    expect(state.history).toHaveLength(21);
  });
});

describe("runTurn: stage logic", () => {
  it("stays in register until required fields are filled", async () => {
    const { state, replies } = await play(scripted({ name: "Ana Pérez" }), ["Ana Pérez"]);
    expect(state.stage).toBe("register");
    expect(replies[0]).toBe("¿Y cuándo naciste? Dime el día, el mes y el año.");
  });

  it("repeats an unclear answer once, then moves on without it", async () => {
    const { state, replies } = await play(
      scripted({ name: "Pedro Gómez" }, {}, {}),
      ["Pedro Gómez, en el 80, en marzo", "no me acuerdo", "Sí tengo cédula"],
    );
    expect(replies[0]).toBe("¿Y cuándo naciste? Dime el día, el mes y el año.");
    expect(replies[1]).toBe("Disculpa, no te entendí bien. ¿Y cuándo naciste? Dime el día, el mes y el año.");
    expect(replies[2]).toBe("Para confirmar: Pedro Gómez. ¿Está bien?");
    expect(state.form.birthDate).toBeUndefined();
    expect(state.skipped).toContain("birthDate");
  });

  it("repeating data we already have doesn't count as progress", async () => {
    const sameAnswer = { name: "Pedro Gómez", birthDate: "en el 80, en marzo" };
    const { state, replies } = await play(
      scripted(sameAnswer, sameAnswer, sameAnswer),
      ["Pedro Gómez, en el 80", "Pedro Gómez, en el 80", "Pedro Gómez, en el 80"],
    );
    expect(replies[1]).toMatch(/^Disculpa/);
    expect(replies[2]).toBe("Para confirmar: Pedro Gómez. ¿Está bien?");
    expect(state.skipped).toContain("birthDate");
  });

  it("a declined field doesn't block progress", async () => {
    const start = (await play(scripted({ name: "Ana", birthDate: "1 de enero de 1990" }, { confirmed: true }), ["x", "sí"])).state;
    const { state, replies } = await play(scripted({ declined: ["idStatus"] }), ["prefiero no decir"], start);
    expect(state.skipped).toContain("idStatus");
    expect(replies[0]).toBe("¿A qué número te escribimos por WhatsApp?");
  });

  it("no trade → closes without technical questions", async () => {
    const extract = scripted(
      { name: "Luis", birthDate: "1 de enero de 1990" },
      { confirmed: true },
      { idStatus: "valid" },
      { phone: "04125551234" },
      { confirmed: true },
      { noTrade: true },
    );
    const { state, replies, done } = await play(extract, ["a", "sí", "b", "c", "sí", "quiero aprender"]);
    expect(done).toBe(true);
    expect(state.form.trade).toBeNull();
    expect(replies.at(-1)).toMatch(/^¡Listo, Luis!/);
  });

  it("a failed extraction keeps the conversation going", async () => {
    const { state, replies } = await play(async () => null, ["José"]);
    expect(state.stage).toBe("register");
    expect(replies[0]).toBe("Disculpa, no te entendí bien. ¿Cómo te llamas y cuándo naciste?");
  });

  it("after closing, further turns repeat the closing line", async () => {
    const closed: TurnState = { ...initialState(), stage: "closing", form: { name: "Ana Pérez" } };
    const r = await runTurn(closed, "gracias", async () => {
      throw new Error("should not call Claude");
    });
    expect(r.done).toBe(true);
    expect(r.reply).toMatch(/^¡Listo, Ana!/);
  });
});

describe("runTurn: reading data back", () => {
  const named = { name: "José Rodríguez", birthDate: "3 de marzo de 1980" };

  it("the greeting says no person is available", () => {
    expect(initialState().history[0].text).toMatch(/no hay una persona disponible/);
  });

  it("a correction is read back again", async () => {
    const { state, replies } = await play(
      scripted(named, { birthDate: "1980-03-13", confirmed: false }, { confirmed: true }),
      ["a", "no, el 13", "sí"],
    );
    expect(replies[1]).toBe("Para confirmar: José Rodríguez, fecha de nacimiento 13 de marzo de 1980. ¿Está bien?");
    expect(replies[2]).toMatch(/cédula/);
    expect(state.form.birthDate).toBe("1980-03-13");
  });

  it("a plain no clears the data and asks again", async () => {
    const { state, replies } = await play(scripted(named, { confirmed: false }), ["a", "no"]);
    expect(replies[1]).toBe("Disculpa, no te entendí bien. ¿Cómo te llamas y cuándo naciste?");
    expect(state.form.name).toBeUndefined();
    expect(state.asking).toBe("nameBirth");
  });

  it("an unclear yes/no repeats the reading once", async () => {
    const { replies } = await play(scripted(named, {}), ["a", "eh"]);
    expect(replies[1]).toBe(
      "Disculpa, no te entendí bien. Para confirmar: José Rodríguez, fecha de nacimiento 3 de marzo de 1980. ¿Está bien?",
    );
  });

  it("after two rejections it moves on without the data", async () => {
    const { state, replies } = await play(
      scripted(named, { confirmed: false }, named, { confirmed: false }),
      ["a", "no", "a", "no"],
    );
    expect(replies[3]).toMatch(/cédula/);
    expect(state.form.name).toBeUndefined();
    expect(state.skipped).toEqual(expect.arrayContaining(["name", "birthDate"]));
  });

  it("a rejected cédula number asks only for the number", async () => {
    const start = (await play(scripted(named, { confirmed: true }), ["a", "sí"])).state;
    const { state, replies } = await play(
      scripted({ idStatus: "valid", idNumber: "15234876" }, { confirmed: false }, { idNumber: "15234867" }),
      ["a", "no", "15234867"],
      start,
    );
    expect(replies[1]).toBe("Disculpa, no te entendí bien. ¿Me repites el número de cédula?");
    expect(replies[2]).toBe("Para confirmar: cédula V-15.234.867. ¿Está bien?");
    expect(state.form.idStatus).toBe("valid");
  });
});

describe("runTurn: off-script answers", () => {
  const phoneQ = "¿A qué número te escribimos por WhatsApp?";

  // Estado en el que Manito acaba de preguntar el teléfono
  async function atPhone() {
    const extract = scripted(
      { name: "Ana Pérez", birthDate: "1 de enero de 1990" },
      { confirmed: true },
      { idStatus: "none" },
    );
    const { state, replies } = await play(extract, ["a", "sí", "no tengo"]);
    expect(replies.at(-1)).toContain(phoneQ);
    return state;
  }

  it("a question back gets the fixed line and the same question, without counting as a failure", async () => {
    const start = await atPhone();
    const { state, replies } = await play(scripted({ offScript: "question" }), ["¿para qué quieren mi número?"], start);
    expect(replies[0]).toBe(`${OFF_SCRIPT_REPLY} ${phoneQ}`);
    expect(replies[0]).not.toContain(RETRY_PREFIX);
    expect(state.askCounts.phone).toBe(start.askCounts.phone);
    expect(state.offScriptTurns).toBe(1);
    expect(state.needsHuman).toBe(false);
  });

  it("after two off-script turns, a third counts as an unanswered question", async () => {
    const start = await atPhone();
    const { state, replies } = await play(
      scripted({ offScript: "question" }, { offScript: "question" }, { offScript: "question" }),
      ["¿?", "¿?", "¿?"],
      start,
    );
    expect(replies[2]).toBe(`${OFF_SCRIPT_REPLY} ${phoneQ}`);
    expect(state.askCounts.phone).toBe((start.askCounts.phone ?? 0) + 1);
    expect(replies.join(" ")).not.toContain(RETRY_PREFIX);
  });

  it("distress gets the safety line and flags the person, always", async () => {
    const start = { ...(await atPhone()), offScriptTurns: 5 };
    const { state, replies } = await play(scripted({ offScript: "distress" }), ["mi hijo está herido"], start);
    expect(replies[0]).toBe(`${DISTRESS_REPLY} ${phoneQ}`);
    expect(state.needsHuman).toBe(true);
  });

  it("off-script plus data: the fixed line replaces the ack and the flow continues", async () => {
    const start = await atPhone();
    const { state, replies } = await play(
      scripted({ ack: "Listo.", offScript: "question", phone: "0412-555-1234" }),
      ["0412-555-1234, ¿para qué lo quieren?"],
      start,
    );
    expect(state.form.phone).toBe("04125551234");
    expect(replies[0].startsWith(OFF_SCRIPT_REPLY)).toBe(true);
    expect(replies[0]).not.toContain("Listo.");
  });
});
