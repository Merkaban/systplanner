import { useEffect, useMemo, useRef, useState } from 'react';
import { Hilfe } from './Hilfe';
import { KATALOG } from './katalog';
import {
  MODULE, MODULTITEL, ausKatalog, formatTage, formatWahlblock, mitRegel, parseTage, parseWahlblock, regelFehler, regelTage,
} from './modell';
import type { Anrechnungsregel, Anrechnungsstatus, Fortbildung, Katalogeintrag, Plan } from './modell';
import { auswertung, belegung, gewaehlteTage, vorschlaege, wasFehlt, zaehlt } from './rechnen';

const SPEICHER = 'systplanner.plan';
const LEER: Plan = { version: 1, abschluss: 'berater', fortbildungen: [] };
const ANRECHNUNG: Record<Anrechnungsstatus, string> = { offen: 'Anrechnung offen', vorlaeufig: 'vorläufig', bestaetigt: 'bestätigt' };

// Vertrauensgrenze: Import-Datei und localStorage können alles enthalten.
function alsPlan(x: unknown): Plan | null {
  const p = x as Plan;
  const tageOk = (t: unknown) => !!t && typeof t === 'object' && Object.entries(t).every(([m, n]) => (MODULE as readonly string[]).includes(m) && Number.isInteger(n) && (n as number) >= 0);
  const ok =
    p?.version === 1 &&
    (p.abschluss === 'berater' || p.abschluss === 'therapeut') &&
    Array.isArray(p.fortbildungen) &&
    p.fortbildungen.every(
      (f) =>
        typeof f?.id === 'string' && typeof f.name === 'string' && Array.isArray(f.wahl) &&
        tageOk(f.regel?.fest) && Array.isArray(f.regel.wahlbloecke) &&
        f.regel.wahlbloecke.every((b) => Array.isArray(b?.optionen) && b.optionen.every(tageOk)),
    );
  // mitRegel mit derselben Regel bringt die Wahl-Liste auf die richtige Länge
  return ok ? { ...p, fortbildungen: p.fortbildungen.map((f) => mitRegel(f, f.regel)) } : null;
}

function laden(): Plan {
  try {
    return alsPlan(JSON.parse(localStorage.getItem(SPEICHER) ?? 'null')) ?? LEER;
  } catch {
    return LEER;
  }
}

