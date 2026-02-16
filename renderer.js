const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

let assetsPath = path.join(__dirname, 'assets');
let configsPath = path.join(__dirname, 'configs');

if (!fs.existsSync(assetsPath)) {
    assetsPath = path.join(process.resourcesPath, 'assets');
}

if (!fs.existsSync(configsPath)) {
    configsPath = path.join(process.resourcesPath, 'configs');
}

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// Call this function whenever the skin image is updated to refresh the canvas for pixel checking
function updateCanvasImage() {
    const img = new Image();
    img.src = body.src; 
    
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        console.log("Canvas updated for pixel checking");
    };
}

/******************************************************/
/******************  Skin Management ******************/
/******************************************************/

console.log("Skin folder location:", assetsPath);

let skinList = [];
let currentSkinIndex = 0;

function loadSkins() {
  try {
    if (!fs.existsSync(assetsPath)) {
      console.error("assets folder does not exist!", assetsPath);
      return;
    }

    const files = fs.readdirSync(assetsPath);

    skinList = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
    });

    console.log("Loaded skins:", skinList);
  } catch (e) {
    console.error("Failed to load skins:", e);
  }
}

function loadSkin(name) {
  const skinPath = path.join(assetsPath, name);
  if (fs.existsSync(skinPath)) {
    body.src = skinPath;
    updateCanvasImage();
  } else {
    console.error("Skin file does not exist:", skinPath);
    alert("Skin file does not exist: " + skinPath);
    ipcRenderer.send('EXIT_APP');
  }
}


/********************************************************/
/******************  Config Management ******************/
/********************************************************/

async function saveConfig(config, name) {
  try {
    const appConfigPath = path.join(configsPath, 'app_configs');
    const jsonString = JSON.stringify(config, null, 2);
    const configPath = path.join(appConfigPath, name + '.json');
    await fs.promises.writeFile(configPath, jsonString);
  } catch (e) {
    console.error("Failed to save config:", e);
  }
}

function loadConfig(name) {
  try {
    const appConfigPath = path.join(configsPath, 'app_configs');
    const configPath = path.join(appConfigPath, name + '.json');

    const fileData = fs.readFileSync(configPath);
    const restoredConfig = JSON.parse(fileData);

    return restoredConfig;
  } catch (e) {
    console.error("Failed to load config:", e);
    return null;
  }
}

async function saveGeneralConfig(config, name) {
  try {
    const generalConfigPath = path.join(configsPath);
    const jsonString = JSON.stringify(config, null, 2);
    const configPath = path.join(generalConfigPath, name + '.json');
    await fs.promises.writeFile(configPath, jsonString);
  } catch (e) {
    console.error("Failed to save general config:", e);
  }
}

function loadGeneralConfig(name) {
  try {
    const generalConfigPath = path.join(configsPath);
    const configPath = path.join(generalConfigPath, name + '.json');
    const fileData = fs.readFileSync(configPath);
    const restoredConfig = JSON.parse(fileData);

    return restoredConfig;
  } catch (e) {
    console.error("Failed to load general config:", e);
    return null;
  }
}

let generalConfig = loadGeneralConfig('general_config');
if (!generalConfig) {
  alert("Failed to load general config, using default values and creating config file.");
  generalConfig = {
    window: {
      width: 400,
      height: 400,
      alwaysOnTop: true
    },
    appConfig: "default_config",
  };

  saveGeneralConfig(generalConfig, 'general_config');
}

let config = loadConfig(generalConfig.appConfig);

