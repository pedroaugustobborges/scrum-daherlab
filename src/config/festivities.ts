// ============================================================
// FESTIVITY CONFIG
//
// The badge auto-switches to the nearest upcoming event
// within 30 days. No manual change needed.
//
// To FORCE a specific festivity (for testing/preview):
//   Set FESTIVITY_OVERRIDE to any exported Festivity object.
// To DISABLE the badge entirely:
//   Set FESTIVITY_OVERRIDE to false.
// To use AUTO mode (recommended):
//   Set FESTIVITY_OVERRIDE to null.
// ============================================================

export type AnimationType = "bounce" | "fall";

export interface Festivity {
  id: string;
  name: string;
  /** Emoji shown as badge when no badgeImage is provided */
  badgeEmoji: string;
  /** Optional image path (e.g. '/festivity/flag-br.svg') — takes priority over emoji */
  badgeImage?: string;
  /** Particle emoji inside the modal animation */
  animationEmoji: string;
  /** Countdown target */
  targetDate: Date;
  /** Text inside the countdown pill, e.g. "para a Copa do Mundo" */
  countdownSuffix: string;
  /** Ada's message — receives computed days-left */
  adaMessage: (daysLeft: number) => string;
  gradientStart: string;
  gradientEnd: string;
  /** Shown next to "Ada" in the modal header */
  adaExpression: string;
  animationType: AnimationType;
}

// ----------------------------------------------------------
// Copa do Mundo 2026 — 11 jun 2026
// ----------------------------------------------------------
const WORLD_CUP_2026: Festivity = {
  id: "world-cup-2026",
  name: "Copa do Mundo 2026",
  badgeEmoji: "🏆",
  badgeImage: "/festivity/flag-br.svg",
  animationEmoji: "⚽",
  targetDate: new Date(2026, 5, 11),
  countdownSuffix: "para a Copa do Mundo",
  adaMessage: (d) =>
    d > 0
      ? `Faltam ${d} dia${d !== 1 ? "s" : ""} para a Copa do Mundo. Este ano o hexa vem! 🏆⚽🇧🇷`
      : "A Copa do Mundo começou! Bora torcer pelo Brasil! 🇧🇷⚽🏆",
  gradientStart: "#009C3B",
  gradientEnd: "#FFDF00",
  adaExpression: "⚽",
  animationType: "bounce",
};

// ----------------------------------------------------------
// Jogos do Brasil — Copa do Mundo 2026
// ----------------------------------------------------------
const BRASIL_X_MARROCOS: Festivity = {
  id: "brasil-marrocos-2026",
  name: "Brasil x Marrocos · Copa 2026",
  badgeEmoji: "⚽",
  badgeImage: "/festivity/flag-br.svg",
  animationEmoji: "⚽",
  targetDate: new Date(2026, 5, 13), // Jun 13
  countdownSuffix: "para Brasil x Marrocos",
  adaMessage: (d) =>
    d > 0
      ? `Faltam ${d} dia${d !== 1 ? "s" : ""} para Brasil x Marrocos! Aquece o coração porque o hexa começa aqui! 🇧🇷⚽🟢`
      : "Hoje é dia de jogo! Brasil x Marrocos! Vai, Brasil! 🇧🇷⚽🔥",
  gradientStart: "#009C3B",
  gradientEnd: "#FFDF00",
  adaExpression: "⚽",
  animationType: "bounce",
};

const BRASIL_X_HAITI: Festivity = {
  id: "brasil-haiti-2026",
  name: "Brasil x Haiti · Copa 2026",
  badgeEmoji: "⚽",
  badgeImage: "/festivity/flag-br.svg",
  animationEmoji: "⚽",
  targetDate: new Date(2026, 5, 19), // Jun 19
  countdownSuffix: "para Brasil x Haiti",
  adaMessage: (d) =>
    d > 0
      ? `Faltam ${d} dia${d !== 1 ? "s" : ""} para Brasil x Haiti! Respeito total ao adversário, mas o hexa é nosso! 🇧🇷⚽💛`
      : "Hoje é dia de jogo! Brasil x Haiti! Confia no Scratch! 🇧🇷⚽",
  gradientStart: "#009C3B",
  gradientEnd: "#FFDF00",
  adaExpression: "⚽",
  animationType: "bounce",
};

const BRASIL_X_ESCOCIA: Festivity = {
  id: "brasil-escocia-2026",
  name: "Brasil x Escócia · Copa 2026",
  badgeEmoji: "⚽",
  badgeImage: "/festivity/flag-br.svg",
  animationEmoji: "⚽",
  targetDate: new Date(2026, 5, 24), // Jun 24
  countdownSuffix: "para Brasil x Escócia",
  adaMessage: (d) =>
    d > 0
      ? `Faltam ${d} dia${d !== 1 ? "s" : ""} para Brasil x Escócia! Última da fase de grupos — vamos fechar com chave de ouro! 🇧🇷⚽🏅`
      : "Hoje é dia de jogo! Brasil x Escócia! Vai com tudo, Canarinho! 🇧🇷⚽🔥",
  gradientStart: "#009C3B",
  gradientEnd: "#FFDF00",
  adaExpression: "⚽",
  animationType: "bounce",
};

