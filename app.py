from flask import Flask, render_template, request, jsonify
from ai_engine import run_ai_pipeline
from hardware_simulator import HardwareSimulator

app = Flask(__name__, template_folder='.')
hw_sim = HardwareSimulator('hardware_state.json')

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/prompt', methods=['POST'])
def handle_prompt():
    data = request.json
    user_text = data.get('text', '')
    
    print(f"[UI-Server] Empfange Prompt: '{user_text}'")
    
    # Hier holen wir die echten Werte aus der JSON statt hartcodiert!
    config = hw_sim.get_config()
    
    print(f"[Hardware Sim] Aktuelle Config: {config}")
    
    # Pipeline ausführen
    ergebnis = run_ai_pipeline(
        user_prompt=user_text,
        b1_internet=config['b1_internet'],
        b2_temp=config['b2_temp'],
        b3_alignment=config['b3_alignment']
    )
    
    return jsonify(ergebnis)

@app.route('/hardware-status', methods=['GET'])
def get_hardware_status():
    """Endpoint um den aktuellen Hardware-Status zu sehen."""
    return jsonify(hw_sim.state)

@app.route('/hardware-status', methods=['POST'])
def update_hardware_status():
    """Endpoint um Hardware-Status zu ändern (für Tests)."""
    new_state = request.json
    hw_sim.save_state(new_state)
    return jsonify({"success": True, "state": hw_sim.state})

if __name__ == '__main__':
    print("[UI-Server] Server startet unter http://127.0.0.1:5000")
    app.run(debug=True, port=5000)