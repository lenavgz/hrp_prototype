// Dummy placeholders for pin connections
const int INTERNET_SWITCH_PIN = 2; // Toggle switch
const int TEMP_POT_PIN = A0;       // Potentiometer dial
const int ALIGNMENT_PIN = 3;      // Simulating Block 3 connection

void setup() {
  Serial.begin(9600); // Start the USB serial connection
  pinMode(INTERNET_SWITCH_PIN, INPUT_PULLUP);
  pinMode(ALIGNMENT_PIN, INPUT_PULLUP);
}

void loop() {
  // Read physical states (0 = block placed/active due to INPUT_PULLUP)
  bool b1_internet = (digitalRead(INTERNET_SWITCH_PIN) == LOW);
  bool b3_alignment = (digitalRead(ALIGNMENT_PIN) == LOW);
  
  // Read temperature dial and convert 0-1023 into a clean 0.0 to 1.5 float
  int raw_pot = analogRead(TEMP_POT_PIN);
  float b2_temp = (raw_pot / 1023.0) * 1.5;
  
  // Hardcoding probability block presence for this example pin
  bool b2_active = true; 

  // Bundle into a single standardized string line
  Serial.print("B1:"); Serial.print(b1_internet);
  Serial.print(",B2_ACT:"); Serial.print(b2_active);
  Serial.print(",TEMP:"); Serial.print(b2_temp, 2);
  Serial.print(",B3:"); Serial.println(b3_alignment);

  delay(200); // Send updates 5 times a second
}