// ----------------------------------------------------------
// Festa Junina 2026 — 24 jun 2026
// (skipped in 2026 — World Cup / jogos overlap)
// ----------------------------------------------------------
const FESTA_JUNINA_2026: Festivity = {
  id: "festa-junina-2026",
  name: "Festa Junina 2026",
  badgeEmoji: "🎪",
  animationEmoji: "⭐",
  targetDate: new Date(2026, 5, 24),
  countdownSuffix: "para a Festa de São João",
  adaMessage: (d) =>
    d > 0
      ? `Faltam ${d} dia${d !== 1 ? "s" : ""} para a Festa de São João! Vambora dançar forró e comer canjica! 🎪🌽💃`
      : "Arriba! A Festa Junina chegou! Bora festejar! 🎪🌽💃",
  gradientStart: "#C2410C",
  gradientEnd: "#FACC15",
  adaExpression: "🌽",
  animationType: "bounce",
};

// ----------------------------------------------------------
// Dia da Independência 2026 — 7 set 2026
// ----------------------------------------------------------
const INDEPENDENCIA_2026: Festivity = {
  id: "independencia-2026",
  name: "Independência do Brasil",
  badgeEmoji: "🌟",
  badgeImage: "/festivity/flag-br.svg",
  animationEmoji: "🌟",
  targetDate: new Date(2026, 8, 7),
  countdownSuffix: "para o 7 de Setembro",
  adaMessage: (d) =>
    d > 0
      ? `Faltam ${d} dia${d !== 1 ? "s" : ""} para o Dia da Independência! Independência ou morte — mas com as tarefas entregues! 🇧🇷🌟`
      : "Feliz 7 de Setembro! Viva o Brasil! 🇧🇷🌟",
  gradientStart: "#15803D",
  gradientEnd: "#CA8A04",
  adaExpression: "🇧🇷",
  animationType: "fall",
};

// ----------------------------------------------------------
// Dia da Consciência Negra 2026 — 20 nov 2026
// ----------------------------------------------------------
const CONSCIENCIA_NEGRA_2026: Festivity = {
  id: "consciencia-negra-2026",
  name: "Dia da Consciência Negra",
  badgeEmoji: "✊",
  animationEmoji: "⭐",
  targetDate: new Date(2026, 10, 20),
  countdownSuffix: "para o Dia da Consciência Negra",
  adaMessage: (d) =>
    d > 0
      ? `Faltam ${d} dia${d !== 1 ? "s" : ""} para o Dia da Consciência Negra. Um dia para lembrar, celebrar e lutar por igualdade. ✊🌍`
      : "Feliz Dia da Consciência Negra! Celebremos a cultura e a resistência! ✊🌍",
  gradientStart: "#1C1917",
  gradientEnd: "#16A34A",
  adaExpression: "✊",
  animationType: "fall",
};

// ----------------------------------------------------------
// Natal 2026 — 25 dez 2026
// ----------------------------------------------------------
const CHRISTMAS_2026: Festivity = {
  id: "christmas-2026",
  name: "Natal 2026",
  badgeEmoji: "🎅",
  animationEmoji: "❄️",
  targetDate: new Date(2026, 11, 25),
  countdownSuffix: "para o Natal",
  adaMessage: (d) =>
    d > 0
      ? `Faltam ${d} dia${d !== 1 ? "s" : ""} para o Natal! Que essa época traga paz, alegria e projetos entregues no prazo! 🎄✨`
      : "Feliz Natal! Que esse seja um período de muito descanso e alegria merecidos! 🎄🎁✨",
  gradientStart: "#165B33",
  gradientEnd: "#BB2528",
  adaExpression: "🎄",
  animationType: "fall",
};

// ----------------------------------------------------------
// Ano Novo 2027 — 1 jan 2027
// ----------------------------------------------------------
const NEW_YEAR_2027: Festivity = {
  id: "new-year-2027",
  name: "Ano Novo 2027",
  badgeEmoji: "🎆",
  animationEmoji: "✨",
  targetDate: new Date(2027, 0, 1),
  countdownSuffix: "para o Ano Novo",
  adaMessage: (d) =>
    d > 0
      ? `Faltam ${d} dia${d !== 1 ? "s" : ""} para o Ano Novo! Que 2027 traga projetos incríveis e muito sucesso! 🥂🎊`
      : "Feliz Ano Novo! Que 2027 seja um ano extraordinário para você e seu time! 🎆🥂",
  gradientStart: "#1E1B4B",
  gradientEnd: "#E94560",
  adaExpression: "🎊",
  animationType: "fall",
};

