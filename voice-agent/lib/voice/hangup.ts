// Efecto de colgar al terminar la conversación: un clic y tres tonos cortos, como al
// cortar una llamada. Se genera en el navegador (Web Audio), sin archivos de audio.

const TONE_HZ = 425;     // tono de ocupado usado en Venezuela y casi toda Latinoamérica
const TONE_S = 0.18;
const GAP_S = 0.16;
const TONES = 3;
const VOLUME = 0.12;

// Se resuelve cuando termina de sonar (o de inmediato si el navegador no tiene Web Audio)
export async function playHangUp(): Promise<void> {
  const Ctx = typeof window !== "undefined"
    ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    : undefined;
  if (!Ctx) return;
  const ctx = new Ctx();
  const t0 = ctx.currentTime + 0.05;

  // Clic del auricular: un golpe de ruido muy corto
  const click = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate);
  const data = click.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const clickSrc = ctx.createBufferSource();
  const clickGain = ctx.createGain();
  clickGain.gain.value = VOLUME * 2;
  clickSrc.buffer = click;
  clickSrc.connect(clickGain).connect(ctx.destination);
  clickSrc.start(t0);

  // Tonos con subida y bajada suave para que no chasqueen
  for (let i = 0; i < TONES; i++) {
    const start = t0 + 0.25 + i * (TONE_S + GAP_S);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = TONE_HZ;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(VOLUME, start + 0.01);
    gain.gain.setValueAtTime(VOLUME, start + TONE_S - 0.01);
    gain.gain.linearRampToValueAtTime(0, start + TONE_S);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + TONE_S);
  }

  const totalS = 0.3 + TONES * (TONE_S + GAP_S);
  await new Promise((r) => setTimeout(r, totalS * 1000));
  await ctx.close().catch(() => {});
}
