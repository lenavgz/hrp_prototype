#include <SPI.h>
#include <MFRC522.h>

// Definiere die CS und RST Pins für jeden Reader
#define RST_PIN_1 5
#define SS_PIN_1 53

#define RST_PIN_2 6
#define SS_PIN_2 8

#define RST_PIN_3 7
#define SS_PIN_3 9

#define RST_PIN_4 4
#define SS_PIN_4 10

// Erstelle vier MFRC522-Objekte
MFRC522 mfrc522_1(SS_PIN_1, RST_PIN_1);
MFRC522 mfrc522_2(SS_PIN_2, RST_PIN_2);
MFRC522 mfrc522_3(SS_PIN_3, RST_PIN_3);
MFRC522 mfrc522_4(SS_PIN_4, RST_PIN_4);

// Array mit Pointern auf alle Reader
MFRC522* readers[] = {&mfrc522_1, &mfrc522_2, &mfrc522_3, &mfrc522_4};
const int NUM_READERS = 4;

// Speichere die erwarteten UIDs deiner Würfel (später ausfüllen!)
String cube_uids[NUM_READERS] = {"", "", "", ""};
String cube_names[NUM_READERS] = {"PROBABILITY_DICE", "PROMPTING_DICE", "DATA_DICE", "RLHF_DICE"};

void setup() {
  Serial.begin(9600);
  delay(1000);
  
  SPI.begin();
  
  // Initialisiere alle Reader
  for(int i = 0; i < NUM_READERS; i++) {
    readers[i]->PCD_Init();
    Serial.print("[Setup] Reader ");
    Serial.print(i + 1);
    Serial.println(" initialisiert");
  }
  
  Serial.println("[Ready] Cube-Detektor aktiv - Sticker auf die Reader legen...");
}

void loop() {
  // Scanne alle vier Reader
  for(int i = 0; i < NUM_READERS; i++) {
    if (readers[i]->PICC_IsNewCardPresent()) {
      if (readers[i]->PICC_ReadCardSerial()) {
        // Lese die UID aus
        String detected_uid = get_uid_string(readers[i]);
        
        // Sende das Ergebnis über Serial
        Serial.print("DETECTED_CUBE,");
        Serial.print(i + 1);  // Reader-Nummer (1-4)
        Serial.print(",");
        Serial.print(cube_names[i]);
        Serial.print(",");
        Serial.println(detected_uid);
        
        // Gib kurz aus, was erkannt wurde
        Serial.print("[Reader ");
        Serial.print(i + 1);
        Serial.print("] ");
        Serial.print(cube_names[i]);
        Serial.print(" -> UID: ");
        Serial.println(detected_uid);
        
        // Karte "abmelden"
        readers[i]->PICC_HaltA();
        readers[i]->PCD_StopCrypto1();
        
        delay(500);  // Entprellung
      }
    }
  }
}

// Hilfsfunktion: Konvertiere UID zu lesbarem String
String get_uid_string(MFRC522* mfrc522) {
  String uid = "";
  for (byte i = 0; i < mfrc522->uid.size; i++) {
    if (mfrc522->uid.uidByte[i] < 0x10) {
      uid += "0";  // Führende Null
    }
    uid += String(mfrc522->uid.uidByte[i], HEX);
  }
  return uid;
}