# Zentrale Stelle, die Config von Hardware liest und zurückgibt. Egal ob Arduino oder Simulator

import os
import json

# Entscheide: Simulator oder echte Hardware?
USE_SIMULATOR = os.getenv("USE_SIMULATOR", "true").lower() == "true"

def get_hardware_config():
    """
    Gibt standardisierte Config zurück - entweder von Arduino ODER Simulator.
    
    Returns:
    {
        "cubes_present": {
            "probability": bool,
            "prompting": bool,
            "data": bool,
            "rlhf": bool
        },
        "b1_internet": bool,      # Data Dice vorhanden?
        "b2_temp": float,         # Potentiometer Wert (0.0-2.0)
        "b2_mode": "live|step",   # Probability Dice Modus
        "b3_alignment": bool,     # RLHF Dice vorhanden?
        "prompt_style": str       # Welche Seite des Prompting Dice oben?
    }
    """
    
    if USE_SIMULATOR:
        return _get_simulator_config()
    else:
        return _get_arduino_config()

def _get_simulator_config():
    """Liest aus hardware_state.json"""
    try:
        with open('hardware_state.json', 'r') as f:
            simulator_data = json.load(f)
        
        cubes = simulator_data.get('cubes', {})
        
        return {
            "cubes_present": {
                "probability": cubes.get('probability_dice', {}).get('present', False),
                "prompting": cubes.get('prompting_dice', {}).get('present', False),
                "data": cubes.get('data_dice', {}).get('present', False),
                "rlhf": cubes.get('rlhf_dice', {}).get('present', False)
            },
            "b1_internet": cubes.get('data_dice', {}).get('internet_enabled', False),
            "b2_temp": cubes.get('probability_dice', {}).get('temperature', 0.7),
            "b2_mode": cubes.get('probability_dice', {}).get('mode', 'live'),
            "b3_alignment": cubes.get('rlhf_dice', {}).get('alignment_enabled', True),
            "prompt_style": cubes.get('prompting_dice', {}).get('side', 'standard')
        }
    except Exception as e:
        print(f"[Error] Simulator config failed: {e}. Using defaults.")
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
    """Fallback: Sicherheitsstandard (aligned, no internet)"""
    return {
        "cubes_present": {
            "probability": False,
            "prompting": False,
            "data": False,
            "rlhf": True  # Safety first!
        },
        "b1_internet": False,
        "b2_temp": 0.7,
        "b2_mode": "live",
        "b3_alignment": True,
        "prompt_style": "standard"
    }

if __name__ == "__main__":
    print(get_hardware_config())