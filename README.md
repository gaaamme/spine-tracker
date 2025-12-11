# Elbow Flexion Tracker (Premium Edition)

A professional-grade real-time elbow flexion tracking system using **Arduino Uno**, **Bluetooth Classic (HC-05)**, and a **Premium Web Visualization**.

## Overview
This project uses a flex sensor to measure elbow angle. Data is transmitted wirelessly via Bluetooth Serial to a high-end web dashboard featuring a cyberpunk/medical aesthetic, anatomical visualization, and real-time biomechanical feedback.

## ✨ Key Features
- **Premium "Cyberpunk/Medical" UI**: Dark mode, glassmorphism, neon accents, and fluid animations.
- **Anatomical Visualization**: Realistic stylized arm that morphs and rotates in sync with your movement.
- **Dynamic Biofeedback**:
    - **Blue (Safe)**: 0° - 45°
    - **Amber (Warning)**: 45° - 90°
    - **Red (Critical)**: >90°
- **Web Serial API**: Reliable low-latency connection via Chrome/Edge.
- **Instant Calibration**: One-click calibration for "straight arm" baseline.

## 🛠 Hardware Requirements
- **Microcontroller**: Arduino Uno (or compatible AVR board)
- **Bluetooth**: HC-05 or HC-06 Module (Bluetooth v3.0 / Classic)
- **Sensor**: Flex Sensor (Spectra Symbol or similar)
- **Components**:
    - 1x 10kΩ Resistor (Sensor Voltage Divider)
    - 1x 1kΩ & 1x 2kΩ Resistors (Bluetooth RX Voltage Divider - Optional but recommended)

## 🔌 Wiring Guide

| Component | Pin | Arduino Pin | Note |
| :--- | :--- | :--- | :--- |
| **Flex Sensor** | Pin 1 | **3.3V or 5V** | |
| **Flex Sensor** | Pin 2 | **A0** | Also connect 10kΩ resistor to GND |
| **HC-05 TX** | TX | **Pin 10** | Arduino RX (SoftwareSerial) |
| **HC-05 RX** | RX | **Pin 11** | Arduino TX (Use voltage divider if possible) |
| **HC-05 Power** | VCC | **5V** | Check your module specs |
| **HC-05 GND** | GND | **GND** | |

## 🚀 Setup & Installation

### 1. Arduino Firmware
1. Open `arduino/elbow_tracker/elbow_tracker.ino`.
2. Select Board: **Arduino Uno**.
3. Upload the sketch via USB.
    > **Note**: If upload fails, unplug the Bluetooth module temporarily.

### 2. Bluetooth Pairing (Windows)
1. Go to **Settings > Bluetooth & Devices**.
2. Click **Add Device > Bluetooth**.
3. Select your module (often named "HC-05", "Unknown", or "linvor").
4. Enter PIN: `1234` or `0000`.
5. This will create a **COM Port** (e.g., COM4, COM5).

### 3. Web Dashboard
1. You must run the app on a **Local Server** (Web Serial requirement).
    ```bash
    cd web-app
    npx serve .
    ```
2. Open `http://localhost:3000` in **Chrome** or **Edge**.
3. Click **CONNECT TO SERIAL**.
4. Select the **Bluetooth COM Port** (e.g., "Standard Serial over Bluetooth link (COM7)").
    > **Do NOT select COM3** (That is usually the USB cable).
5. Flex your arm!

## 🧪 Usage
1. **Connect**: Follow steps above.
2. **Calibrate**: Straighten your arm fully and click **CALIBRATE**. This sets the 0° baseline.
3. **Monitor**: Watch the arm animation and gauge. The color will change as you flex further.

## ⚠️ Compatibility
- **Supported**: Chrome, Edge, Opera (Desktop).
- **Not Supported**:
    - **Mobile**: Android/iOS (Web Serial over Bluetooth is limited on mobile).
    - **Firefox/Safari**: No Web Serial support yet.