export default function App() {
  const [plan, setPlan] = useState<Plan>(laden);
  const [bearbeiten, setBearbeiten] = useState<Fortbildung | 'neu' | null>(null);
  const [hilfe, setHilfe] = useState(() => location.hash === '#hilfe');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(plan));
    } catch {
      /* privater Modus o. ä.: dann eben nur Export */
    }
  }, [plan]);

  const { abschluss, fortbildungen } = plan;
  const stand = useMemo(() => auswertung(belegung(fortbildungen), abschluss), [fortbildungen, abschluss]);
  const vorschlagListe = useMemo(() => vorschlaege(fortbildungen, abschluss), [fortbildungen, abschluss]);
  const luecken = useMemo(() => wasFehlt(fortbildungen, abschluss, KATALOG), [fortbildungen, abschluss]);
  const module = MODULE.filter((m) => m !== '8' || abschluss === 'berater' || stand.proModul['8'].belegt > 0);

  const setFortbildungen = (fn: (fs: Fortbildung[]) => Fortbildung[]) => setPlan((p) => ({ ...p, fortbildungen: fn(p.fortbildungen) }));
  const aendere = (id: string, fn: (f: Fortbildung) => Fortbildung) => setFortbildungen((fs) => fs.map((f) => (f.id === id ? fn(f) : f)));

  function exportieren() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' }));
    a.download = 'meine-seminare.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importieren(datei: File) {
    try {
      const p = alsPlan(JSON.parse(await datei.text()));
      if (!p) throw new Error();
      setPlan(p);
    } catch {
      alert('Die Datei ist kein gültiger Modulplan.');
    }
  }

  function uebernehmen(wahl: Record<string, number[]>) {
    setFortbildungen((fs) => fs.map((f) => (wahl[f.id] ? { ...f, wahl: f.wahl.map((w, i) => ({ ...w, option: wahl[f.id][i] })) } : f)));
  }

  const aktuellKey = formatTage(belegung(fortbildungen));

  return (
    <main>
      <header className="kopf">
        <div>
          <h1>SySt®-Modulplaner</h1>
          <p className="gesamt">
            <strong>{stand.angerechnet}</strong> / {stand.bedarf} Tage angerechnet
          </p>
        </div>
        <div className="aktionen">
          <div className="umschalter" role="radiogroup" aria-label="Abschluss">
            {(['berater', 'therapeut'] as const).map((a) => (
              <button key={a} role="radio" aria-checked={abschluss === a} onClick={() => setPlan((p) => ({ ...p, abschluss: a }))}>
                {a === 'berater' ? 'BeraterIn' : 'TherapeutIn'}
              </button>
            ))}
          </div>
          <button className="primaer" onClick={() => setBearbeiten('neu')}>+ Fortbildung</button>
          <button onClick={exportieren}>Export</button>
          <button onClick={() => importRef.current?.click()}>Import</button>
          <button onClick={() => setHilfe(true)}>Hilfe</button>
          <input ref={importRef} type="file" accept="application/json,.json" hidden
            onChange={(e) => { const d = e.target.files?.[0]; if (d) importieren(d); e.target.value = ''; }} />
        </div>
      </header>

      <section aria-label="Modul-Fortschritt" className="fortschritt">
        {module.map((m) => {
          const s = stand.proModul[m];
          const skala = Math.max(s.bedarf, s.belegt, 1);
          const klasse = s.ueber > 0 ? 'ueber' : s.angerechnet >= s.bedarf ? 'erfuellt' : 'offen';
          return (
            <div key={m} className={`modul ${klasse} ${m === '4a' ? 'unter' : ''}`}>
              <div className="modul-kopf">
                <span><b>M{m}</b> {MODULTITEL[m]}</span>
                <span className="zahl">
                  {s.belegt} / {m === '4a' ? `max. ${s.bedarf}` : s.bedarf}
                  {s.ueber > 0 && <em> · {s.ueber} überbelegt</em>}
                </span>
              </div>
              <div className="balken" role="img" aria-label={`${s.angerechnet} von ${s.bedarf} Tagen, ${s.ueber} überbelegt`}>
                <span className="teil voll" style={{ width: `${(100 * s.angerechnet) / skala}%` }} />
                <span className="teil zuviel" style={{ width: `${(100 * s.ueber) / skala}%` }} />
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <h2>Fortbildungen</h2>
        {fortbildungen.length === 0 ? (
          <p className="leer">Noch keine Fortbildungen. Füge welche hinzu oder importiere deine Datei. Wie es geht, steht unter „Hilfe“.</p>
        ) : (
          <div className="tabelle-rahmen">
            <table>
              <thead>
                <tr>
                  <th>Fortbildung</th>
                  {module.map((m) => <th key={m} className="zahl">M{m}</th>)}
                  <th className="zahl">Σ</th>
                </tr>
              </thead>
              <tbody>
                {fortbildungen.map((f) => {
                  const t = gewaehlteTage(f);
                  return (
                    <tr key={f.id} className={zaehlt(f) ? '' : 'gedimmt'}>
                      <td>
                        <Zeile f={f} aendere={(fn) => aendere(f.id, fn)} bearbeiten={() => setBearbeiten(f)}
                          loeschen={() => confirm(`„${f.name}“ löschen?`) && setFortbildungen((fs) => fs.filter((x) => x.id !== f.id))} />
                      </td>
                      {module.map((m) => <td key={m} className="zahl">{t[m] || ''}</td>)}
                      <td className="zahl"><b>{regelTage(f.regel)}</b></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="spalten">
        <section>
          <h2>Verteilungsvorschläge</h2>
          <ol className="vorschlaege">
            {vorschlagListe.map((v, i) => {
              const aktuell = formatTage(v.belegung) === aktuellKey;
              const aenderungen = fortbildungen.filter((f) => zaehlt(f) && v.wahl[f.id]?.some((o, j) => o !== f.wahl[j].option));
              return (
                <li key={i}>
                  <div>
                    <b>{v.angerechnet} Tage</b>
                    {aktuell ? <span className="marke">aktuell</span> : (
                      <ul>
                        {aenderungen.map((f) => (
                          <li key={f.id}>
                            {f.kuerzel || f.name}: {v.wahl[f.id].map((o, j) => formatTage(f.regel.wahlbloecke[j].optionen[o])).join(', ')}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {!aktuell && <button onClick={() => uebernehmen(v.wahl)}>Übernehmen</button>}
                </li>
              );
            })}
          </ol>
        </section>

        <section>
          <h2>Was fehlt noch?</h2>
          <p className="offen-liste">
            {module.filter((m) => m !== '4a' && stand.proModul[m].angerechnet < stand.proModul[m].bedarf).map((m) => (
              <span key={m} className="chip">M{m}: {stand.proModul[m].bedarf - stand.proModul[m].angerechnet} offen</span>
            ))}
          </p>
          <ul className="luecken">
            {luecken.map((l) => (
              <li key={l.eintrag.kuerzel}>
                <div>
                  <b>+{l.gewinn}</b> von {l.tage} Tagen · <span title={l.eintrag.name}>{l.eintrag.kuerzel}</span>
                  <small>{l.eintrag.name}</small>
                </div>
                <button onClick={() => setFortbildungen((fs) => [...fs, ausKatalog(l.eintrag, 'geplant')])}>Als geplant hinzufügen</button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {hilfe && <Hilfe schliessen={() => setHilfe(false)} />}
      {bearbeiten && (
        <Formular
          f={bearbeiten === 'neu' ? null : bearbeiten}
          schliessen={() => setBearbeiten(null)}
          speichern={(f) => {
            setFortbildungen((fs) => (fs.some((x) => x.id === f.id) ? fs.map((x) => (x.id === f.id ? f : x)) : [...fs, f]));
            setBearbeiten(null);
          }}
        />
      )}
    </main>
  );
}

function Zeile({ f, aendere, bearbeiten, loeschen }: {
  f: Fortbildung; aendere: (fn: (f: Fortbildung) => Fortbildung) => void; bearbeiten: () => void; loeschen: () => void;
}) {
  const setWahl = (i: number, w: Partial<Fortbildung['wahl'][number]>) =>
    aendere((x) => ({ ...x, wahl: x.wahl.map((alt, j) => (j === i ? { ...alt, ...w } : alt)) }));
  return (
    <div className="zeile">
      <div className="zeile-kopf">
        <b>{f.kuerzel && `${f.kuerzel} · `}{f.name}</b>
        <span className="zeile-aktionen">
          <button className="klein" onClick={bearbeiten}>Bearbeiten</button>
          <button className="klein" onClick={loeschen} aria-label={`${f.name} löschen`}>✕</button>
        </span>
      </div>
      <div className="marken">
        <button className="marke" onClick={() => aendere((x) => ({ ...x, status: x.status === 'absolviert' ? 'geplant' : 'absolviert' }))}
          title="Status umschalten">{f.status}</button>
        <span className="marke">{f.art === 'jahresausbildung' ? 'Jahresausbildung' : 'Seminar'}</span>
        {f.regel.status !== 'bestaetigt' && <span className={`marke ${f.regel.status}`}>{ANRECHNUNG[f.regel.status]}</span>}
        {f.extern && <span className="marke">extern</span>}
        {f.status === 'geplant' && (
          <label className="marke">
            <input type="checkbox" checked={!f.ausgeblendet} onChange={(e) => aendere((x) => ({ ...x, ausgeblendet: !e.target.checked }))} /> eingeblendet
          </label>
        )}
      </div>
      {f.regel.status === 'offen' && <p className="hinweis">Anrechnung noch offen – beim Institut nachfragen und unter „Bearbeiten“ eintragen.</p>}
      {f.regel.status !== 'offen' && f.regel.wahlbloecke.map((b, i) => (
        <div key={i} className="wahlblock" role="radiogroup" aria-label={`Wahlblock ${i + 1}`}>
          {b.optionen.map((o, j) => (
            <button key={j} role="radio" aria-checked={f.wahl[i].option === j} onClick={() => setWahl(i, { option: j })}>
              {formatTage(o)}
            </button>
          ))}
          <button className={`pin ${f.wahl[i].festgehalten ? 'an' : ''}`} aria-pressed={f.wahl[i].festgehalten}
            title="Festhalten: Vorschläge ändern diese Wahl nicht" onClick={() => setWahl(i, { festgehalten: !f.wahl[i].festgehalten })}>
            {f.wahl[i].festgehalten ? 'festgehalten' : 'festhalten'}
          </button>
        </div>
      ))}
      {f.notiz && <p className="notiz">{f.notiz}</p>}
    </div>
  );
}

function Formular({ f, schliessen, speichern }: { f: Fortbildung | null; schliessen: () => void; speichern: (f: Fortbildung) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [werte, setWerte] = useState(() => alsFormular(f));
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  const set = (w: Partial<typeof werte>) => setWerte((alt) => ({ ...alt, ...w }));
  let regel: Anrechnungsregel | null = null;
  let fehler: string[] = [];
  try {
    regel = {
      status: werte.anrechnung,
      fest: parseTage(werte.fest),
      wahlbloecke: werte.wahlbloecke.split('\n').filter((z) => z.trim()).map(parseWahlblock),
    };
    fehler = regelFehler(regel);
  } catch (e) {
    fehler = [(e as Error).message];
  }
  if (!werte.name.trim()) fehler.push('Name fehlt.');

  function absenden() {
    if (!regel || fehler.length) return;
    const basis = f ?? ausKatalog({ kuerzel: '', name: '', art: 'seminar', regel }, werte.status);
    speichern({
      ...mitRegel(basis, regel),
      name: werte.name.trim(), kuerzel: werte.kuerzel.trim(), art: werte.art, status: werte.status,
      extern: werte.extern, notiz: werte.notiz.trim() || undefined,
    });
  }

  return (
    <dialog ref={dialog} onClose={schliessen}>
      <form method="dialog" onSubmit={(e) => { e.preventDefault(); absenden(); }}>
        <h2>{f ? 'Fortbildung bearbeiten' : 'Fortbildung hinzufügen'}</h2>
        {!f && (
          <label>Aus dem Katalog
            <select defaultValue="" onChange={(e) => {
              const k = KATALOG.find((x) => x.kuerzel === e.target.value);
              if (k) setWerte({ ...alsFormular(ausKatalog(k, werte.status)), status: werte.status });
            }}>
              <option value="">– eigene Fortbildung –</option>
              {KATALOG.map((k) => <option key={k.kuerzel} value={k.kuerzel}>{k.kuerzel} · {k.name}</option>)}
            </select>
          </label>
        )}
        <div className="raster">
          <label>Name<input value={werte.name} onChange={(e) => set({ name: e.target.value })} required /></label>
          <label>Kürzel<input value={werte.kuerzel} onChange={(e) => set({ kuerzel: e.target.value })} /></label>
          <label>Art
            <select value={werte.art} onChange={(e) => set({ art: e.target.value as Katalogeintrag['art'] })}>
              <option value="jahresausbildung">Jahresausbildung</option>
              <option value="seminar">Seminar</option>
            </select>
          </label>
          <label>Status
            <select value={werte.status} onChange={(e) => set({ status: e.target.value as Fortbildung['status'] })}>
              <option value="absolviert">absolviert</option>
              <option value="geplant">geplant</option>
            </select>
          </label>
          <label>Anrechnung
            <select value={werte.anrechnung} onChange={(e) => set({ anrechnung: e.target.value as Anrechnungsstatus })}>
              <option value="offen">offen (zählt noch nicht)</option>
              <option value="vorlaeufig">vorläufig</option>
              <option value="bestaetigt">bestätigt</option>
            </select>
          </label>
          <label className="haken"><input type="checkbox" checked={werte.extern} onChange={(e) => set({ extern: e.target.checked })} /> extern (Fremdfortbildung)</label>
        </div>
        <label>Feste Tage
          <input value={werte.fest} onChange={(e) => set({ fest: e.target.value })} placeholder="M1 3 + M2 2 + M3 2" />
        </label>
        <label>Wahlblöcke <small>(eine Zeile je Wahlblock, Optionen mit „|“ trennen)</small>
          <textarea rows={3} value={werte.wahlbloecke} onChange={(e) => set({ wahlbloecke: e.target.value })} placeholder="M5 7 + M6 3 | M5 8 + M6 2" />
        </label>
        <label>Notiz<textarea rows={2} value={werte.notiz} onChange={(e) => set({ notiz: e.target.value })} /></label>
        <p className="vorschau">{regel && !fehler.length ? `${regelTage(regel)} anrechenbare Tage` : ''}</p>
        {fehler.length > 0 && <ul className="fehler">{fehler.map((x) => <li key={x}>{x}</li>)}</ul>}
        <div className="knoepfe">
          <button type="button" onClick={() => dialog.current?.close()}>Abbrechen</button>
          <button className="primaer" type="submit" disabled={fehler.length > 0}>Speichern</button>
        </div>
      </form>
    </dialog>
  );
}

function alsFormular(f: Fortbildung | null) {
  return {
    name: f?.name ?? '',
    kuerzel: f?.kuerzel ?? '',
    art: f?.art ?? ('seminar' as Katalogeintrag['art']),
    status: f?.status ?? ('geplant' as Fortbildung['status']),
    anrechnung: f?.regel.status ?? ('offen' as Anrechnungsstatus),
    extern: f?.extern ?? false,
    fest: f ? formatTage(f.regel.fest) : '',
    wahlbloecke: f ? f.regel.wahlbloecke.map(formatWahlblock).join('\n') : '',
    notiz: f?.notiz ?? '',
  };
}
