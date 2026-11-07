import { bedarf, MAX_4A, MODULE, ausKatalog, formatTage, regelTage } from './modell';
import type { Abschluss, Fortbildung, Katalogeintrag, ModulId, Tage } from './modell';

/** Zählt die Fortbildung in Verteilung und Vorschlägen mit? */
export const zaehlt = (f: Fortbildung) =>
  !(f.status === 'geplant' && f.ausgeblendet) && f.regel.status !== 'offen';

/** Feste Tage plus gewählte Option je Wahlblock. */
export function gewaehlteTage(f: Fortbildung): Tage {
  const t: Tage = { ...f.regel.fest };
  f.regel.wahlbloecke.forEach((b, i) => {
    const opt = b.optionen[f.wahl[i]?.option ?? 0] ?? {};
    for (const m of MODULE) if (opt[m]) t[m] = (t[m] ?? 0) + opt[m];
  });
  return t;
}

export function belegung(fs: Fortbildung[]): Record<ModulId, number> {
  const b = Object.fromEntries(MODULE.map((m) => [m, 0])) as Record<ModulId, number>;
  for (const f of fs.filter(zaehlt)) {
    const t = gewaehlteTage(f);
    for (const m of MODULE) b[m] += t[m] ?? 0;
  }
  return b;
}

export interface Modulstand {
  belegt: number;
  bedarf: number;
  angerechnet: number;
  ueber: number;
}

/** Je Modul belegt/angerechnet/Überbelegung. Modul 4 enthält die angerechneten 4a-Tage (max. 8). */
export function auswertung(b: Record<ModulId, number>, a: Abschluss) {
  const proModul = {} as Record<ModulId, Modulstand>;
  for (const m of MODULE) {
    const soll = m === '4a' ? MAX_4A : bedarf(m, a);
    const belegt = m === '4' ? b['4'] + Math.min(b['4a'], MAX_4A) : b[m];
    proModul[m] = { belegt, bedarf: soll, angerechnet: Math.min(belegt, soll), ueber: Math.max(0, belegt - soll) };
  }
  const ohne4a = MODULE.filter((m) => m !== '4a');
  return {
    proModul,
    angerechnet: ohne4a.reduce((s, m) => s + proModul[m].angerechnet, 0),
    bedarf: ohne4a.reduce((s, m) => s + proModul[m].bedarf, 0),
  };
}

export interface Vorschlag {
  /** Fortbildungs-id → gewählte Option je Wahlblock. */
  wahl: Record<string, number[]>;
  angerechnet: number;
  belegung: Record<ModulId, number>;
}

/**
 * Probiert alle Optionskombinationen der nicht festgehaltenen Wahlblöcke durch.
 * Sortiert nach angerechneten Tagen, bei Gleichstand nach angerechneten Tagen nur aus absolvierten.
 */
export function vorschlaege(fs: Fortbildung[], a: Abschluss, anzahl = 5): Vorschlag[] {
  // ponytail: vollständige Aufzählung, reicht bis ~10⁵ Kombinationen; darüber Branch-and-Bound o. ä.
  const frei = fs.filter(zaehlt).flatMap((f) =>
    f.regel.wahlbloecke.map((b, i) => ({ f, i, n: b.optionen.length })).filter((s) => !f.wahl[s.i]?.festgehalten),
  );
  const ergebnisse: (Vorschlag & { absolviert: number })[] = [];
  const auswahl = frei.map(() => 0);
  for (;;) {
    const varianten = fs.map((f) => ({ ...f, wahl: f.wahl.map((w) => ({ ...w })) }));
    frei.forEach((s, k) => (varianten[fs.indexOf(s.f)].wahl[s.i] = { option: auswahl[k], festgehalten: false }));
    const bel = belegung(varianten);
    ergebnisse.push({
      wahl: Object.fromEntries(varianten.map((f) => [f.id, f.wahl.map((w) => w.option)])),
      angerechnet: auswertung(bel, a).angerechnet,
      absolviert: auswertung(belegung(varianten.filter((f) => f.status === 'absolviert')), a).angerechnet,
      belegung: bel,
    });
    // nächste Kombination (Zählwerk)
    let k = 0;
    while (k < frei.length && ++auswahl[k] === frei[k].n) auswahl[k++] = 0;
    if (k === frei.length) break;
  }
  ergebnisse.sort((x, y) => y.angerechnet - x.angerechnet || y.absolviert - x.absolviert);
  const gesehen = new Set<string>();
  return ergebnisse
    .filter((v) => {
      const key = formatTage(v.belegung);
      return !gesehen.has(key) && gesehen.add(key);
    })
    .slice(0, anzahl)
    .map(({ absolviert: _, ...v }) => v);
}

export interface Lueckenfueller {
  eintrag: Katalogeintrag;
  gewinn: number;
  tage: number;
}

/** Was bringt jeder noch nicht erfasste Katalogeintrag zusätzlich (beste Verteilung vorher vs. nachher)? */
export function wasFehlt(fs: Fortbildung[], a: Abschluss, katalog: Katalogeintrag[]): Lueckenfueller[] {
  const vorher = vorschlaege(fs, a, 1)[0].angerechnet;
  const vorhanden = new Set(fs.map((f) => f.kuerzel));
  return katalog
    .filter((k) => !vorhanden.has(k.kuerzel) && k.regel.status !== 'offen')
    .map((k) => ({
      eintrag: k,
      gewinn: vorschlaege([...fs, ausKatalog(k, 'geplant')], a, 1)[0].angerechnet - vorher,
      tage: regelTage(k.regel),
    }))
    .sort((x, y) => y.gewinn - x.gewinn || y.gewinn / y.tage - x.gewinn / x.tage);
}

