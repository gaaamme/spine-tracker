const sensorDataContainer = document.getElementById('sensorData');
const connectBtn = document.getElementById('connectBtn');
const calibrateBtn = document.getElementById('calibrateBtn');
const statusText = document.getElementById('status');
const canvas = document.getElementById('armCanvas');
const ctx = canvas.getContext('2d');

const bufferSize = 5; // Taille de la fenêtre de moyenne
let sensorBuffer = [];

let port;
let reader;
let keepReading = false;

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
    if (port && port.readable) {
        await disconnect();
    } else {
        await connect();
    }
});

calibrateBtn.addEventListener('click', () => {
    calibrate();
});

async function connect() {
    try {
        if ("serial" in navigator) {
            statusText.textContent = "Requesting Serial Port...";
            port = await navigator.serial.requestPort();

            statusText.textContent = "Opening Port...";
            await port.open({ baudRate: 9600 });

            statusText.textContent = "Connected";
            statusText.classList.add('connected');
            connectBtn.textContent = "Disconnect";
            calibrateBtn.disabled = false;

            keepReading = true;
            readSerialLoop();
        } else {
            statusText.textContent = "Web Serial API not supported in this browser.";
        }
    } catch (error) {
        console.error('Connection failed!', error);
        statusText.textContent = "Connection Failed: " + error.message;
    }
}

async function disconnect() {
    keepReading = false;
    if (reader) {
        await reader.cancel();
    }
    if (port) {
        await port.close();
        port = null;
    }
    onDisconnected();
}

function onDisconnected() {
    statusText.textContent = "Disconnected";
    statusText.classList.remove('connected');
    connectBtn.textContent = "Connect to Serial";
    calibrateBtn.disabled = true;
    console.log("Port closed.");
}

class LineBreakTransformer {
    constructor() {
        this.container = '';
    }

    transform(chunk, controller) {
        this.container += chunk;
        const lines = this.container.split('\r\n');
        this.container = lines.pop(); // Keep the rest (last partial line)
        lines.forEach(line => controller.enqueue(line));
    }

    flush(controller) {
        controller.enqueue(this.container);
    }
}

async function readSerialLoop() {
    // Pipe through TextDecoder and LineSplitter
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable
        .pipeThrough(new TransformStream(new LineBreakTransformer()))
        .getReader();

    try {
        while (keepReading) {
            const { value, done } = await reader.read();
            if (done) {
                // Reader has been canceled.
                break;
            }
            if (value) {
                handleSerialData(value);
            }
        }
    } catch (error) {
        console.error("Error reading from serial:", error);
    } finally {
        reader.releaseLock();
    }
}

function handleSerialData(dataString) {
    // Parse integer from string
    const raw = parseInt(dataString.trim());
    if (isNaN(raw)) return;

    // Ajoute la nouvelle valeur au buffer
    sensorBuffer.push(raw);
    if (sensorBuffer.length > bufferSize) {
        sensorBuffer.shift(); // Retire la plus ancienne valeur
    }

    // Calcule la moyenne des valeurs du buffer
    const avgRaw = sensorBuffer.reduce((a, b) => a + b, 0) / sensorBuffer.length;
    rawSensorValue = Math.round(avgRaw); // Utilise la moyenne filtrée

    // Calcul de l'angle
    const diff = rawSensorValue - calibrationOffset;
    const sensitivity = 0.3; //300 units = 90 degrees -> 0.3 degrees/unit

    currentAngle = Math.abs(diff * sensitivity);
    currentAngle = Math.min(Math.max(currentAngle, 0), 140);

    // console.log("Raw:", rawSensorValue, "Angle:", currentAngle); // Debug

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
