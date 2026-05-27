import json
import os
from datetime import datetime

class HardwareSimulator:
    """Simuliert die Hardware-Eingaben vom Arduino via JSON."""
    
    def __init__(self, json_file='hardware_state.json'):
        self.json_file = json_file
        self.load_state()
    
    def load_state(self):
        """Lädt den aktuellen Hardware-Status aus der JSON-Datei."""
        if not os.path.exists(self.json_file):
            print(f"[Warning] {self.json_file} nicht gefunden. Nutze Standard-Werte.")
            self.state = self._default_state()
        else:
            with open(self.json_file, 'r') as f:
                self.state = json.load(f)
        print(f"[Hardware Sim] Zustand geladen: {self.state['cubes']}")
    
    def _default_state(self):
        """Standard-Konfiguration wenn keine Datei existiert."""
        return {
            "timestamp": datetime.now().isoformat(),
            "cubes": {
                "probability_dice": {"present": True, "temperature": 0.7, "mode": "live"},
                "prompting_dice": {"present": True, "side": "standard"},
                "data_dice": {"present": True, "internet_enabled": True},
                "rlhf_dice": {"present": True, "alignment_enabled": True}
            }
        }
    
    def get_config(self):
        """Gibt die aktuelle Konfiguration für die AI-Engine aus."""
        cubes = self.state['cubes']
        
        return {
            "b1_internet": cubes['data_dice'].get('internet_enabled', True),
            "b2_temp": cubes['probability_dice'].get('temperature', 0.7),
            "b2_mode": cubes['probability_dice'].get('mode', 'live'),
            "b3_alignment": cubes['rlhf_dice'].get('alignment_enabled', True),
            "prompt_style": cubes['prompting_dice'].get('side', 'standard'),
            "cubes_present": {
                "probability": cubes['probability_dice'].get('present', True),
                "prompting": cubes['prompting_dice'].get('present', True),
                "data": cubes['data_dice'].get('present', True),
                "rlhf": cubes['rlhf_dice'].get('present', True)
            }
        }
    
    def save_state(self, new_state):
        """Speichert einen neuen Hardware-Status in die JSON-Datei."""
        self.state = new_state
        with open(self.json_file, 'w') as f:
            json.dump(self.state, f, indent=2)
        print(f"[Hardware Sim] Zustand gespeichert")