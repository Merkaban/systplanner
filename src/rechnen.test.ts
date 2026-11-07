import { describe, expect, it } from 'vitest';
import { KATALOG } from './katalog';
import { ausKatalog, formatWahlblock, mitRegel, parseTage, parseWahlblock, regelFehler, regelTage } from './modell';
import type { Fortbildung, Katalogeintrag } from './modell';
import { auswertung, belegung, gewaehlteTage, vorschlaege, wasFehlt } from './rechnen';

const kat = (k: string) => KATALOG.find((e) => e.kuerzel === k)!;
const fb = (k: string | Katalogeintrag, status: Fortbildung['status'] = 'absolviert', option = 0) => {
  const f = ausKatalog(typeof k === 'string' ? kat(k) : k, status);
  f.wahl = f.wahl.map(() => ({ option, festgehalten: false }));
  return f;
};
const eigene = (fest: string, ...bloecke: string[]): Katalogeintrag => ({
  kuerzel: Math.random().toString(),
  name: 'Test',
  art: 'seminar',
  regel: { status: 'bestaetigt', fest: parseTage(fest), wahlbloecke: bloecke.map(parseWahlblock) },
});

describe('Textform', () => {
  it('liest und schreibt Wahlblöcke', () => {
    const b = parseWahlblock('M5 7 + M6 3 | m5 8 + 6 2');
    expect(b.optionen).toEqual([{ '5': 7, '6': 3 }, { '5': 8, '6': 2 }]);
    expect(formatWahlblock(b)).toBe('M5 7 + M6 3 | M5 8 + M6 2');
    expect(parseTage('M4a 2')).toEqual({ '4a': 2 });
  });
  it('meldet Unsinn', () => {
    expect(() => parseTage('M9 2')).toThrow();
    expect(regelFehler(eigene('', 'M7 2 | M8 1').regel)).toHaveLength(1);
  });
});

describe('Katalog', () => {
  it('Gesamttage stimmen und alle Regeln sind gültig', () => {
    const tage = Object.fromEntries(KATALOG.map((k) => [k.kuerzel, regelTage(k.regel)]));
    expect(tage).toMatchObject({ SyDe: 18, Orga: 9, SFT: 21, Hypno: 16, Trauma: 12, Konf: 11, BT: 12, SBS: 12, Einf: 2, GPA: 2 });
    for (const k of KATALOG) expect(regelFehler(k.regel)).toEqual([]);
  });
  it('SyDe: beide Optionen ergeben 18 Tage', () => {
    expect(gewaehlteTage(fb('SyDe', 'absolviert', 0))).toEqual({ '1': 3, '2': 2, '3': 2, '5': 7, '6': 3, '7': 1 });
    expect(gewaehlteTage(fb('SyDe', 'absolviert', 1))).toEqual({ '1': 3, '2': 2, '3': 2, '5': 8, '6': 2, '7': 1 });
  });
});

describe('4/4a-Regel', () => {
  it('4a zählt höchstens 8 Tage in Modul 4, der Rest ist Überbelegung', () => {
    const a = auswertung(belegung([fb('Orga'), fb('Konf'), fb(eigene('M4 10'))]), 'berater');
    expect(a.proModul['4a']).toEqual({ belegt: 10, bedarf: 8, angerechnet: 8, ueber: 2 });
    expect(a.proModul['4']).toEqual({ belegt: 18, bedarf: 16, angerechnet: 16, ueber: 2 });
  });
  it('ohne reines Modul 4 bleiben 8 Tage offen', () => {
    const a = auswertung(belegung([fb('Orga')]), 'berater');
    expect(a.proModul['4'].angerechnet).toBe(8);
  });
});

describe('Abschluss', () => {
  it('TherapeutIn braucht kein Modul 8, dort belegte Tage sind Überbelegung', () => {
    const a = auswertung(belegung([fb('Trauma')]), 'therapeut');
    expect(a.bedarf).toBe(90);
    expect(a.proModul['8']).toMatchObject({ angerechnet: 0, ueber: 4 });
    expect(auswertung(belegung([]), 'berater').bedarf).toBe(94);
  });
});

