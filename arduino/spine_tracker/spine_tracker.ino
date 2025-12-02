/*
  Elbow Flexion Tracker Firmware
  Board: Arduino Nano 33 BLE

  Reads 1 flex sensor connected to analog pin A0.
  Sends RAW 10-bit sensor data via BLE.
  Calibration is handled by the client (Web App).

  Circuit:
  - 1 x Flex Sensor on Pin A0
  - 1 x 10k Ohm Resistor (Voltage Divider)
  - VCC (3.3V) and GND
*/

#include <ArduinoBLE.h>

// BLE Service UUID
const char *serviceUUID = "19B10000-E8F2-537E-4F6C-D104768A1214";
// BLE Characteristic UUID (Read | Notify)
const char *charUUID = "19B10001-E8F2-537E-4F6C-D104768A1214";

BLEService spineService(serviceUUID);
BLECharacteristic spineDataChar(charUUID, BLERead | BLENotify,
                                5); // Keeping 5 bytes for compatibility

const int sensorPin = A0;
uint8_t sensorValues[5];

void setup() {
  Serial.begin(9600);

  if (!BLE.begin()) {
    Serial.println("starting BLE failed!");
    while (1)
      ;
  }

  BLE.setLocalName("ElbowTracker");
  BLE.setAdvertisedService(spineService);

  spineService.addCharacteristic(spineDataChar);
  BLE.addService(spineService);

  BLE.advertise();

  Serial.println("Bluetooth device active, waiting for connections...");
}

void loop() {
  BLEDevice central = BLE.central();

  if (central) {
    Serial.print("Connected to central: ");
    Serial.println(central.address());

    while (central.connected()) {
      readSensor();
      spineDataChar.writeValue(sensorValues, 5);
      delay(50); // 20Hz update rate
    }

    Serial.print("Disconnected from central: ");
    Serial.println(central.address());
  }
}

void readSensor() {
  int rawValue = analogRead(sensorPin);

  // Send raw 10-bit value (0-1023) split into 2 bytes
  // Byte 0: High byte
  // Byte 1: Low byte
  sensorValues[0] = (rawValue >> 8) & 0xFF;
  sensorValues[1] = rawValue & 0xFF;

  // Fill the rest with 0
  for (int i = 2; i < 5; i++) {
    sensorValues[i] = 0;
  }

  // Debug print
  Serial.print("Raw: ");
  Serial.println(rawValue);
}
