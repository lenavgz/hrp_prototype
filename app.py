# app.py

from flask import Flask, render_template, request, jsonify, Response, stream_with_context
from hardware_config import get_hardware_config, save_hardware_config
from ai_engine import run_ai_step_by_step, run_ai_auto_play_stream
import json
from flask_cors import CORS 
import json
from pathlib import Path

CONFIG_FILE = 'hardware_state.json'

app = Flask(__name__, template_folder='.')
CORS(app) 

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/hardware-status', methods=['GET', 'POST'])
def hardware_status():
    """Debug Endpoint: Zeig aktuelle Hardware Config"""
    config = get_hardware_config()
    return jsonify(config)

@app.route('/api/step-by-step', methods=['POST'])
def step_by_step():
    """
    Step-by-Step Mode: User klickt Wörter einzeln an.
    
    Request:
    {
        "prompt": "What colour are cats?",
        "user_selected_tokens": ["C", "a", "t"]  (optional)
    }
    """

    data = request.json
    config = data.get('config', {})
    
    # ← SPEICHERE DIE CONFIG
    save_hardware_config(config)
    try:
        # 1. HARDWARE CONFIG LESEN
        config = get_hardware_config()
        print(f"[Flask] Hardware Config: {json.dumps(config, indent=2)}")
        
        # 2. USER INPUT LESEN
        data = request.json
        user_prompt = data.get('prompt', '')
        user_selected_tokens = data.get('user_selected_tokens', None)
        
        # 3. AN AI ENGINE ÜBERGEBEN
        result = run_ai_step_by_step(
            user_prompt=user_prompt,
            config=config,
            user_selected_tokens=user_selected_tokens
        )
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/auto-play', methods=['POST'])
def auto_play():
    """
    Auto-Play Mode: System generiert Tokens automatisch.
    
    Request:
    {
        "prompt": "What colour are cats?",
        "max_tokens": 10  (optional, default 20)
    }
    """

    data = request.json
    config = data.get('config', {})
    
    # ← SPEICHERE DIE CONFIG
    save_hardware_config(config)

    try:
        # 1. HARDWARE CONFIG LESEN
        config = get_hardware_config()
        print(f"[Flask] Hardware Config: {json.dumps(config, indent=2)}")
        
        # 2. USER INPUT LESEN
        data = request.json
        user_prompt = data.get('prompt', '')
        max_tokens = data.get('max_tokens', 200)
        
        # 3. AN AI ENGINE ÜBERGEBEN
        return Response(
            stream_with_context(
                run_ai_auto_play_stream(
                    user_prompt=user_prompt,
                    config=config,
                    max_tokens=max_tokens
                )
            ),
            content_type='text/plain; charset=utf-8'
        )
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    print("[Flask] Server starting on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)