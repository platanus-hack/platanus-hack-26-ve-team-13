// Conversación con Manito en la terminal, escribiendo como la persona. Llama a Claude.
// Uso: npm run chat   ·   "/fin" termina antes y pide la evaluación
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { buildAssessment } from "@/lib/agent/assess";
import { ASSESS_MODEL, assessConversation, extractTurn } from "@/lib/agent/claude";
import { initialState, runTurn } from "@/lib/agent/stage";

async function main() {
  const rl = createInterface({ input: stdin, output: stdout, terminal: false });
  let state = initialState();
  console.log(`\nManito: ${state.history[0].text}`);
  stdout.write("\nTú: ");

  // Ctrl+D (fin de la entrada) también termina y pide la evaluación
  for await (const line of rl) {
    const text = line.trim();
    if (!text) { stdout.write("Tú: "); continue; }
    if (text === "/fin") break;

    const start = performance.now();
    const r = await runTurn(state, text, extractTurn);
    const ms = Math.round(performance.now() - start);
    state = r.state;

    console.log(`\nManito: ${r.reply}`);
    const patch = Object.entries(r.formPatch).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" ");
    console.log(`  · ${ms} ms${patch ? ` · formulario: ${patch}` : ""}${r.evidenceNotes.length ? ` · evidencia: ${r.evidenceNotes.join(", ")}` : ""}${state.needsHuman ? " · ⚠ needsHuman" : ""}`);
    if (r.done) break;
    stdout.write("\nTú: ");
  }
  rl.close();

  console.log("\nFormulario:", JSON.stringify(state.form, null, 2));
  console.log("\nEvaluando…");
  const modelAssessment = await assessConversation(state.form, state.history);
  const a = buildAssessment({
    form: state.form, history: state.history, modelAssessment, model: ASSESS_MODEL, needsHuman: state.needsHuman,
  });
  const s = a.scores;
  console.log(`\nPuntajes: especificidad ${s.specificity.score} · conocimiento ${s.knowledge.score} · coherencia ${s.coherence.score} · evidencia externa ${s.externalEvidence.score}`);
  console.log(`Confianza: ${a.trust} · Nivel: ${a.demonstratedLevel} (${a.levelVsYears}) · Ruta: ${a.route}${a.needsHuman ? " · ⚠ CONTACTAR YA" : ""}`);
  console.log(`Pendiente: ${a.pendingChecks.map((c) => `${c.kind}: ${c.detail}`).join(" · ") || "nada"}`);
  console.log(`Herramientas que necesita: ${a.toolsNeeded.join(", ") || "ninguna"}`);
  console.log(`Observaciones: ${a.observations.join(" ")}`);
  for (const [k, v] of Object.entries(s)) console.log(`  ${k} ${v.score}: ${v.reason}`);
}

main();
