const valRaw = document.getElementById('val-raw');
const valOffset = document.getElementById('val-offset');
const valAngle = document.getElementById('val-angle');

const connectBtn = document.getElementById('connectBtn');
const calibrateBtn = document.getElementById('calibrateBtn');
const statusText = document.getElementById('status');
const canvas = document.getElementById('armCanvas');
const ctx = canvas.getContext('2d');

const bufferSize = 5;
let sensorBuffer = [];

let port;
let reader;
let keepReading = false;

let rawSensorValue = 0;
let calibrationOffset = 0;
let currentAngle = 0;
let targetAngle = 0; // For smooth animation

// Visualization parameters
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial call

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
            statusText.textContent = "Requesting Port...";
            port = await navigator.serial.requestPort();

            statusText.textContent = "Opening...";
            await port.open({ baudRate: 9600 });

            statusText.textContent = "Connected";
            statusText.classList.add('connected');
            connectBtn.textContent = "Disconnect";
            calibrateBtn.disabled = false;

            keepReading = true;
            readSerialLoop();
            animate(); // Start animation loop
        } else {
            statusText.textContent = "Web Serial not supported.";
        }
    } catch (error) {
        console.error(error);
        statusText.textContent = "Failed: " + error.message;
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
}

class LineBreakTransformer {
    constructor() {
        this.container = '';
    }

    transform(chunk, controller) {
        this.container += chunk;
        const lines = this.container.split('\r\n');
        this.container = lines.pop();
        lines.forEach(line => controller.enqueue(line));
    }

    flush(controller) {
        controller.enqueue(this.container);
    }
}

async function readSerialLoop() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable
        .pipeThrough(new TransformStream(new LineBreakTransformer()))
        .getReader();

    try {
        while (keepReading) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) handleSerialData(value);
        }
    } catch (error) {
        console.error(error);
    } finally {
        reader.releaseLock();
    }
}

function handleSerialData(dataString) {
    const raw = parseInt(dataString.trim());
    if (isNaN(raw)) return;

    sensorBuffer.push(raw);
    if (sensorBuffer.length > bufferSize) sensorBuffer.shift();

    const avgRaw = sensorBuffer.reduce((a, b) => a + b, 0) / sensorBuffer.length;
    rawSensorValue = Math.round(avgRaw);

    const diff = rawSensorValue - calibrationOffset;
    const sensitivity = 0.3;

    // Target for animation interlpolation
    let angle = Math.abs(diff * sensitivity);
    targetAngle = Math.min(Math.max(angle, 0), 140);

    updateSensorDisplay();
}

function calibrate() {
    calibrationOffset = rawSensorValue;
    alert("Calibration Set!");
}

function updateSensorDisplay() {
    valRaw.textContent = rawSensorValue;
    valOffset.textContent = calibrationOffset;
    valAngle.textContent = currentAngle.toFixed(1) + "°";
}

// --- VISUALIZATION ENGINE ---

function getColorForAngle(angle) {
    // 0-45: Green/Blue (Safe)
    // 45-90: Orange (Warning)
    // 90+: Red (Danger)
    if (angle < 45) return '#0ea5e9'; // Blue
    if (angle < 90) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
}

function animate() {
    if (!keepReading) return;

    // Smooth interpolation (Lerp)
    currentAngle = currentAngle + (targetAngle - currentAngle) * 0.1;

    drawScene();
    requestAnimationFrame(animate);
}

function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 50;
    const scale = Math.min(canvas.width, canvas.height) / 500; // Responsive scale

    const pivotX = cx;
    const pivotY = cy;

    const upperArmLength = 120 * scale;
    const forearmLength = 120 * scale;
    const thickness = 25 * scale;

    const activeColor = getColorForAngle(currentAngle);

    // --- 1. Draw Gauge Arc ---
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, upperArmLength * 1.5, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 10 * scale;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Active Gauge
    const gaugeStart = Math.PI + Math.PI / 2; // Start from top (vertical)
    // Map angle 0-140 to gauge. 0 deg = vertical. 140 deg = horizontal-ish
    // Let's visualize flexion: 0 is straight arm (vertical). 
    // We want the gauge to fill as angle increases.
    const gaugeEnd = gaugeStart + (currentAngle * Math.PI / 180);

    ctx.beginPath();
    ctx.arc(pivotX, pivotY, upperArmLength * 1.5, gaugeStart, gaugeEnd, false);
    ctx.strokeStyle = activeColor;
    ctx.shadowColor = activeColor;
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset

    // --- 2. Draw Upper Arm (Fixed Vertical) ---
    // Function to draw a capsule/bone shape

    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(Math.PI); // Point Up

    // Draw Bone Styles
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = 2;

    // Upper Arm Shape
    ctx.beginPath();
    ctx.roundRect(-thickness / 2, 0, thickness, upperArmLength, 10);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // --- 3. Draw Forearm (Rotates) ---

    ctx.save();
    ctx.translate(pivotX, pivotY);
    // Rotate based on angle. -PI/2 is straight up. 
    // Adding angle rotates it "down" (flexion)
    const rotation = -Math.PI + (currentAngle * Math.PI / 180);
    ctx.rotate(rotation);

    // Forearm Shape
    ctx.beginPath();
    ctx.roundRect(-thickness / 2, 0, thickness, forearmLength, 10);
    ctx.fillStyle = '#475569';
    ctx.fill();

    // Add "Neon" Core to forearm
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(0, forearmLength - 10);
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = 4 * scale;
    ctx.lineCap = 'round';
    ctx.shadowColor = activeColor;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();

    // --- 4. Draw Joint (Elbow) ---
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, thickness * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner Glow Dot
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, thickness * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = activeColor;
    ctx.shadowColor = activeColor;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    // --- 5. Draw Angle Text near elbow ---
    ctx.font = `bold ${16 * scale}px 'Outfit', sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(currentAngle) + "°", pivotX, pivotY + (40 * scale));

    // Request next frame if not in loop (for redundancy logic if needed, but handled by animate)
}

// Initial draw
drawScene();
