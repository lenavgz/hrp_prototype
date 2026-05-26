from flask import Flask, render_template, request, jsonify
# Wir importieren deine bereits funktionierende Pipeline
from ai_engine import run_ai_pipeline 

app = Flask(__name__, template_folder='.')

@app.route('/')
def home():
    # Lädt die index.html direkt aus dem aktuellen Ordner
    return render_template('index.html')

@app.route('/prompt', methods=['POST'])
def handle_prompt():
    data = request.json
    user_text = data.get('text', '')
    
    print(f"[UI-Server] Empfange Prompt: '{user_text}'")
    
    # Hier simulieren wir die physischen Box-Schalter für den Test!
    # Du kannst die Werte hier im Code ändern, um das Verhalten zu testen.
    HARDWARE_INTERNET = True
    HARDWARE_TEMP = 0.7
    HARDWARE_ALIGNMENT = True
    
    # Pipeline ausführen
    ergebnis = run_ai_pipeline(
        user_prompt=user_text, 
        b1_internet=HARDWARE_INTERNET, 
        b2_temp=HARDWARE_TEMP, 
        b3_alignment=HARDWARE_ALIGNMENT
    )
    
    return jsonify(ergebnis)

if __name__ == '__main__':
    print("[UI-Server] Server startet unter http://127.0.0.1:5000")
    app.run(debug=True, port=5000)