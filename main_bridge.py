import serial
import time
from ai_engine import run_pipeline

# Configure this to match your Arduino port ('COM3' on Windows, '/dev/tty.usbmodem...' on Mac)
SERIAL_PORT = 'COM3' 
BAUD_RATE = 9600

try:
    arduino = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    time.sleep(2) # Allow Arduino time to reset
    print("[System] Hardware connected successfully!")
except Exception as e:
    print(f"[Warning] Could not open hardware port: {e}. Running in simulation mode.")
    arduino = None

def parse_hardware_line(line):
    # Parses: "B1:1,B2_ACT:1,TEMP:0.75,B3:0"
    parts = line.strip().split(',')
    data = {}
    for part in parts:
        key, val = part.split(':')
        data[key] = float(val) if 'TEMP' in key else bool(int(val))
    return data

# Main loop checking for user queries while watching the physical board
while True:
    user_input = input("\nType a prompt to test your layout (or 'exit'): ")
    if user_input.lower() == 'exit':
        break
        
    # Default fallback states if hardware is unplugged
    states = {"B1": False, "B2_ACT": True, "TEMP": 0.7, "B3": True}
    
    if arduino and arduino.in_waiting:
        try:
            raw_line = arduino.readline().decode('utf-8').strip()
            states = parse_hardware_line(raw_line)
            print(f"[Hardware Live State] {states}")
        except Exception:
            print("[Error] Failed to read hardware line, using defaults.")

    # Execute the pipeline with live data
    result = run_pipeline(
        user_prompt=user_input,
        b1_internet=states["B1"],
        b2_prob_active=states["B2_ACT"],
        b2_temp=states["TEMP"],
        b3_alignment=states["B3"]
    )
    print("\n>>> Result:", result["text"])