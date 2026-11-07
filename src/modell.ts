// Begriffe siehe GLOSSARY.md, Modellentscheid siehe docs/adr/0001.

export const MODULE = ['1', '2', '3', '4', '4a', '5', '6', '7', '8'] as const;
export type ModulId = (typeof MODULE)[number];
export type Tage = Partial<Record<ModulId, number>>;
export type Abschluss = 'berater' | 'therapeut';

export const MODULTITEL: Record<ModulId, string> = {
  '1': 'Systemische Strukturaufstellungen',
  '2': 'Ericksonsche Hypnotherapie',
  '3': 'SySt®-Modell der Lösungsfokussierung',
  '4': 'Systemische Arbeit mit Organisationen & Supervision',
  '4a': 'SySt®-Methoden in der Organisationsberatung',
  '5': 'Theoretische Grundlagen systemischen Denkens',
  '6': 'Therapeutische Haltungen & spirituelle Grundlagen',
  '7': 'Methoden anderer systemischer Schulen',
  '8': 'Ergänzende Grundlagen',
};

/** Max. Tage aus 4a, die in Modul 4 zählen. */
export const MAX_4A = 8;

export function bedarf(m: ModulId, a: Abschluss): number {
  const b: Record<ModulId, number> = { '1': 22, '2': 16, '3': 14, '4': 16, '4a': 0, '5': 8, '6': 4, '7': 10, '8': 4 };
  return m === '8' && a === 'therapeut' ? 0 : b[m];
}

export interface Wahlblock {
  optionen: Tage[];
}

export type Anrechnungsstatus = 'offen' | 'vorlaeufig' | 'bestaetigt';

export interface Anrechnungsregel {
  status: Anrechnungsstatus;
  fest: Tage;
  wahlbloecke: Wahlblock[];
}

export interface Katalogeintrag {
  kuerzel: string;
  name: string;
  art: 'jahresausbildung' | 'seminar';
  regel: Anrechnungsregel;
  notiz?: string;
}

export interface Wahl {
  option: number;
  festgehalten: boolean;
}

export interface Fortbildung extends Katalogeintrag {
  id: string;
  status: 'absolviert' | 'geplant';
  extern: boolean;
  /** Wirkt nur bei status 'geplant'. */
  ausgeblendet: boolean;
  /** Je Wahlblock der Regel. */
  wahl: Wahl[];
}

export interface Plan {
  version: 1;
  abschluss: Abschluss;
  fortbildungen: Fortbildung[];
}

// --- Textform "M5 8 + M6 2" für Tage, "… | …" für Optionen eines Wahlblocks ---

export function formatTage(t: Tage): string {
  return MODULE.filter((m) => t[m]).map((m) => `M${m} ${t[m]}`).join(' + ');
}

export function parseTage(text: string): Tage {
  const t: Tage = {};
  for (const teil of text.split('+').map((s) => s.trim()).filter(Boolean)) {
    const m = /^M?(4a|[1-8])\s+(\d+)$/i.exec(teil);
    if (!m) throw new Error(`„${teil}“ verstehe ich nicht – erwartet z. B. „M5 8“.`);
    const id = m[1].toLowerCase() as ModulId;
    t[id] = (t[id] ?? 0) + Number(m[2]);
  }
  return t;
}

export const summe = (t: Tage) => Object.values(t).reduce((a, b) => a + (b ?? 0), 0);

export function formatWahlblock(b: Wahlblock): string {
  return b.optionen.map(formatTage).join(' | ');
}

export function parseWahlblock(text: string): Wahlblock {
  return { optionen: text.split('|').map((s) => parseTage(s)) };
}

export function regelTage(r: Anrechnungsregel): number {
  return summe(r.fest) + r.wahlbloecke.reduce((a, b) => a + summe(b.optionen[0] ?? {}), 0);
}

export function regelFehler(r: Anrechnungsregel): string[] {
  const fehler: string[] = [];
  r.wahlbloecke.forEach((b, i) => {
    const summen = b.optionen.map(summe);
    if (summen.some((s) => s === 0)) fehler.push(`Wahlblock ${i + 1}: leere Option.`);
    if (new Set(summen).size > 1) fehler.push(`Wahlblock ${i + 1}: Optionen haben unterschiedlich viele Tage (${summen.join(' / ')}).`);
  });
  return fehler;
}

export function ausKatalog(k: Katalogeintrag, status: Fortbildung['status']): Fortbildung {
  return {
    ...structuredClone(k),
    id: crypto.randomUUID(),
    status,
    extern: false,
    ausgeblendet: false,
    wahl: k.regel.wahlbloecke.map(() => ({ option: 0, festgehalten: false })),
  };
}

/** Neue Regel setzen; Wahl und Festhalten nur bei geänderten Wahlblöcken zurücksetzen. */
export function mitRegel(f: Fortbildung, regel: Anrechnungsregel): Fortbildung {
  const gleich = (i: number) => JSON.stringify(regel.wahlbloecke[i]) === JSON.stringify(f.regel.wahlbloecke[i]);
  return {
    ...f,
    regel,
    wahl: regel.wahlbloecke.map((_, i) => (gleich(i) && f.wahl[i] ? f.wahl[i] : { option: 0, festgehalten: false })),
  };
}