describe('Vorschläge', () => {
  it('Konf: TherapeutIn legt die 2 Wahltage auf M7', () => {
    const [best] = vorschlaege([fb('Konf')], 'therapeut');
    expect(best.belegung['7']).toBe(8);
    expect(best.belegung['8']).toBe(0);
  });
  it('Konf: ist M7 schon voll, gehen die Wahltage auf M8', () => {
    const [best] = vorschlaege([fb(eigene('M7 10')), fb('Konf')], 'berater');
    expect(best.belegung['8']).toBe(2);
  });
  it('Hypno: ist M2 voll, gehen 2 Tage auf M7', () => {
    const [best] = vorschlaege([fb(eigene('M2 2')), fb('Hypno')], 'berater');
    expect(best.belegung).toMatchObject({ '2': 16, '7': 2 });
  });
  it('SyDe: ist M6 schon teilweise belegt, wird M5 8 + M6 2 gewählt', () => {
    const [best] = vorschlaege([fb(eigene('M6 2')), fb('SyDe')], 'berater');
    expect(best.belegung).toMatchObject({ '5': 8, '6': 4 });
  });
  it('GPA: ist M1 voll, gehen die Tage auf M6', () => {
    const [best] = vorschlaege([fb(eigene('M1 22')), fb('GPA')], 'berater');
    expect(best.belegung).toMatchObject({ '1': 22, '6': 2, '4': 0 });
  });
  it('festgehaltene Optionen bleiben', () => {
    const konf = fb('Konf', 'absolviert', 1);
    konf.wahl[0].festgehalten = true;
    const v = vorschlaege([konf], 'therapeut');
    expect(v).toHaveLength(1);
    expect(v[0].wahl[konf.id]).toEqual([1]);
  });
  it('ausgeblendete und offene Fortbildungen zählen nicht', () => {
    const geplant = fb('SFT', 'geplant');
    geplant.ausgeblendet = true;
    const offen = fb('BT');
    offen.regel.status = 'offen';
    expect(vorschlaege([geplant, offen], 'berater')[0].angerechnet).toBe(0);
  });
  it('bei Gleichstand gewinnt die Verteilung, die absolvierte Tage nutzt', () => {
    // M1 und M7 voll, in M6 sind noch 2 Tage offen
    const basis = fb(eigene('M1 22 + M7 10 + M6 2'));
    const absolviert = fb(eigene('', 'M1 2 | M6 2'));
    const geplant = fb(eigene('', 'M6 2 | M7 2'), 'geplant');
    const [best] = vorschlaege([basis, absolviert, geplant], 'berater');
    expect(best.wahl[absolviert.id]).toEqual([1]);
  });
  it('liefert höchstens 5 verschiedene Verteilungen', () => {
    const v = vorschlaege([fb('GPA'), fb('SyDe'), fb('Hypno'), fb('Konf')], 'berater');
    expect(v.length).toBeLessThanOrEqual(5);
    expect(new Set(v.map((x) => JSON.stringify(x.belegung))).size).toBe(v.length);
    expect(v[0].angerechnet).toBeGreaterThanOrEqual(v[v.length - 1].angerechnet);
  });
});

describe('Was fehlt noch', () => {
  it('rechnet den Gewinn je Katalogeintrag und sortiert danach', () => {
    const liste = wasFehlt([fb('SyDe'), fb('Orga'), fb('Einf'), fb('GPA')], 'berater', KATALOG);
    expect(liste.map((l) => l.eintrag.kuerzel)).not.toContain('SyDe');
    expect(liste[0].gewinn).toBeGreaterThanOrEqual(liste[1].gewinn);
    // SFT: 21 Tage, aber M3 ist mit SyDe 2 + Orga 1 + 14 um 3 überbelegt
    expect(liste.find((l) => l.eintrag.kuerzel === 'SFT')!.gewinn).toBe(18);
  });
});

describe('Regel bearbeiten', () => {
  it('setzt nur geänderte Wahlblöcke zurück', () => {
    const f = fb(eigene('', 'M7 2 | M8 2', 'M1 1 | M6 1'), 'absolviert', 1);
    f.wahl[1].festgehalten = true;
    const neu = mitRegel(f, { ...f.regel, wahlbloecke: [parseWahlblock('M7 3 | M8 3'), f.regel.wahlbloecke[1]] });
    expect(neu.wahl).toEqual([{ option: 0, festgehalten: false }, { option: 1, festgehalten: true }]);
  });
});
