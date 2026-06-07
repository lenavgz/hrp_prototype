# Technische Implementierung des LLM-Exhibition Prototyps

## 1. Systemarchitektur

Der Prototyp folgt einer klassischen Client-Server-Architektur mit einer klaren Separation of Concerns. Das System besteht aus drei Hauptschichten:

**Frontend (React):** Die Benutzeroberfläche, implementiert in React, bietet eine intuitive Kontrolloberfläche für die Hardware-Abstraktionen des LLM-Systems. Sie verwaltet den lokalen Zustand und kommuniziert asynchron mit dem Backend über REST-APIs.

**Backend (Flask/Python):** Der Backend-Server verarbeitet die vom Frontend gesendeten Konfigurationen und Anfragen, orchestriert die Kommunikation mit dem LLM und gibt strukturierte Antworten zurück.

**Hardware-Abstraktionsschicht:** Eine logische Schicht, die verschiedene Komponenten eines Large Language Models (Datenquellen, Alignment-Mechanismen, Wahrscheinlichkeitsberechnungen) abstrahiert und über ein einheitliches Interface darstellt.

Der Datenfluss erfolgt bidirektional:
- **Request:** Frontend sendet Benutzer-Prompt + Hardware-Konfiguration → Backend
- **Response:** Backend sendet generierte Tokens + Metadaten (Alternativen, Wahrscheinlichkeiten) → Frontend

Diese Architektur ermöglicht es, die Komplexität des LLM-Systems für Benutzer durch visuelles Feedback verständlich zu machen.

---

## 2. Technologie Stack

### Frontend
- **React 17+:** Komponentenbasiertes UI-Framework für deklarative Oberflächen
- **CSS3:** Styling mit CSS-Variablen für themenkonsistente Farbgebung
- **Fetch API:** Asynchrone HTTP-Kommunikation mit dem Backend

### Backend
- **Flask:** Leichtgewichtiges Python-Web-Framework für RESTful APIs
- **JSON:** Standardisiertes Datenaustauschformat zwischen Frontend und Backend

### Kommunikation
- **REST-API:** Zwei Hauptendpoints:
  - `POST /api/auto-play`: Für Freeflow-Mode (vollständige Generierung)
  - `POST /api/step-by-step`: Für Word-by-Word-Mode (iterative Token-Auswahl)

### Konfigurationsdateien
- `hardware_state.json`: Backend-seitige Persistierung von Hardware-Konfigurationen
- `requirements.txt`: Python-Abhängigkeiten
- `package.json`: Node.js-Abhängigkeiten für Frontend

---

## 3. Kernkomponenten und deren Funktionalität

### 3.1 Hardware Control Panel (4 Würfel)

Das zentrale Designelement sind vier visuell distinkte "Würfel", die unterschiedliche Aspekte eines LLM repräsentieren:

**Cube 1 - Prompting (Output Tone):**
- Funktion: Kontrolle über den Ausgabton/Stil
- UI-Element: 3x2 Grid mit 6 Stiloptionen (Standard, Kreativ, Business, Casual, Wissenschaftlich, Kinderecht)
- State-Variable: `hardwareState.prompt_style`
- Färbung: Blau (#6ec7ff) zur Konsistenz mit anderen Prompt-bezogenen Elementen

**Cube 2 - Data Layer:**
- Funktion: Aktivierung/Deaktivierung von Trainingsdaten
- Sub-Komponente: "Internet Search" Button, der nur aktiv ist wenn Data = ON
- State-Variablen: `hardwareState.cubes_present.data`, `hardwareState.b1_internet`
- Färbung: Indigoblau (#98a2eb)

**Cube 3 - Ethical Alignment (RLHF):**
- Funktion: Aktivierung ethischer Alignment-Mechanismen
- Repräsentiert: Reinforcement Learning from Human Feedback
- State-Variable: `hardwareState.cubes_present.rlhf`
- Färbung: Rose (#ef7ca6)

**Cube 4 - Output Calculation (Probability):**
- Funktion: Kontrolle über Token-Wahrscheinlichkeitsberechnungen
- State-Variable: `hardwareState.cubes_present.probability`
- Färbung: Türkis (#7bebb9)

### 3.2 Preset Prompts System

Ein kategorisiertes Promptsystem mit vier Kategorien:
- **Alignment:** Sicherheits- und Alignment-Tests
- **Data:** Fragen die Internetverbindung erfordern
- **Probability:** Open-ended Prompts zum Testen von Variabilität
- **Tone:** Style-Tests verschiedener Ausgaben

Jede Kategorie hat eine eindeutige Farbe, die mit den Hardware-Würfeln korrespondiert. Die Presets ermöglichen es Benutzern, schnell typische Use-Cases zu erkunden.

### 3.3 UI-Modi

**Freeflow Mode:**
- Vollständige Token-Generierung in einem Schritt
- Schnelle Exploration
- Endpoint: `/api/auto-play`

**Word-by-Word Mode:**
- Iterative Token-Generierung
- Benutzer sieht Wahrscheinlichkeitsverteilungen für nächste Tokens
- Benutzer kann Token manuell auswählen
- Endpoint: `/api/step-by-step`

### 3.4 Output Console

Zwei-teilige Ausgabefläche:
1. **Output Box:** Zeigt generierten Text mit blinkender Cursor-Animation
2. **Alternatives Box:** Zeigt Token-Wahrscheinlichkeiten als interaktive Balken (nur im Word-by-Word-Mode)

---

## 4. State Management & Datenfluss

### 4.1 React State-Struktur

```javascript
const [hardwareState, setHardwareState] = useState({
    cubes_present: {
        probability: false,     // boolean - Cube aktiv?
        prompting: false,       // boolean - Cube aktiv?
        data: false,            // boolean - Cube aktiv?
        rlhf: false,            // boolean - Cube aktiv?
    },
    b1_internet: false,         // boolean - Internet aktiv?
    b2_temp: 0.7,              // float - Temperature für Randomness
    b2_mode: 'live',           // string - Modus
    b3_alignment: true,        // boolean - Alignment aktiv?
    prompt_style: 'standard',  // string - Ausgabton
});
```

Zusätzlich gibt es State-Variablen für:
- `prompt`: Benutzer-Input
- `output`: Generierte Ausgabe
- `alternatives`: Array von Token-Alternativen mit Wahrscheinlichkeiten
- `uiMode`: 'freeflow' oder 'wordbyword'
- `loading` / `isGenerating`: Für UI-Feedback während Verarbeitung
- `error` / `warning`: Für Fehlerbehandlung

### 4.2 Request-Response Zyklus

**Freeflow Request:**
```json
{
    "prompt": "Explain gravity.",
    "config": hardwareState,
    "max_tokens": 100
}
```

**Freeflow Response:**
```json
{
    "success": true,
    "final_text": "Gravity is...",
    "warning": null
}
```

**Step-by-Step Request:**
```json
{
    "prompt": "Explain gravity.",
    "config": hardwareState,
    "user_selected_tokens": ["Gravity", "is"]  // null für erste Iteration
}
```

**Step-by-Step Response:**
```json
{
    "success": true,
    "alternatives": [
        {"token": " a", "logprob": -0.5, "probability": 0.61},
        {"token": " the", "logprob": -1.2, "probability": 0.30},
        {"token " " a", "logprob": -2.1, "probability": 0.09}
    ],
    "finished": false,
    "warning": null
}
```

### 4.3 Event-Handler und State-Updates

**toggleData():** Schaltet Data-Cube um und deaktiviert Internet automatisch wenn Data ausgeschaltet
**toggleInternet():** Schaltet Internet um (nur wenn Data aktiv)
**toggleRLHF():** Schaltet RLHF-Cube um
**toggleProbability():** Schaltet Probability-Cube um
**handlePromptStyle():** Ändert Ausgabeton
**handleTokenSelect():** Wählt Token in Word-by-Word-Mode und triggert nächste API-Anfrage

---

## 5. Design Entscheidungen mit Begründung

### 5.1 Würfel-Metapher für Hardware-Komponenten

**Entscheidung:** Vier visuell distinct "Würfel" statt abstraktes Settings-Panel

**Begründung aus Research (Semi-structured Interviews):**
- Würfel ermöglichen **tangible Representation** komplexer LLM-Konzepte
- Einfache Visualisierung von "an/aus" Status durch Farbe und Checkmark
- Metapher korrespondiert mit physischen Objekten (Hardware-Module)
- Reduziert kognitive Last durch räumliche Organisation

**Implementierung:**
- CSS-Klassen für konsistentes Styling (`.mainCubeButton.data`, `.mainCubeButton.rlhf`)
- CSS-Variablen für zentrale Farbdefinition
- Grid-Layout für visuelle Gleichwertigkeit (4 Spalten)

### 5.2 Farbliche Kennzeichnung über alle Komponenten

**Entscheidung:** Konsistente Farben zwischen Hardware-Cubes und Preset Prompts

**Begründung:**
- **Visuelle Kohärenz:** Benutzer erkennen Zusammenhang zwischen Cubes und Kategorien
- **Schnelle Erkennbarkeit:** Farbe = schnellere Verarbeitung als Text lesen
- **Accessibility:** Unterstützt visuelles Lernen

**Implementierung:**
```css
:root {
    --color-prompting: #6ec7ff;     /* Blau */
    --color-data: #98a2eb;          /* Indigoblau */
    --color-rlhf: #ef7ca6;          /* Rose */
    --color-probability: #7bebb9;   /* Türkis */
}
```

Alle Komponenten referenzieren diese Variablen, nicht hardcodierte Farben.

### 5.3 Zwei UI-Modi (Freeflow vs. Word-by-Word)

**Entscheidung:** Zwei separate Generierungsmodi mit unterschiedlichen UX

**Begründung aus Research:**
- **Freeflow:** Für schnelle Exploration und intuitives Verständnis ("Was antwortet der LLM?")
- **Word-by-Word:** Für tiefes Lernen ("Warum wählt der LLM diesen Token?")
- Adressiert verschiedene Lernstile und Explorations-Strategien

**Implementierung:**
- Toggle-Button für Mode-Auswahl
- Unterschiedliche API-Endpoints je nach Mode
- Conditionales Rendering der Alternatives-Box

### 5.4 Abhängigkeiten zwischen Komponenten

**Entscheidung:** Internet-Button ist nur aktiv wenn Data aktiv ist

**Begründung:**
- Repräsentiert reale Abhängigkeit (Internet-Suchergebnisse brauchen Datenquellen)
- Verhindert Invalid-State-Kombinationen
- Visuelles und funktionales Feedback durch `disabled`-Attribut

**Implementierung:**
```javascript
const toggleData = () => {
    setHardwareState(prev => ({
        ...prev,
        cubes_present: { ...prev.cubes_present, data: !prev.cubes_present.data },
        b1_internet: prev.cubes_present.data ? false : prev.b1_internet,
    }));
};
```

### 5.5 Modularisierung des Codes

**Entscheidung:** PresetPrompts als separate React-Komponente

**Begründung:**
- **Separation of Concerns:** Hardware-Kontrolle ≠ Preset-Management
- **Wiederverwendbarkeit:** PresetPrompts könnte in anderen Kontexten genutzt werden
- **Wartbarkeit:** Änderungen an Presets beeinflussen nicht Hardware-Logik

**Implementierung:**
- `App.jsx`: Globale State + Hardware-Cubes + Output
- `PresetPrompts.jsx`: Kategorisierung + Filtering + Auswahl-Logik
- Prop-Passing für Kommunikation: `prompt` und `setPrompt`

### 5.6 CSS-Klassen statt Inline-Styles

**Entscheidung:** Alle Styling ins CSS-Datei, keine inline `style`-Props

**Begründung:**
- **Performance:** CSS-Klassen sind effizienter als berechnete inline-Styles
- **Maintainability:** Single Source of Truth für Styling
- **Konsistenz:** Verhindert Farb-Inkonsistenzen durch Dopplungen
- **Responsive Design:** Media Queries nur in CSS möglich

**Implementierung:**
- `App.css`: Zentrale Definition aller Styles
- Semantische Klassennamen (`.mainCubeButton.data`, `.presetChip.alignment`)
- CSS-Variablen für wiederverwendbare Werte

---

## Übergangsphrase zum nächsten Kapitel

Diese Designentscheidungen basieren direkt auf den Erkenntnissen aus den semi-strukturierten Interviews [VERWEIS auf Interview-Kapitel], in denen deutlich wurde, dass Benutzer komplexe LLM-Konzepte durch visuell-metaphorische Darstellung schneller verstehen als durch abstrakte Settings-Dialoge...

---

**Nächste Kapitel könnten sein:**
- 6. Herausforderungen & Lösungen
- 7. Integration mit Research Findings
- 8. Implementierungs-Details (Fehlerbehandlung, Validierung)
- 9. Evaluation und Learnings