// ----------------------------------------------------------
// Carnaval 2027 — 9 fev 2027 (Terça-feira Gorda)
// ----------------------------------------------------------
const CARNAVAL_2027: Festivity = {
  id: "carnaval-2027",
  name: "Carnaval 2027",
  badgeEmoji: "🎭",
  animationEmoji: "🎊",
  targetDate: new Date(2027, 1, 9),
  countdownSuffix: "para o Carnaval",
  adaMessage: (d) =>
    d > 0
      ? `Faltam ${d} dia${d !== 1 ? "s" : ""} para o Carnaval! Vai encarar o bloco ou ficar aqui entregando tarefas? 😂🎭🥁`
      : "É Carnaval! O expediente pode esperar... ou não! 😂🎭🥁",
  gradientStart: "#7C3AED",
  gradientEnd: "#F59E0B",
  adaExpression: "🥁",
  animationType: "bounce",
};

// ----------------------------------------------------------
// Páscoa 2027 — 28 mar 2027
// ----------------------------------------------------------
const PASCOA_2027: Festivity = {
  id: "pascoa-2027",
  name: "Páscoa 2027",
  badgeEmoji: "🐣",
  animationEmoji: "🐣",
  targetDate: new Date(2027, 2, 28),
  countdownSuffix: "para a Páscoa",
  adaMessage: (d) =>
    d > 0
      ? `Faltam ${d} dia${d !== 1 ? "s" : ""} para a Páscoa! Que tal concluir suas tarefas antes de ir caçar ovos de chocolate? 🐣🍫`
      : "Feliz Páscoa! Mereceu cada ovo de chocolate! 🐣🍫✨",
  gradientStart: "#B45309",
  gradientEnd: "#A855F7",
  adaExpression: "🍫",
  animationType: "bounce",
};

// ----------------------------------------------------------
// Calendar — all festivities per year
// Add new years here as needed.
// ----------------------------------------------------------
function getFestivitiesForYear(year: number): Festivity[] {
  if (year === 2026) {
    return [
      WORLD_CUP_2026,
      BRASIL_X_MARROCOS,
      BRASIL_X_HAITI,
      BRASIL_X_ESCOCIA,
      // FESTA_JUNINA_2026 intentionally excluded in 2026 (World Cup overlap)
      INDEPENDENCIA_2026,
      CONSCIENCIA_NEGRA_2026,
      CHRISTMAS_2026,
      NEW_YEAR_2027, // visible in late Dec 2026
    ];
  }
  if (year === 2027) {
    return [
      NEW_YEAR_2027,
      CARNAVAL_2027,
      PASCOA_2027,
      // Add more 2027 festivities here
    ];
  }
  return [];
}

// ----------------------------------------------------------
// Auto-selection logic
// Returns the nearest festivity whose target date is
// between today and the next 30 days (inclusive).
// If two events are within 30 days, the closest one wins.
// ----------------------------------------------------------
export function getActiveFestivity(): Festivity | null {
  // Manual override — set to a Festivity to force it, or to false to disable
  const override = FESTIVITY_OVERRIDE;
  if (override === false) return null;
  if (override !== null) return override;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();

  // Gather this year's list + next year's in case we're near a Dec/Jan boundary
  const candidates = [
    ...getFestivitiesForYear(year),
    ...getFestivitiesForYear(year + 1),
  ];

  const upcoming = candidates
    .map((f) => {
      const target = new Date(f.targetDate);
      target.setHours(0, 0, 0, 0);
      const diffDays = Math.round(
        (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      return { festivity: f, diffDays };
    })
    .filter(({ diffDays }) => diffDays >= 0 && diffDays <= 30)
    .sort((a, b) => a.diffDays - b.diffDays);

  return upcoming[0]?.festivity ?? null;
}

// ============================================================
// ▼▼▼  OVERRIDE — change only when needed  ▼▼▼
//
//   null          → auto-select (recommended)
//   false         → disable badge entirely
//   WORLD_CUP_2026 → force a specific festivity (for testing)
// ============================================================
export const FESTIVITY_OVERRIDE: Festivity | null | false = null;

// Named exports for easy reference / override usage:
export {
  WORLD_CUP_2026,
  BRASIL_X_MARROCOS,
  BRASIL_X_HAITI,
  BRASIL_X_ESCOCIA,
  FESTA_JUNINA_2026,
  INDEPENDENCIA_2026,
  CONSCIENCIA_NEGRA_2026,
  CHRISTMAS_2026,
  NEW_YEAR_2027,
  CARNAVAL_2027,
  PASCOA_2027,
};
