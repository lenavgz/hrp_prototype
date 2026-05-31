import requests
import math
import ollama
from duckduckgo_search import DDGS
import os
from ollama import Client
from dotenv import load_dotenv
from system_prompts import get_system_prompt

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

def get_live_context(prompt):
    """Web Search mit DuckDuckGo"""
    print(f"[System] Websuche für: '{prompt}'...")
    try:
        results = DDGS().text(keywords=prompt, max_results=3)
        snippets = [f"- {r['body']}" for r in results]
        return "\n".join(snippets)
    except Exception as e:
        print(f"[Error] Web search failed: {e}")
        return ""

def get_token_with_logprobs(messages, model_name, temperature, system_prompt, num_predict=1, ollama_host='http://localhost:11434'):
    """
    Generiere Tokens mit Logprobs.
    
    num_predict: Wie viele Tokens pro API Call? (default: 1)
    """
    
    full_messages = [
        {"role": "system", "content": system_prompt},
        *messages
    ]
    
    url = f"{ollama_host}/api/chat"
    
    payload = {
        "model": model_name,
        "messages": full_messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": num_predict  # ← NUTZE das Parameter!
        },
        "logprobs": True,
        "top_logprobs": 5
    }
    
    try:
        print(f"[HTTP] Generiere mit {model_name}, Temp={temperature}")
        response = requests.post(url, json=payload, timeout=30)
        
        if response.status_code != 200:
            return {"success": False, "error": f"HTTP {response.status_code}"}
        
        data = response.json()
        selected_token = data.get('message', {}).get('content', '')
        
        raw_logprobs = data.get('logprobs', [])
        if raw_logprobs and len(raw_logprobs) > 0:
            alternatives = convert_logprobs_to_probabilities(raw_logprobs[0].get('top_logprobs', []))
        else:
            alternatives = simulate_alternatives(selected_token)
        
        return {
            "success": True,
            "selected_token": selected_token,
            "alternatives": alternatives,
            "model": model_name
        }
    
    except Exception as e:
        return {"success": False, "error": str(e)}

def convert_logprobs_to_probabilities(logprobs):
    """Konvertiere zu Prozenten"""
    alternatives = []
    try:
        for entry in logprobs:
            token = entry.get('token', '')
            log_prob = entry.get('logprob', 0)
            prob = math.exp(log_prob)
            alternatives.append({"token": token, "probability": prob})
    except:
        return []
    
    total = sum(a['probability'] for a in alternatives)
    if total > 0:
        alternatives = [
            {"token": a['token'], "probability": round((a['probability']/total)*100, 1)}
            for a in alternatives
        ]
    
    return sorted(alternatives, key=lambda x: x['probability'], reverse=True)[:5]

def simulate_alternatives(token):
    return [
        {"token": token, "probability": 60.0},
        {"token": "and", "probability": 15.0},
        {"token": "the", "probability": 12.0},
        {"token": "is", "probability": 10.0},
        {"token": "of", "probability": 3.0}
    ]

def run_ai_step_by_step(user_prompt, config, user_selected_tokens=None):
    """
    STEP-BY-STEP MODE
    
    Config bestimmt:
    - Modell (llama3.2 vs 3b-text-q4_0)
    - System Prompt (standard, creative, etc.)
    - Temperatur
    - Web Search (ja/nein)
    """
    
    # 1. MODELL WÄHLEN
    model_name = 'llama3.2' if config['b3_alignment'] else 'llama3.2:3b-text-q4_0'
    print(f"[AI] Selected model: {model_name} (alignment={config['b3_alignment']})")
    
    # 2. SYSTEM PROMPT WÄHLEN
    system_prompt = get_system_prompt(config['prompt_style'])
    print(f"[AI] Selected prompt style: {config['prompt_style']}")
    
    # 3. TEMPERATUR NUTZEN
    temperature = config['b2_temp']
    print(f"[AI] Temperature: {temperature}")
    
    # 4. WEB SEARCH?
    final_prompt = user_prompt
    if config['b1_internet']:
        print("[AI] Web search ENABLED")
        context = get_live_context(user_prompt)
        if context:
            final_prompt = f"Context:\n{context}\n\nQuestion: {user_prompt}"
    else:
        print("[AI] Web search DISABLED")
    
    # 5. MESSAGES VORBEREITEN
    messages = [{"role": "user", "content": final_prompt}]
    if user_selected_tokens:
        assistant_text = "".join(user_selected_tokens)
        messages.append({"role": "assistant", "content": assistant_text})
    
    # 6. GENERIERE TOKEN
    result = get_token_with_logprobs(
        messages=messages,
        model_name=model_name,
        temperature=temperature,
        system_prompt=system_prompt
    )
    
    return result

def run_ai_auto_play(user_prompt, config, max_tokens=100):
    """AUTO-PLAY MODE - schnell, Text auf einmal generieren"""
    
    try:
        model_name = 'llama3.2' if config['b3_alignment'] else 'llama3.2:3b-text-q4_0'
        system_prompt = get_system_prompt(config['prompt_style'])
        temperature = config['b2_temp']
        
        # Baue den finalen Prompt
        final_prompt = user_prompt
        if config['b1_internet']:
            context = get_live_context(user_prompt)
            if context:
                final_prompt = f"Context:\n{context}\n\nQuestion: {user_prompt}"
        
        print(f"[AutoPlay] Model: {model_name}, Temp: {temperature}, MaxTokens: {max_tokens}")
        
        # ← SCHNELL: Generiere den ganzen Text auf einmal!
        response = ollama.generate(
            model=model_name,
            prompt=final_prompt,
            options={
                'temperature': float(temperature),
                'num_predict': max_tokens,
                'top_p': 0.9,
            },
            system=system_prompt,
            stream=False  # ← Wichtig: nicht streamen
        )
        
        generated_text = response.get('response', '').strip()
        
        # Entferne die Frage aus der Antwort (falls sie mitgegeben wurde)
        if generated_text.startswith(user_prompt):
            generated_text = generated_text[len(user_prompt):].strip()
        
        tokens_generated = response.get('eval_count', 0)
        
        print(f"[AutoPlay] Generated {tokens_generated} tokens")
        
        return {
            "success": True,
            "final_text": generated_text,  # ← NUR die Antwort, nicht die Frage!
            "model_used": model_name,
            "tokens_generated": tokens_generated
        }
        
    except Exception as e:
        print(f"[ERROR] auto-play: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e)
        }