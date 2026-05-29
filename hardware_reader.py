import serial
import time
from datetime import datetime

class HardwareReader:
    """
    Reads real hardware data from Arduino via Serial/USB.
    Parses CSV format: "DETECTED_CUBE,1,PROBABILITY_DICE,04a2b3c4"
    Returns standardized config dict for ai_engine.py
    """
    
    def __init__(self, port='COM3', baudrate=9600, timeout=1):
        """
        Initialize hardware connection.
        
        Args:
            port (str): Arduino COM port (COM3, COM4, /dev/ttyUSB0 on Linux, etc.)
            baudrate (int): Must match Arduino (9600)
            timeout (int): Serial read timeout in seconds
        """
        self.port = port
        self.baudrate = baudrate
        self.ser = None
        self.connected = False
        
        # Track which cubes are currently detected
        self.cube_states = {
            1: {"name": "PROBABILITY_DICE", "present": False, "uid": None},
            2: {"name": "PROMPTING_DICE", "present": False, "uid": None},
            3: {"name": "DATA_DICE", "present": False, "uid": None},
            4: {"name": "RLHF_DICE", "present": False, "uid": None}
        }
        
        # Last detection time (to avoid spam)
        self.last_detection_time = {}
        self.detection_debounce_ms = 500
        
        self._connect()
    
    def _connect(self):
        """Connect to Arduino via serial port."""
        try:
            self.ser = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=1,
                write_timeout=1
            )
            time.sleep(2)  # Wait for Arduino to boot
            self.connected = True
            print(f"[HW] ✅ Arduino verbunden auf {self.port} @ {self.baudrate} baud")
            return True
            
        except serial.SerialException as e:
            print(f"[HW] ❌ Konnte nicht zu {self.port} verbinden: {e}")
            self.connected = False
            return False
    
    def get_config(self):
        """
        Main method: Get current hardware configuration.
        
        Returns:
            dict: Standardized config with:
                - cubes_present
                - b1_internet
                - b2_temp
                - b2_mode
                - b3_alignment
                - prompt_style
        """
        
        # Try to read new data from Arduino
        self._read_serial_data()
        
        # If Arduino not connected, return safe defaults
        if not self.connected:
            return self._default_config()
        
        # Build config from current cube states
        return self._build_config_from_cubes()
    
    def _read_serial_data(self):
        """Read and parse incoming serial data from Arduino."""
        if not self.connected or not self.ser:
            return
        
        try:
            if self.ser.in_waiting:
                line = self.ser.readline().decode('utf-8').strip()
                
                if line:
                    # Debug output
                    print(f"[HW-Serial] Empfangen: {line}")
                    
                    # Parse the CSV data
                    if line.startswith("DETECTED_CUBE"):
                        self._parse_csv_line(line)
                    elif line.startswith("["):
                        # Debug output from Arduino (e.g., "[Setup] Reader 1...")
                        print(f"[HW-Debug] {line}")
                        
        except UnicodeDecodeError:
            print("[HW] ⚠️  Unicode-Fehler beim Lesen - ignoriert")
        except Exception as e:
            print(f"[HW] ⚠️  Fehler beim Lesen: {e}")
    
    def _parse_csv_line(self, line):
        """
        Parse CSV line from Arduino.
        Format: "DETECTED_CUBE,1,PROBABILITY_DICE,04a2b3c4"
        
        Args:
            line (str): Raw CSV line
        """
        try:
            parts = line.split(',')
            
            if len(parts) < 4:
                print(f"[HW] ⚠️  Ungültiges Format: {line}")
                return
            
            # Parse components
            message_type = parts[0]
            reader_num = int(parts[1])
            cube_name = parts[2]
            uid = parts[3]
            
            if message_type != "DETECTED_CUBE":
                return
            
            # Validate reader number
            if reader_num < 1 or reader_num > 4:
                print(f"[HW] ⚠️  Ungültige Reader-Nummer: {reader_num}")
                return
            
            # Update cube state
            self.cube_states[reader_num]["present"] = True
            self.cube_states[reader_num]["uid"] = uid
            
            print(f"[HW] ✅ Reader {reader_num}: {cube_name} erkannt (UID: {uid})")
            
        except (ValueError, IndexError) as e:
            print(f"[HW] ⚠️  Parse-Fehler: {e}")
    
    def _build_config_from_cubes(self):
        """
        Convert current cube states to standardized config dict.
        
        Returns:
            dict: Config matching ai_engine.py expectations
        """
        
        # Determine which cubes are present
        probability_present = self.cube_states[1]["present"]
        prompting_present = self.cube_states[2]["present"]
        data_present = self.cube_states[3]["present"]
        rlhf_present = self.cube_states[4]["present"]
        
        # Default config
        config = {
            "cubes_present": {
                "probability": probability_present,
                "prompting": prompting_present,
                "data": data_present,
                "rlhf": rlhf_present
            },
            "b1_internet": data_present,  # Data Dice controls internet
            "b2_temp": 0.7,  # Will be updated by actual potentiometer reading
            "b2_mode": "live",  # Will be "step" if button pressed (TODO)
            "b3_alignment": rlhf_present,  # RLHF Dice controls alignment
            "prompt_style": "standard"  # Will be updated by Prompting Dice (TODO)
        }
        
        return config
    
    def _default_config(self):
        """
        Safe default configuration when Arduino disconnected.
        
        Returns:
            dict: Safe defaults (all cubes absent, alignment on)
        """
        return {
            "cubes_present": {
                "probability": False,
                "prompting": False,
                "data": False,
                "rlhf": False
            },
            "b1_internet": False,
            "b2_temp": 0.7,
            "b2_mode": "live",
            "b3_alignment": True,  # Alignment ON by default (safer)
            "prompt_style": "standard"
        }
    
    def print_status(self):
        """Debug method: Print current hardware status."""
        print("\n" + "="*50)
        print("HARDWARE STATUS")
        print("="*50)
        print(f"Verbunden: {'✅ Ja' if self.connected else '❌ Nein'}")
        print(f"Port: {self.port}")
        print(f"\nWürfel-Status:")
        for reader_num, state in self.cube_states.items():
            status = "✅ Vorhanden" if state["present"] else "❌ Fehlt"
            uid_info = f"(UID: {state['uid']})" if state["uid"] else ""
            print(f"  Reader {reader_num}: {state['name']:<20} {status} {uid_info}")
        print("="*50 + "\n")
    
    def close(self):
        """Close serial connection."""
        if self.ser and self.ser.is_open:
            self.ser.close()
            print("[HW] Serial-Verbindung geschlossen")