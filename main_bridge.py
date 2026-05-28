import serial
import time
import json
import os
from ai_engine import run_ai_pipeline # Ensure import matches your engine filename

SERIAL_PORT = 'COM3' 
BAUD_RATE = 9600
STATE_FILE = 'hardware_state.json'

try:
    arduino = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    time.sleep(2) # Allow Arduino time to reset
    print("[Hardware-Bridge] Live Arduino connected successfully!")
except Exception as e:
    print(f"[Warning] Could not open hardware port: {e}. Running in simulation mode.")
    arduino = None

def parse_hardware_line(line):
    try:
        parts = line.strip().split(',')
        data = {}
        for part in parts:
            if ':' not in part: continue
            key, val = part.split(':')
            
            # Map Arduino keys to the exact configuration names your app.py expects
            if key == "B1":      data["b1_internet"] = bool(int(val))
            elif key == "B2_ACT": data["b2_active"] = bool(int(val))
            elif key == "TEMP":   data["b2_temp"] = float(val)
            elif key == "B3":     data["b3_alignment"] = bool(int(val))
        return data
    except Exception as e:
        print(f"[Parsing Error] Error parsing line '{line}': {e}")
        return None

print("\n[System] Bridge is active. Listening to Arduino and updating hardware_state.json...")

# CONTINUOUS BACKGROUND LOOP (No input() blocks!)
while True:
    if arduino and arduino.in_waiting:
        try:
            raw_line = arduino.readline().decode('utf-8').strip()
            if raw_line:
                live_states = parse_hardware_line(raw_line)
                
                if live_states:
                    print(f"[Live Serial Stream] {raw_line}")
                    
                    # 1. Load current JSON file if it exists
                    current_data = {}
                    if os.path.exists(STATE_FILE):
                        try:
                            with open(STATE_FILE, 'r') as f:
                                current_data = json.load(f)
                        except json.JSONDecodeError:
                            pass
                    
                    # 2. Merge live Arduino data into the JSON
                    current_data.update(live_states)
                    
                    # 3. Save it back instantly
                    with open(STATE_FILE, 'w') as f:
                        json.dump(current_data, f, indent=4)
                        
        except Exception as e:
            print(f"[Error] Failed to read or save hardware state: {e}")
            
    time.sleep(0.05) # Keeps CPU usage perfectly low