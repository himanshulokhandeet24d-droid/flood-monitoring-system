#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>

// --------------------------------------------------------------------
// 1. PIN DEFINITIONS
// --------------------------------------------------------------------
#define PIN_TRIG    D5    // HC-SR04 Trigger (GPIO 14)
#define PIN_ECHO    D6    // HC-SR04 Echo (GPIO 12)
#define PIN_RAIN    D7    // MH-RD Raindrop Digital Out (GPIO 13)
#define PIN_BUZZER  D3    // Piezo Buzzer (GPIO 0)
#define PIN_LED     D0    // Alert LED (GPIO 16)

// --------------------------------------------------------------------
// 2. HARDWARE OUTPUT (LCD 16x2 I2C @ 0x27, D1=SCL, D2=SDA)
// --------------------------------------------------------------------
LiquidCrystal_I2C lcd(0x27, 16, 2);

// --------------------------------------------------------------------
// 3. WIFI CREDENTIALS (As per project specifications)
// --------------------------------------------------------------------
const char* ssid     = "Himanshu";
const char* password = "Himanshu1209";

// --------------------------------------------------------------------
// 4. LOCATION DETAILS (Keep it blank - add it later)
// --------------------------------------------------------------------
const char* LATITUDE  = "21.1463"; // Leave blank, add later (e.g. "21.1458")
const char* LONGITUDE = "79.0849"; // Leave blank, add later (e.g. "79.0882")

// --------------------------------------------------------------------
// 5. RENDER URL (Keep it blank - add after deployment)
// --------------------------------------------------------------------
// Example once deployed: "https://flood-monitoring-system.onrender.com"
const char* RENDER_URL = "https://flood-monitoring-system-7chj.onrender.com"; 

// --------------------------------------------------------------------
// 6. THRESHOLD VALUES (3 levels according to specifications)
// --------------------------------------------------------------------
const int THRESHOLD_SAFE    = 15; // Water level <= 15 cm is SAFE
const int THRESHOLD_WARNING = 25; // Water level 16 - 25 cm is WARNING
// Water level > 25 cm is DANGER (Triggers Danger signs, buzzer beeps & LED)

// Global Variables
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 10000; // 10 seconds

// Server Response Cache
String serverLine1 = "Flood Monitoring";
String serverLine2 = "System";
String serverWaterVal = "5 cm.";
String serverStatus = "Safe";
String serverLedState = "OFF";
bool serverBuzzerAlert = false;

// Function Prototypes
float measureWaterLevel();
bool readRainSensor();
void sendDataToServer(float waterLevel, bool isRaining);
void triggerBuzzerAlert();
void displayOnLCD(const String& r1, const String& r2);

// --------------------------------------------------------------------
// SETUP
// --------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n--- Flood Monitoring System Initializing ---");

  // Pin Configurations
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_RAIN, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED, OUTPUT);

  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_LED, LOW);

  // Initialize I2C with D2 (SDA) and D1 (SCL)
  Wire.begin(D2, D1);
  lcd.init();
  lcd.backlight();
  lcd.clear();

  // ------------------------------------------------
  // Required LCD Sequence in Setup:
  // R1: MyProject
  // R2: WELCOME
  // delay(3S)
  // ------------------------------------------------
  displayOnLCD("MyProject", "WELCOME");
  delay(3000);

  // ------------------------------------------------
  // R1: CONNECTING TO
  // R2: WiFi.........
  // ------------------------------------------------
  displayOnLCD("CONNECTING TO", "WiFi.........");
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 25) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }

  // ------------------------------------------------
  // R1: CONNECTED TO
  // R2: WiFi...SUCCESS
  // ------------------------------------------------
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    displayOnLCD("CONNECTED TO", "WiFi...SUCCESS");
  } else {
    Serial.println("\nWiFi Connection Pending / AP not found");
    displayOnLCD("WiFi CONNECT", "STANDBY MODE");
  }
  delay(2000);
}

