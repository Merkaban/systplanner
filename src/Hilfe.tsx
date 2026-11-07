import { useEffect, useRef } from 'react';

// Begriffe wie in GLOSSARY.md; bei Änderungen dort auch hier nachziehen.
const BEGRIFFE: [string, string][] = [
  ['Ausbildung', 'Die 4-jährige SySt®-Ausbildung „Systemische/r BeraterIn bzw. TherapeutIn“, auf die Fortbildungen angerechnet werden.'],
  ['Abschluss', 'BeraterIn (Module 1–8, 94 Tage) oder TherapeutIn (Module 1–7, 90 Tage). Umschaltbar oben rechts.'],
  ['Modul', 'Ein thematischer Bereich der Ausbildung mit einem festen Bedarf an Tagen.'],
  ['Untermodul 4a', 'Teil von Modul 4. Tage auf 4a zählen zu Modul 4, aber höchstens 8.'],
  ['Bedarf', 'Wie viele Tage ein Modul für den gewählten Abschluss braucht.'],
  ['Überbelegung', 'Tage, die einem Modul über seinen Bedarf hinaus zugeteilt sind (bei 4a: über 8). Sie sind verschwendet.'],
  ['Fortbildung', 'Alles, was du erfasst und anrechnen lassen willst: eine Jahresausbildung oder ein Seminar.'],
  ['Jahresausbildung', 'Eine 1-jährige Fortbildung, z. B. SyDe, Orga, SFT.'],
  ['Seminar', 'Eine Fortbildung von wenigen Tagen, z. B. die Einführung in die Strukturaufstellungen.'],
  ['Fremdfortbildung', 'Eine Fortbildung eines anderen Instituts (Häkchen „extern“). Bis zu 40 Tage anrechenbar – das prüft der Planer noch nicht.'],
  ['Katalogeintrag', 'Eine Vorlage aus der offiziellen Übersicht. Beim Hinzufügen wird sie kopiert; du kannst die Kopie danach frei ändern.'],
  ['Anrechnungsregel', 'Welche Tage einer Fortbildung auf welche Module zählen: feste Tage plus Wahlblöcke.'],
  ['Feste Tage', 'Tage, die immer auf ein bestimmtes Modul zählen.'],
  ['Wahlblock', 'Eine Anzahl Tage, die komplett auf genau eine von mehreren Optionen zählt. Aufteilen ist nicht erlaubt.'],
  ['Option', 'Eine mögliche Aufteilung eines Wahlblocks, z. B. „M5 8 + M6 2“.'],
  ['Verteilung', 'Die gewählte Option für jeden Wahlblock aller eingeblendeten Fortbildungen.'],
  ['Angerechnete Tage', 'Belegte Tage über alle Module, je Modul höchstens bis zum Bedarf. Überbelegung zählt nicht.'],
  ['Verteilungsvorschlag', 'Eine vom Planer berechnete Verteilung mit möglichst vielen angerechneten Tagen.'],
  ['Festhalten', 'Eine gewählte Option so markieren, dass Vorschläge sie nicht ändern.'],
  ['Ausgeblendet', 'Eine geplante Fortbildung, die vorübergehend nicht mitzählt – für Was-wäre-wenn.'],
];

export function Hilfe({ schliessen }: { schliessen: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  return (
    <dialog ref={dialog} className="hilfe" onClose={schliessen} aria-labelledby="hilfe-titel">
      <form method="dialog" className="hilfe-zu">
        <button aria-label="Hilfe schließen">✕</button>
      </form>
      <h2 id="hilfe-titel">So funktioniert der Modulplaner</h2>
      <p>
        Der Planer zeigt, wie sich die Tage deiner absolvierten und geplanten Fortbildungen am besten auf die Module der
        Ausbildung verteilen lassen, und was dir noch fehlt.
      </p>

      <h3>Vorgehen</h3>
      <ol>
        <li><b>Abschluss wählen:</b> BeraterIn oder TherapeutIn (oben rechts).</li>
        <li><b>Fortbildungen erfassen:</b> „+ Fortbildung“ – aus dem Katalog oder als eigene Fortbildung. Eine früher exportierte Datei lädst du mit „Import“.</li>
        <li><b>Optionen wählen:</b> Bei Fortbildungen mit Wahlblöcken klickst du die gewünschte Option an. Mit „festhalten“ bleibt sie bei Vorschlägen unverändert.</li>
        <li><b>Vorschläge nutzen:</b> Unter „Verteilungsvorschläge“ stehen die besten Verteilungen; „Übernehmen“ setzt sie.</li>
        <li><b>Lücken ansehen:</b> „Was fehlt noch?“ zeigt offene Tage je Modul und welche Katalogeinträge wie viele Tage zusätzlich bringen.</li>
        <li><b>Was-wäre-wenn:</b> Geplante Fortbildungen über „eingeblendet“ an- und abschalten und vergleichen.</li>
        <li><b>Sichern:</b> Deine Daten liegen nur in diesem Browser. Mit „Export“ speicherst du sie als Datei – auch, um sie auf einem anderen Gerät zu importieren.</li>
      </ol>

      <h3>Status: absolviert oder geplant</h3>
      <dl>
        <dt>absolviert</dt><dd>Die Fortbildung ist abgeschlossen und zählt immer mit.</dd>
        <dt>geplant</dt><dd>Die Fortbildung hast du vor. Sie zählt mit, solange sie eingeblendet ist.</dd>
      </dl>
      <p className="leise">Ein Klick auf die Marke „absolviert“/„geplant“ in der Tabelle schaltet um.</p>

      <h3>Anrechnung: offen, vorläufig oder bestätigt</h3>
      <dl>
        <dt>offen</dt><dd>Die Anrechnung steht noch nicht fest. Die Fortbildung zählt 0 Tage. Beim Institut nachfragen und unter „Bearbeiten“ eintragen.</dd>
        <dt>vorläufig</dt><dd>Du hast eine Regel eingetragen, das Institut hat sie aber noch nicht bestätigt. Sie zählt mit, ist aber gelb markiert – deine Planung hängt davon ab.</dd>
        <dt>bestätigt</dt><dd>Die Regel stammt aus der offiziellen Übersicht oder wurde vom Institut bestätigt.</dd>
      </dl>

      <h3>Regeln eingeben</h3>
      <p>Tage schreibst du als <code>M1 3 + M2 2</code>, Untermodul 4a als <code>M4a 2</code>.</p>
      <ul>
        <li><b>Feste Tage:</b> eine Zeile, z. B. <code>M1 3 + M2 2 + M3 2 + M7 1</code></li>
        <li><b>Wahlblöcke:</b> eine Zeile je Wahlblock, Optionen mit <code>|</code> getrennt, z. B. <code>M5 7 + M6 3 | M5 8 + M6 2</code>. Alle Optionen eines Wahlblocks müssen gleich viele Tage haben.</li>
      </ul>

      <h3>Farben der Balken</h3>
      <ul>
        <li><span className="farbe voll" /> blau: noch offen</li>
        <li><span className="farbe erfuellt" /> grün: Bedarf erfüllt</li>
        <li><span className="farbe zuviel" /> rot schraffiert: überbelegt, diese Tage sind verschwendet</li>
      </ul>

      <h3>Begriffe</h3>
      <dl className="begriffe">
        {BEGRIFFE.map(([b, d]) => (
          <div key={b}><dt>{b}</dt><dd>{d}</dd></div>
        ))}
      </dl>
    </dialog>
  );
}
