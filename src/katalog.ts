import type { Katalogeintrag } from './modell';

// Quelle: syst.info/sites/default/files/2024/downloads/ab-module-2024_1.pdf (Stand 10/2023) und Kursseiten.
// Bei Widerspruch gilt die Kursseite.
export const KATALOG: Katalogeintrag[] = [
  {
    kuerzel: 'SyDe',
    name: 'Systemisches Denken auf der Basis der logischen Archetypen',
    art: 'jahresausbildung',
    regel: {
      status: 'bestaetigt',
      fest: { '1': 3, '2': 2, '3': 2, '7': 1 },
      wahlbloecke: [{ optionen: [{ '5': 7, '6': 3 }, { '5': 8, '6': 2 }] }],
    },
    notiz: 'PDF 10/2023 nennt M5 8 und M6 3; laut Kursseite 7–8 Tage M5 und 2–3 Tage M6.',
  },
  {
    kuerzel: 'Orga',
    name: 'Systemisch-syntaktische Organisationsberatung nach SySt®',
    art: 'jahresausbildung',
    regel: { status: 'bestaetigt', fest: { '3': 1, '4a': 8 }, wahlbloecke: [] },
    notiz: 'PDF 10/2023 nennt 18 Tage gesamt; laut Kursseite 9 anrechenbare Tage.',
  },
  {
    kuerzel: 'SFT',
    name: 'Das SySt®-Modell der Lösungsfokussierung – Basisausbildung',
    art: 'jahresausbildung',
    regel: { status: 'bestaetigt', fest: { '1': 5, '2': 2, '3': 14 }, wahlbloecke: [] },
  },
  {
    kuerzel: 'Hypno',
    name: 'Hypnotherapeutische Kommunikation',
    art: 'jahresausbildung',
    regel: { status: 'bestaetigt', fest: { '2': 14 }, wahlbloecke: [{ optionen: [{ '2': 2 }, { '7': 2 }] }] },
  },
  {
    kuerzel: 'Trauma',
    name: 'Lösungsfokussierte Krisenintervention / Psychotraumatologie',
    art: 'jahresausbildung',
    regel: { status: 'bestaetigt', fest: { '3': 2, '7': 6, '8': 4 }, wahlbloecke: [] },
  },
  {
    kuerzel: 'Konf',
    name: 'KonfliktLösungsEssentials nach SySt®',
    art: 'jahresausbildung',
    regel: { status: 'bestaetigt', fest: { '1': 1, '4a': 2, '7': 6 }, wahlbloecke: [{ optionen: [{ '7': 2 }, { '8': 2 }] }] },
    notiz: 'PDF 10/2023 nennt M7 „10 {8}“ (in sich widersprüchlich); laut Kursseite 6 Tage M7 fest + 2 Tage M7 oder M8.',
  },
  {
    kuerzel: 'BT',
    name: 'Business Training',
    art: 'jahresausbildung',
    regel: { status: 'bestaetigt', fest: { '1': 6, '4': 6 }, wahlbloecke: [] },
  },
  {
    kuerzel: 'SBS',
    name: 'SySt® Business Special',
    art: 'jahresausbildung',
    regel: { status: 'bestaetigt', fest: { '1': 6, '4': 6 }, wahlbloecke: [] },
  },
  {
    kuerzel: 'Einf',
    name: 'Einführung in die Systemischen Strukturaufstellungen',
    art: 'seminar',
    regel: { status: 'bestaetigt', fest: { '1': 2 }, wahlbloecke: [] },
  },
  {
    kuerzel: 'GPA',
    name: 'Strukturaufstellungen im Raum der Werte',
    art: 'seminar',
    regel: {
      status: 'vorlaeufig',
      fest: {},
      wahlbloecke: [{ optionen: [{ '1': 2 }, { '6': 2 }, { '1': 1, '4': 1 }, { '6': 1, '4': 1 }] }],
    },
    notiz: 'Originaltext: „2 Tage 1 oder 6 oder 1 Tag davon 4“. Lesart: beide Tage auf M1 oder M6, einer davon wahlweise auf M4. Beim Institut bestätigen lassen.',
  },
];