if (!config) {
  alert("Failed to load config, using default values and creating config file.");
  config = {
    image: "placeholder.webp", // Default skin image file name in assets folder
    scale: { 
      // Scale is calculated by (bass^pow)*amp + bias, then lerped with previous scale by lerpAmt
      base: 0.8,
      pow: 1.2,
      amp: 8.0,
      bias: -4.0
    },
    skew: {
      // Skew is calculated by (mid^pow)*amp, then lerped with previous skew by lerpAmt.
      // Direction is decided by data of a specific frequency bin (dirIdx)
      amp: 80,
      pow: 2.0,
      dirIdx: 15
    },
    rotate: {
      // Rotate is calculated by (high/255)*amp + bias, then lerped with previous rotate by lerpAmt.
      amp: 60,
      bias: -5
    },
    flip: {
      // When bass exceeds threshold, flip the image horizontally with a certain probability.
      threshold: 200,
      prob: 0.6
    },
    lerpAmt: {
      // How much the new calculated value affects the current value each frame (0~1). Higher is more responsive but less smooth.
      scale: 0.9,
      skew: 0.3,
      rotate: 0.2
    }
  };
  saveConfig(config, 'default_config');
}


/*************************************************/
/******************  Main Logic ******************/
/*************************************************/


const body = document.getElementById('dj-body');
let audioContext;
let analyser;
let dataArray;
let isRunning = false;

loadSkins();
loadSkin(config.image);
updateCanvasImage();
let currentScale = 1;
let currentSkew = 0;
let currentRotate = 0;

function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}

async function setupAudio() {
    try {
    console.log("1. Accessing main process for audio ources");
    
    // invoke main process to get desktop sources
    const sources = await ipcRenderer.invoke('GET_SOURCES');
    
    const source = sources[0]; 
    console.log("2. Received source ID:", source.id);

    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
        mandatory: {
            chromeMediaSource: 'desktop',
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
        }
        },
        video: {
        mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id 
        }
        }
    });
    
    // Audio Context Settings
    audioContext = new AudioContext();
    const src = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256; 
    
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    src.connect(analyser);

    isRunning = true;
    body.classList.remove("inactive");
    body.classList.add("active");
    
    renderLoop();

    } catch (e) {
    console.error(e);
    body.classList.remove("active");
    body.classList.add("inactive");

    alert("Error: " + e.message);
    }
}

let flipX = 1; 

// 2. Render Loop
function renderLoop() {
    if (!isRunning) return;

    requestAnimationFrame(renderLoop);

    // Get Frequency Data of current frame's audio into dataArray
    analyser.getByteFrequencyData(dataArray);

    // A. Bass: 0~4
    let bass = 0;
    for (let i = 0; i < 4; i++) bass += dataArray[i];
    bass = bass / 4;

    // B. Mid: 10~20
    let mid = 0;
    for (let i = 10; i < 20; i++) mid += dataArray[i];
    mid = mid / 10;

    // C. High: 80~120
    let high = 0;
    for (let i = 80; i < 120; i++) high += dataArray[i];
    high = high / 40;

    // Visualization Logic
    const scaleBase = config.scale.base;
    const scalePow = config.scale.pow;
    const scaleAmp = config.scale.amp;
    const scaleBias = config.scale.bias;

    const skewAmp = config.skew.amp;
    const skewPow = config.skew.pow;
    const skewDirIdx = config.skew.dirIdx;

    const rotateAmp = config.rotate.amp;
    const rotateBias = config.rotate.bias;

    const flipThreshold = config.flip.threshold;
    const flipProb = config.flip.prob;

    const lerpAmtScale = config.lerpAmt.scale;
    const lerpAmtSkew = config.lerpAmt.skew;
    const lerpAmtRotate = config.lerpAmt.rotate;

    let scaleVal = Math.max(Math.pow((bass / 255), scalePow) * scaleAmp + scaleBias, scaleBase);

    let skewVal = Math.pow(mid / 255, skewPow) * skewAmp;
    if (dataArray[skewDirIdx] % 2 === 0) skewVal = -skewVal;

    let rotateVal = (high / 255) * rotateAmp + rotateBias;

    currentScale  = lerp(currentScale, scaleVal, lerpAmtScale);
    currentSkew   = lerp(currentSkew, skewVal, lerpAmtSkew);
    currentRotate = lerp(currentRotate, rotateVal, lerpAmtRotate);


    if (bass > flipThreshold && Math.random() > flipProb) {
        flipX *= -1; // flipped if -1
    }

    // CSS Update (Draw Call)
    body.style.transform = `
        scale(${currentScale * flipX}, ${currentScale}) 
        skewX(${currentSkew}deg) 
        rotate(${currentRotate}deg)
    `;
}

