const serviceUUID = "19b10000-e8f2-537e-4f6c-d104768a1214";
const charUUID = "19b10001-e8f2-537e-4f6c-d104768a1214";

const connectBtn = document.getElementById('connectBtn');
const calibrateBtn = document.getElementById('calibrateBtn');
const statusText = document.getElementById('statusText');
const sensorDataContainer = document.getElementById('sensorData');
const canvas = document.getElementById('spineCanvas');
const ctx = canvas.getContext('2d');

let device;
let server;
let characteristic;
let rawSensorValue = 0;
let calibrationOffset = 0; // The raw value when arm is straight
let currentAngle = 0; // In degrees, 0 = straight

// Visualization parameters
const armLength = 150;
const armWidth = 40;

// Resize canvas to fit container
function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    drawArm();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

connectBtn.addEventListener('click', async () => {
    if (device && device.gatt.connected) {
        disconnect();
    } else {
        connect();
    }
});

calibrateBtn.addEventListener('click', () => {
    calibrate();
});

async function connect() {
    try {
        statusText.textContent = "Requesting Bluetooth Device...";
        device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [serviceUUID] }]
        });

        device.addEventListener('gattserverdisconnected', onDisconnected);

        statusText.textContent = "Connecting to GATT Server...";
        server = await device.gatt.connect();

        statusText.textContent = "Getting Service...";
        const service = await server.getPrimaryService(serviceUUID);

        statusText.textContent = "Getting Characteristic...";
        characteristic = await service.getCharacteristic(charUUID);

        statusText.textContent = "Starting Notifications...";
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', handleNotifications);

        statusText.textContent = "Connected";
        statusText.classList.add('connected');
        connectBtn.textContent = "Disconnect";
        calibrateBtn.disabled = false;

    } catch (error) {
        console.error('Connection failed!', error);
        statusText.textContent = "Connection Failed: " + error.message;
    }
}

function disconnect() {
    if (device) {
        if (device.gatt.connected) {
            device.gatt.disconnect();
        }
    }
}

function onDisconnected(event) {
    const device = event.target;
    statusText.textContent = "Disconnected";
    statusText.classList.remove('connected');
    connectBtn.textContent = "Connect to Elbow Tracker";
    calibrateBtn.disabled = true;
    console.log(`Device ${device.name} is disconnected.`);
}

function handleNotifications(event) {
    const value = event.target.value;
    // We expect 5 bytes, first 2 are raw 10-bit value
    const highByte = value.getUint8(0);
    const lowByte = value.getUint8(1);

    rawSensorValue = (highByte << 8) | lowByte;

    // Calculate angle based on calibration
    // Assuming bending INCREASES resistance -> DECREASES voltage -> DECREASES analog reading (or vice versa)
    // Let's assume standard flex sensor: Bend = Higher Resistance.
    // Voltage Divider: Vout = Vcc * (R_flex / (R_fixed + R_flex)) -> Bend = Higher Voltage -> Higher ADC
    // OR Vout = Vcc * (R_fixed / (R_fixed + R_flex)) -> Bend = Lower Voltage -> Lower ADC

    // We will assume deviation from calibration offset maps to angle.
    // Let's assume a range of +/- 300 units corresponds to 90 degrees.
    // If raw < offset, it might be bending one way.

    const diff = rawSensorValue - calibrationOffset;

    // Map diff to angle. 
    // Sensitivity factor: degrees per unit change.
    // Let's guess: 300 units = 90 degrees -> 0.3 degrees/unit
    const sensitivity = 0.3;

    // We clamp the angle between 0 (straight) and 140 (fully bent)
    // We take absolute value of diff because we don't know direction yet, 
    // but usually user bends in one direction.
    // If calibration is "straight", any bend is an increase in angle.

    currentAngle = Math.abs(diff * sensitivity);
    currentAngle = Math.min(Math.max(currentAngle, 0), 140);

    updateSensorDisplay();
    drawArm();
}

function calibrate() {
    calibrationOffset = rawSensorValue;
    console.log("Calibrated! Offset:", calibrationOffset);
    alert("Calibration set! Arm is now considered straight.");
}

function updateSensorDisplay() {
    sensorDataContainer.innerHTML = `
        <span>Raw: ${rawSensorValue}</span>
        <span>Offset: ${calibrationOffset}</span>
        <span>Angle: ${currentAngle.toFixed(1)}°</span>
    `;
}

function drawArm() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const startX = canvas.width / 2;
    const startY = canvas.height / 2 + 100;

    // Draw Upper Arm (Fixed, vertical)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = armWidth;
    ctx.strokeStyle = '#cbd5e1'; // Bone color

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX, startY - armLength);
    ctx.stroke();

    // Draw Forearm (Rotating)
    // Pivot point is (startX, startY - armLength)
    const pivotX = startX;
    const pivotY = startY - armLength;

    // Calculate end point of forearm
    // Angle 0 = Straight up (same as upper arm)
    // Angle 90 = Horizontal
    // We subtract angle because canvas Y increases downwards, but we want to rotate "down" or "forward"
    // Actually, let's say 0 is straight up (-PI/2).
    // Bending increases angle towards horizontal.

    const rad = (currentAngle * Math.PI) / 180;
    const forearmAngle = -Math.PI / 2 + rad; // Start pointing up, rotate clockwise

    const endX = pivotX + Math.cos(forearmAngle) * armLength;
    const endY = pivotY + Math.sin(forearmAngle) * armLength;

    ctx.strokeStyle = '#94a3b8'; // Forearm color
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw Elbow Joint
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, armWidth / 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Draw Hand
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(endX, endY, armWidth / 1.8, 0, Math.PI * 2);
    ctx.fill();
}

// Initial draw
drawArm();
