/*
  Elbow Flexion Tracker Firmware
  Board: Arduino Uno
  Module: Bluetooth v3.0 (HC-05/HC-06)

  Reads 1 flex sensor connected to analog pin A0.
  Sends RAW 10-bit sensor data via Bluetooth Serial (SoftwareSerial).
  Calibration is handled by the client (Web App).

  Circuit:
  - 1 x Flex Sensor on Pin A0
  - 1 x 10k Ohm Resistor (Voltage Divider)
  - Bluetooth Module (HC-05/HC-06):
    - TX -> Pin 10 (Arduino RX)
    - RX -> Pin 11 (Arduino TX) - Use Voltage Divider (2k/1k)
    - VCC -> 5V or 3.3V (Check module specs)
    - GND -> GND
*/

#include <SoftwareSerial.h>

// RX on Pin 10, TX on Pin 11
SoftwareSerial BTSerial(10, 11);

const int sensorPin = A0;

void setup() {
  // Initialize USB Serial for debugging
  Serial.begin(9600);

  // Initialize Bluetooth Serial
  BTSerial.begin(9600);

  Serial.println("Elbow Tracker Started");
  Serial.println("Waiting for Bluetooth Connection on HC-05...");
}

void loop() {
  readSensor();
  delay(50); // 20Hz update rate
}

void readSensor() {
  int rawValue = analogRead(sensorPin);

  // Send raw value followed by newline
  // Protocol: ASCII line, e.g., "512\r\n"
  BTSerial.println(rawValue);

  // Optional: Print to USB Serial for debugging
  // Serial.println(rawValue);
}