let isShift = false;
let isIgnoreMouse = false;

let isRightDown = false;
let isLeftDown = false;
let startX = 0;
let startY = 0;
let isDragging = false;


// Exit on escape key
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        ipcRenderer.send('EXIT_APP');
    }

    if (e.key === 'Shift') {
        isShift = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') {
        isShift = false;
    }
});

window.addEventListener('mousedown', (e) => {
  startX = e.screenX;
  startY = e.screenY;

  if (e.button === 0) {
    isLeftDown = true;

    isDragging = false;
  }
  if (e.button === 2) { // 2번이 우클릭
    console.log("Right mouse down");
    isRightDown = true;
    
    isDragging = false; 
  }
});

window.addEventListener('mousemove', (e) => {

  // If dragging
    if (isLeftDown || isRightDown) {
        const deltaX = e.screenX - startX;
        const deltaY = e.screenY - startY;

        if (!isDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
            isDragging = true;
        }

        if (isDragging) {
            // when dragging, disable ignore mouse
            if (isIgnoreMouse) {
                ipcRenderer.send('SET_IGNORE_MOUSE_EVENTS', false);
                isIgnoreMouse = false;
            }

            if (isRightDown) {
                // Right drag: resize window
                ipcRenderer.send('RESIZE_WINDOW', { deltaX });
            } else if (isLeftDown) {
                // Left drag: move window
                ipcRenderer.send('MOVE_WINDOW', { deltaX, deltaY });
            }
            
            startX = e.screenX;
            startY = e.screenY;
        }
        return; 
    }

    // If not dragging, check pixel transparency for click-through
    const rect = body.getBoundingClientRect();
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate scale factors
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Calculate pixel coordinate with CSS scaling
    const pixelX = Math.floor(x * scaleX);
    const pixelY = Math.floor(y * scaleY);

    // Read Pixel Data
    try {
        const pixelData = ctx.getImageData(pixelX, pixelY, 1, 1).data;
        const alpha = pixelData[3];

        if (alpha < 10) { 
            ipcRenderer.send('SET_IGNORE_MOUSE_EVENTS', true, { forward: true });
            
            body.style.cursor = 'default'; 
        } else {
            ipcRenderer.send('SET_IGNORE_MOUSE_EVENTS', false);

            body.style.cursor = 'pointer'; 
        }
    } catch (err) {
        ipcRenderer.send('SET_IGNORE_MOUSE_EVENTS', false);
    }
});


window.addEventListener('mouseup', (e) => {
  if (e.button === 2) {
    isRightDown = false;
    
    setTimeout(() => {
        isDragging = false; 
    }, 10);
  }

  if (e.button === 0) {
    isLeftDown = false;
    
    // If not dragged, toggle settings
    setTimeout(() => {
        if (!isDragging) {
            if (!isRunning) setupAudio();
            else {
                isRunning = false;
                body.classList.remove("active");
                body.classList.add("inactive");
                body.style.transform = 'scale(1)';
                audioContext.close();
            }
        }
        isDragging = false; 
    }, 10);
  }
});

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (isDragging) {
    return;
  }

  // Shift + Right Click to change skin
  if (isShift) {
    loadSkins();

    if (skinList.length === 0) { return; }

    currentSkinIndex = (currentSkinIndex + 1) % skinList.length;
    body.src = path.join(assetsPath, skinList[currentSkinIndex]);
    updateCanvasImage();
  }
});