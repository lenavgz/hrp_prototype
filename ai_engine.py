import ollama
from duckduckgo_search import DDGS
import os
from ollama import Client
from dotenv import load_dotenv

def get_live_context(prompt):
    print(f"[System] Starte Ollama Cloud-Suche für: '{prompt}'...")
    try:
        # os.getenv holt sich den Key aus der unsichtbaren .env-Datei
        api_key = os.getenv("OLLAMA_API_KEY")
        
        if not api_key:
            print("[Fehler] Kein OLLAMA_API_KEY in der .env-Datei gefunden!")
            return ""

        # Der Client nutzt nun das sicher geladene Token
        client = Client(
            headers={'Authorization': f'Bearer {api_key}'}
        )
        
        response = client.web_search(query=prompt)
        
        snippets = []
        for r in response.get('results', []):
            snippets.append(f"- {r['content']} (Quelle: {r['url']})")
            
        return "\n".join(snippets)
        
    except Exception as e:
        print(f"[Ollama-Search-Fehler]: {e}")
        return ""

"""
def get_live_context(prompt):
    #Holt aktuelle Web-Daten über DuckDuckGo.
    print(f"[System] Starte Websuche für: '{prompt}'...")
    try:
        # Die modernere und stabilere Syntax der Bibliothek:
        results = DDGS().text(keywords=prompt, max_results=3)
        
        if not results:
            print("[System] Keine Suchergebnisse gefunden.")
            return ""
            
        # Wir sammeln die Textausschnitte (Snippets) der Webseiten
        snippets = []
        for r in results:
            snippets.append(f"- {r['body']} (Quelle: {r['href']})")
            
        web_context = "\n".join(snippets)
        print("[System] Websuche erfolgreich! Kontext wurde generiert.")
        return web_context
        
    except Exception as e:
        print(f"[Web-Fehler] Suche fehlgeschlagen: {e}")
        return ""
"""

def run_ai_pipeline(user_prompt, b1_internet, b2_temp, b3_alignment):
    """
    Steuert die KI basierend auf den physischen Schaltern.
    """
    # 1. Block 3 auswerten: Welches Modell-Gehirn nutzen wir?
    model_name = 'llama3.2' if b3_alignment else 'llama3.2:3b-text-q4_0'
    
    # 2. Block 1 auswerten: Internet-Kontext injizieren?
    final_prompt = user_prompt
    if b1_internet:
        context = get_live_context(user_prompt)
        if context:
            final_prompt = f"Kontext aus dem Web:\n{context}\n\nFrage: {user_prompt}"

    # 3. API-Anfrage an Ollama senden
    try:
        response = ollama.generate(
            model=model_name,
            prompt=final_prompt,
            options={
                'temperature': b2_temp,  # Gesteuert durch den Drehregler von Block 2
                'num_predict': 100         # Stoppt nach exakt EINEM Wort für die UI-Balken
            }
        )
        
        # Hier fangen wir die mathematischen Wahrscheinlichkeiten für das Frontend ab
        # Ollama liefert diese im Feld 'logprobs' mit, wenn num_predict=1 ist
        raw_logprobs = response.get('logprobs', [])
        
        return {
            "success": True,
            "next_word": response.get('response', ''),
            "model_used": model_name,
            "probabilities": raw_logprobs  # Das schicken wir später an die Balken-UI
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

# --- SCHNELLER MANUELLER TEST ---
if __name__ == "__main__":
    # Test-Szenario: Internet AUS, Temperatur auf 0.7, Alignment AUS (unzensiert)
    print("Teste KI-Pipeline...")
    ergebnis = run_ai_pipeline("Wies ist das Wetter heute in Salzburg", b1_internet=False, b2_temp=0.9, b3_alignment=True)
    print(ergebnis)