# Zentrale Stelle, die Config von Hardware liest und zurückgibt. Egal ob Arduino oder Simulator

import os
import json
from pathlib import Path

# Entscheide: Simulator oder echte Hardware?
USE_SIMULATOR = os.getenv("USE_SIMULATOR", "true").lower() == "true"
CONFIG_FILE = 'hardware_state.json'

def get_hardware_config():
    """
    Gibt standardisierte Config zurück - entweder von JSON ODER Arduino.
    
    Returns:
    {
        "cubes_present": { "probability": bool, "prompting": bool, "data": bool, "rlhf": bool },
        "b1_internet": bool,
        "b2_temp": float,
        "b3_alignment": bool,
        "prompt_style": str
    }
    """
    
    if USE_SIMULATOR:
        return _get_simulator_config()
    else:
        return _get_arduino_config()

def _get_simulator_config():
    """Liest direkt aus hardware_state.json im neuen Format"""
    try:
        if Path(CONFIG_FILE).exists():
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
            
            print(f"[Config] Loaded from {CONFIG_FILE}: {json.dumps(config, indent=2)}")
            return config
        else:
            print(f"[Warning] {CONFIG_FILE} not found. Using defaults.")
            return _default_config()
    
    except Exception as e:
        print(f"[Error] Could not read {CONFIG_FILE}: {e}. Using defaults.")
        return _default_config()

def _get_arduino_config():
    """Liest vom Arduino via Serial"""
    try:
        from hardware_reader import parse_arduino_data
        return parse_arduino_data()
    except Exception as e:
        print(f"[Error] Arduino connection failed: {e}. Using defaults.")
        return _default_config()

def _default_config():
    """Default Config wenn keine Datei existiert"""
    return {
        "cubes_present": {
            "probability": True,
            "prompting": True,
            "data": True,
            "rlhf": True,
        },
        "b1_internet": True,
        "b2_temp": 0.7,
        "b2_mode": "live",
        "b3_alignment": True,
        "prompt_style": "standard",
    }

def save_hardware_config(config):
    """Speichert Config in JSON"""
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
        print(f"[Config] Saved to {CONFIG_FILE}")
    except Exception as e:
        print(f"[Error] Could not save config: {e}")

if __name__ == "__main__":
    print(get_hardware_config())