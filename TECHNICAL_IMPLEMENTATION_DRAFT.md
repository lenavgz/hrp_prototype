# Technische Implementierung des LLM-Exhibition Prototyps

## 1. System-Architektur

**Client-Server Architektur** mit zwei Hauptschichten:
- **Frontend (React):** Benutzeroberfläche mit lokaler State-Verwaltung, kommuniziert via Fetch API mit Backend
- **Backend (Flask/Python):** Verarbeitet Konfigurationen, orchestriert LLM-Kommunikation, gibt strukturierte Antworten zurück

**Datenfluss:** Frontend sendet Benutzer-Prompt + Hardware-Konfiguration → Backend → generierte Tokens + Metadaten → Frontend

**Zwei REST-API Endpoints:**
- `POST /api/auto-play`: Freeflow-Mode (vollständige Generierung)
- `POST /api/step-by-step`: Word-by-Word-Mode (iterative Token-Auswahl mit Wahrscheinlichkeiten)

---

## 2. Implementierte UI-Komponenten

### Hardware Control Panel (4 "Würfel")

Vier farbcodierte Steuerelemente repräsentieren LLM-Komponenten:

| Cube | Funktion | UI-Element | State | Farbe |
|------|----------|-----------|-------|-------|
| **1: Output Tone** | Ausgabestil | 6 Buttons (standard, creative, business, casual, scientific, child) | `prompt_style` | #6ec7ff |
| **2: Data Layer** | Trainingsdaten | Toggle + Internet-Sub-Button (abhängig) | `data`, `b1_internet` | #98a2eb |
| **3: Ethical Alignment** | RLHF-Aktivierung | Toggle-Button | `rlhf` | #ef7ca6 |
| **4: Output Calculation** | Token-Wahrscheinlichkeiten | Toggle-Button | `probability` | #7bebb9 |

**Key Design Decision:** Internet-Button nur aktiv wenn Data aktiv → verhindert ungültige Zustandskombinationen

### Weitere Komponenten

**UI-Modi:**
- **Freeflow:** Vollständige Generierung auf Knopfdruck
- **Word-by-Word:** Iterative Token-Auswahl mit visualisierter Wahrscheinlichkeitsverteilung

**Zusätzliche UI:**
- **PresetPrompts Komponente:** Kategorisierte Prompt-Vorlagen (Alignment, Data, Probability, Tone)
- **Output Console:** Output-Box (Text + blinkender Cursor) + Alternatives-Box (Token-Wahrscheinlichkeiten nur in Word-by-Word-Mode)

---

## 3. State Management & API-Integration

### React State-Struktur

```javascript
// Hardware-Kontrolle (UI-gesteuert)
const [hardwareState] = useState({
    cubes_present: {probability, data, rlhf},    // boolean
    b1_internet: false,                           // boolean
    prompt_style: 'standard'                      // string
});

// UI-State
const [prompt, output, alternatives, uiMode, loading, error, warning] = ...
```

### Request-Response Format

**Request (beide Modi):**
```json
{"prompt": "...", "config": hardwareState, "max_tokens": 100}
```

**Response Freeflow:**
```json
{"success": true, "final_text": "...", "warning": null}
```

**Response Word-by-Word:**
```json
{
  "success": true,
  "alternatives": [{"token": "...", "logprob": -0.5, "probability": 0.61}, ...],
  "finished": false
}
```

### Event-Handler

- `toggleData()` → deaktiviert Internet wenn Data OFF
- `toggleInternet()` → nur aktiv wenn Data ON
- `toggleRLHF()`, `toggleProbability()` → simple State-Updates
- `handlePromptStyle(style)` → ändert Output-Ton
- `handleTokenSelect(token)` → Word-by-Word Progression

---

## 4. Design-Begründungen

**Würfel-Metapher:** Tangible Representation komplexer LLM-Konzepte. Farbkodierung ermöglicht schnelle visuelle Erkennbarkeit und korrespondiert mit Preset-Kategorien. Reduziert kognitive Last durch räumliche Organisation.

**Zwei UI-Modi:** Freeflow für intuitive Exploration ("Was macht der LLM?"), Word-by-Word für Lernziele ("Warum diese Token?").

**Abhängigkeiten zwischen Komponenten:** Internet-Button nur bei aktiver Data-Schicht repräsentiert echte technische Abhängigkeiten und verhindert ungültige Zustände.

**Modularisierung:** Separate PresetPrompts-Komponente trennt Hardware-Kontrolle von Prompt-Management (Separation of Concerns).

**CSS-Architektur:** CSS-Variablen für Single Source of Truth bei Farben/Styles, semantische Klassennamen für Wartbarkeit.
