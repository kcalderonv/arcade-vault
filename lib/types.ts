export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type AccentColor = "cyan" | "magenta" | "green" | "yellow";

export interface Game {
  id: string; // slug, p. ej. "bloque-buster"
  title: string; // "BLOQUE BUSTER"
  short: string; // descripción corta (tarjeta)
  long: string; // descripción larga (detalle)
  cat: Category;
  cover: string; // clase CSS de la portada, p. ej. "cover-bricks"
  color: AccentColor; // color del botón JUGAR en la tarjeta
  best: number; // mejor puntuación global (mock)
  plays: string; // "12.4K" (mock, ya formateado)
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/2026"
}

export interface SessionUser {
  name: string; // MAYÚSCULAS, máx. 10 caracteres
}

// ---- Leaderboard real (SPEC 06) ----
export interface LeaderboardRow {
  id: number;
  player_name: string;
  score: number;
  created_at: string; // ISO 8601; se formatea a DD/MM/AAAA al mostrar
}

export type SubmitScoreResult = { ok: true } | { ok: false; error: string }; // mensaje en español, sin detalles internos

// ---- Home y Acerca de (SPEC 02) ----
export type NeonColor = "cyan" | "magenta" | "yellow" | "green";
export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";
export type HighlightIconKind = "HEART" | "BROWSER" | "PLANT";

export interface Feature {
  icon: FeatureIconKind;
  title: string; // "JUEGOS CLÁSICOS"
  desc: string;
  color: NeonColor;
}

export interface StatBlock {
  n: string; // "12+"
  u: string; // "JUEGOS"
  s: string; // "Y CONTANDO"
}

export interface RecentScore {
  player: string; // "NEONFOX"
  game: string; // título legible, p. ej. "Caída"
  score: number;
  ago: string; // "hace 2 min" (texto fijo)
  color: NeonColor;
}

export interface TopPlayer {
  rank: number;
  player: string;
  score: number;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Highlight {
  icon: HighlightIconKind;
  text: string;
  color: NeonColor;
}

export interface ContactPayload {
  name: string; // 1–60 caracteres tras trim
  email: string; // formato de correo, máx. 120
  msg: string; // 1–2000 caracteres tras trim
}

export type ContactFieldErrors = Partial<Record<keyof ContactPayload, string>>;

export type ContactActionState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | { status: "error"; message: string; fieldErrors?: ContactFieldErrors };

// ---- Biblioteca con datos reales (SPEC 08) ----
export interface LibraryGame extends Pick<Game, "id" | "title" | "cat" | "short" | "cover" | "color"> {
  best: number | null; // máximo de scores; null si no hay partidas guardadas
  playable: boolean; // true si hay motor registrado en lib/games/registry.ts
}