// --------------------------------------------------------------------
// LOOP
// --------------------------------------------------------------------
void loop() {
  // Read Sensors
  float waterLevelCm = measureWaterLevel();
  bool isRaining = readRainSensor();

  // Send Details to Server Every 10 Seconds & Fetch Server Data
  unsigned long currentMillis = millis();
  if (currentMillis - lastSendTime >= SEND_INTERVAL || lastSendTime == 0) {
    lastSendTime = currentMillis;
    if (WiFi.status() == WL_CONNECTED && strlen(RENDER_URL) > 0) {
      sendDataToServer(waterLevelCm, isRaining);
    } else {
      // Fallback local calculation when offline or Render URL pending
      serverWaterVal = String((int)waterLevelCm) + " cm.";
      if (waterLevelCm > THRESHOLD_WARNING) {
        serverStatus = "Danger";
        serverBuzzerAlert = true;
        serverLedState = "ON";
      } else if (waterLevelCm > THRESHOLD_SAFE) {
        serverStatus = "Warning";
        serverBuzzerAlert = false;
        serverLedState = "OFF";
      } else {
        serverStatus = "Safe";
        serverBuzzerAlert = false;
        serverLedState = "OFF";
      }
    }
  }

  // Actuate LED according to server or danger state
  if (serverLedState == "ON" || serverBuzzerAlert) {
    digitalWrite(PIN_LED, HIGH);
  } else {
    digitalWrite(PIN_LED, LOW);
  }

  // ------------------------------------------------
  // Display Sequence Required on 16x2 LCD:
  //
  // Step 1:
  // R1: Flood Monitoring
  // R2: System
  // delay(2s)
  // ------------------------------------------------
  displayOnLCD("Flood Monitoring", "System");
  if (serverBuzzerAlert) triggerBuzzerAlert();
  delay(2000);

  // ------------------------------------------------
  // Step 2:
  // R1: WaterLevel
  // R2: 5 cm. (or measured value)
  // delay(2s)
  // ------------------------------------------------
  displayOnLCD("WaterLevel", serverWaterVal);
  if (serverBuzzerAlert) triggerBuzzerAlert();
  delay(2000);

  // ------------------------------------------------
  // Step 3:
  // R1: Status
  // R2: Danger (or Safe / Warning)
  // delay(2s)
  // ------------------------------------------------
  displayOnLCD("Status", serverStatus);
  if (serverBuzzerAlert) {
    triggerBuzzerAlert();
    delay(1000);

    // Emergency Danger Pop Alert on LCD
    displayOnLCD("! DANGER ALERT !", "FLOOD THREAT HIGH");
    triggerBuzzerAlert();
    delay(1000);
  } else {
    delay(2000);
  }
}

// --------------------------------------------------------------------
// MEASURE WATER LEVEL (HC-SR04 in cm)
// --------------------------------------------------------------------
float measureWaterLevel() {
  // Clear the trigger
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);

  // Trigger 10us pulse
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  // Read Echo pulse duration in microseconds
  long duration = pulseIn(PIN_ECHO, HIGH, 30000); // 30ms timeout

  if (duration == 0) {
    // Sensor reading timeout / out of range
    return 5.0; // Default fallback sample
  }

  // Calculate distance in cm: Speed of sound = 340 m/s = 0.034 cm/us
  float distanceCm = (duration * 0.034) / 2.0;

  // For flood monitoring, you can either report distance directly as water depth,
  // or (TANK_HEIGHT - distanceCm). Here we detect depth in cm:
  return distanceCm;
}

// --------------------------------------------------------------------
// READ RAINDROP SENSOR (MH-RD Module)
// --------------------------------------------------------------------
bool readRainSensor() {
  // MH-RD Digital Output: LOW = Raindrop detected, HIGH = Dry
  int rainVal = digitalRead(PIN_RAIN);
  return (rainVal == LOW);
}

// --------------------------------------------------------------------
// SEND TELEMETRY & FETCH DETAILS FROM SERVER
// --------------------------------------------------------------------
void sendDataToServer(float waterLevel, bool isRaining) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure(); // Allow HTTPS without fingerprint verification on Render

  HTTPClient http;
  String endpoint = String(RENDER_URL) + "/api/telemetry";

  Serial.print("Sending telemetry to: ");
  Serial.println(endpoint);

  http.begin(client, endpoint);
  http.addHeader("Content-Type", "application/json");

  // Create JSON Payload
  StaticJsonDocument<256> doc;
  doc["waterLevel"] = waterLevel;
  doc["rainfall"]   = isRaining ? "Yes" : "No";
  doc["lat"]        = LATITUDE;
  doc["lon"]        = LONGITUDE;
  doc["district"]   = "Nagpur";

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);

  if (httpCode > 0) {
    Serial.printf("[HTTP] POST Response Code: %d\n", httpCode);
    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
      String response = http.getString();
      Serial.println("[HTTP] Server Response: " + response);

      StaticJsonDocument<512> resDoc;
      DeserializationError error = deserializeJson(resDoc, response);

      if (!error) {
        if (resDoc.containsKey("lcd")) {
          serverLine1      = resDoc["lcd"]["line1"].as<String>();
          serverLine2      = resDoc["lcd"]["line2"].as<String>();
          serverWaterVal   = resDoc["lcd"]["waterVal"].as<String>();
          serverStatus     = resDoc["lcd"]["statusVal"].as<String>();
        }
        if (resDoc.containsKey("led")) {
          serverLedState   = resDoc["led"].as<String>();
        }
        if (resDoc.containsKey("buzzer")) {
          serverBuzzerAlert = resDoc["buzzer"].as<bool>();
        }
      }
    }
  } else {
    Serial.printf("[HTTP] POST Failed, error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

// --------------------------------------------------------------------
// BUZZER ALERT (D3)
// --------------------------------------------------------------------
void triggerBuzzerAlert() {
  // Beep sequence on Buzzer Pin D3
  for (int i = 0; i < 2; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(100);
    digitalWrite(PIN_BUZZER, LOW);
    delay(80);
  }
}

// --------------------------------------------------------------------
// DISPLAY TEXT HELPER ON 16x2 LCD
// --------------------------------------------------------------------
void displayOnLCD(const String& r1, const String& r2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(r1.substring(0, 16));
  lcd.setCursor(0, 1);
  lcd.print(r2.substring(0, 16));
}
