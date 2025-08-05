// public/app.js - VERSION CORRIGÉE AVEC CHARGEMENT ROBUSTE
const socket = io();
const stage = new Konva.Stage({
  container: 'canvas-container',
  width: window.innerWidth,
  height: window.innerHeight
});
const layer = new Konva.Layer();
stage.add(layer);

// Rendre stage disponible globalement pour BrushManager
window.stage = stage;

let currentTool  = 'brush';
let currentColor = document.querySelector('.color-btn.active').dataset.color;
let currentSize  = parseInt(document.getElementById('size-slider').value, 10);
let isDrawing    = false;
let lastLine;
let currentId;
let lastPanPos = null;
let isCreatingShape = false;
let shapePreview = null;
let shapeStartPos = null;

// === CHARGEMENT ROBUSTE DU BRUSH MANAGER ===
let brushManager = null;
let brushManagerRetryCount = 0;
const MAX_RETRY_COUNT = 10;

// Fonction d'initialisation robuste
function initBrushManager() {
  return new Promise((resolve, reject) => {
    const attemptInit = () => {
      if (typeof BrushManager !== 'undefined') {
        try {
          brushManager = new BrushManager('public', layer, socket);
          console.log('✅ BrushManager initialized successfully for public interface');
          resolve(brushManager);
        } catch (error) {
          console.error('❌ Error creating BrushManager:', error);
          reject(error);
        }
      } else {
        brushManagerRetryCount++;
        if (brushManagerRetryCount < MAX_RETRY_COUNT) {
          console.log(`⏳ BrushManager not ready, retry ${brushManagerRetryCount}/${MAX_RETRY_COUNT}...`);
          setTimeout(attemptInit, 200);
        } else {
          console.error('❌ BrushManager failed to load after max retries');
          reject(new Error('BrushManager unavailable'));
        }
      }
    };
    
    attemptInit();
  });
}

// Initialisation avec gestion d'erreur
let brushManagerReady = false;
initBrushManager()
  .then(() => {
    brushManagerReady = true;
  })
  .catch((error) => {
    console.error('BrushManager initialization failed:', error);
    brushManagerReady = false;
  });

// Fonction pour obtenir le BrushManager de façon sûre
function getBrushManager() {
  return brushManagerReady ? brushManager : null;
}

// === UTILITAIRES ===
function throttle(func, wait) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= wait) {
      lastTime = now;
      func.apply(this, args);
    }
  };
}

function generateId() {
  return 'shape_' + Date.now() + '_' + Math.round(Math.random() * 10000);
}

function getPressure(evt) {
  if (evt.originalEvent && evt.originalEvent.pressure !== undefined) {
    return Math.max(0.1, evt.originalEvent.pressure);
  }
  return 1;
}

function getPressureSize(pressure) {
  const minSize = Math.max(1, currentSize * 0.3);
  const maxSize = currentSize * 1.5;
  return minSize + (maxSize - minSize) * pressure;
}

const emitDrawingThrottled = throttle((data) => {
  socket.emit('drawing', data);
}, 50);

const emitTextureThrottled = throttle((data) => {
  socket.emit('texture', data);
}, 150);

// === INTERFACE UTILISATEUR ===

// Tool buttons
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTool = btn.id;
    
    const cursor = currentTool === 'pan' ? 'grab' : 'crosshair';
    stage.container().style.cursor = cursor;
    
    const shapesPanel = document.getElementById('shapes-palette');
    if (currentTool === 'shapes') {
      shapesPanel.style.display = 'flex';
    } else {
      shapesPanel.style.display = 'none';
    }
  });
});

// Gestion des formes simples
document.querySelectorAll('.shape-btn-mini').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.shape-btn-mini').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTool = 'shape-' + btn.dataset.shape;
  });
});

// Color selection
document.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-btn').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    currentColor = btn.dataset.color;
  });
});

// Size slider
document.getElementById('size-slider').addEventListener('input', e => {
  currentSize = parseInt(e.target.value, 10);
});

// Raccourci Ctrl+Z pour undo
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault();
    socket.emit('undo');
  }
});

// === ÉVÉNEMENTS DE DESSIN ===

stage.on('mousedown touchstart pointerdown', (evt) => {
  const pointer = stage.getPointerPosition();
  if (currentTool === 'pan') {
    lastPanPos = pointer;
    isDrawing = false;
    return;
  }
  
  const scenePos = {
    x: pointer.x - stage.x(),
    y: pointer.y - stage.y()
  };
  
  const pressure = getPressure(evt);
  const pressureSize = getPressureSize(pressure);
  
  if (currentTool === 'texture') {
    isDrawing = true;
    currentId = generateId();
    emitTextureThrottled({
      x: scenePos.x,
      y: scenePos.y,
      color: currentColor,
      size: pressureSize
    });
    createTextureEffect(scenePos.x, scenePos.y, currentColor, pressureSize);
    return;
  }

  // BRUSH ANIMÉS - Utilisation du BrushManager avec vérification robuste
  if (['neon', 'fire', 'electric', 'sparkles', 'watercolor', 'petals'].includes(currentTool)) {
    isDrawing = true;
    currentId = generateId();
    
    const manager = getBrushManager();
    if (manager) {
      manager.createAndEmitEffect(currentTool, scenePos.x, scenePos.y, currentColor, pressureSize);
    } else {
      console.warn('🔶 BrushManager not ready, using fallback for', currentTool);
      createSimpleFallbackEffect(scenePos.x, scenePos.y, currentColor, pressureSize);
    }
    return;
  }

  // Formes prédéfinies simples
  if (currentTool.startsWith('shape-')) {
    isCreatingShape = true;
    shapeStartPos = scenePos;
    return;
  }
  
  // Mode brush normal ou gomme
  isDrawing = true;
  currentId = generateId();
  
  lastLine = new Konva.Line({
    id: currentId,
    points: [scenePos.x, scenePos.y],
    stroke: currentTool === 'eraser' ? currentColor : currentColor,
    strokeWidth: pressureSize,
    globalCompositeOperation: currentTool === 'eraser' ? 'destination-out' : 'source-over',
    lineCap: 'round',
    lineJoin: 'round'
  });
  layer.add(lastLine);
  layer.batchDraw();
});

stage.on('mousemove touchmove pointermove', (evt) => {
  const pointer = stage.getPointerPosition();
  if (currentTool === 'pan' && lastPanPos) {
    const dx = pointer.x - lastPanPos.x;
    const dy = pointer.y - lastPanPos.y;
    stage.x(stage.x() + dx);
    stage.y(stage.y() + dy);
    stage.batchDraw();
    lastPanPos = pointer;
    return;
  }
  
  if (!isDrawing) return;
  
  const scenePos = {
    x: pointer.x - stage.x(),
    y: pointer.y - stage.y()
  };
  
  const pressure = getPressure(evt);
  const pressureSize = getPressureSize(pressure);
  
  if (currentTool === 'texture') {
    emitTextureThrottled({
      x: scenePos.x,
      y: scenePos.y,
      color: currentColor,
      size: pressureSize
    });
    createTextureEffect(scenePos.x, scenePos.y, currentColor, pressureSize);
    return;
  }

  // BRUSH ANIMÉS - Continuer l'effet avec BrushManager
  if (['neon', 'fire', 'electric', 'sparkles', 'watercolor', 'petals'].includes(currentTool)) {
    const manager = getBrushManager();
    if (manager) {
      manager.createAndEmitEffect(currentTool, scenePos.x, scenePos.y, currentColor, pressureSize);
    } else {
      createSimpleFallbackEffect(scenePos.x, scenePos.y, currentColor, pressureSize);
    }
    return;
  }
  
  // Mode brush normal ou gomme
  if (lastLine) {
    lastLine.points(lastLine.points().concat([scenePos.x, scenePos.y]));
    lastLine.strokeWidth(pressureSize);
    layer.batchDraw();
    
    emitDrawingThrottled({
      id: currentId,
      points: lastLine.points(),
      stroke: lastLine.stroke(),
      strokeWidth: pressureSize,
      globalCompositeOperation: lastLine.globalCompositeOperation()
    });
  }
});

stage.on('mouseup touchend pointerup', () => {
  if (currentTool === 'pan') {
    lastPanPos = null;
    return;
  }

  if (isCreatingShape && shapePreview) {
    shapePreview.opacity(1);
    const shapeId = generateId();
    shapePreview.id(shapeId);
    
    socket.emit('shapeCreate', {
      id: shapeId,
      type: currentTool,
      config: shapePreview.getAttrs()
    });

    isCreatingShape = false;
    shapeStartPos = null;
    shapePreview = null;
    return;
  }

  if (!isDrawing) return;
  isDrawing = false;
  
  // Les brush animés et texture n'ont pas besoin d'événement final
  if (currentTool === 'texture' || ['neon', 'fire', 'electric', 'sparkles', 'watercolor', 'petals'].includes(currentTool)) {
    return;
  }
  
  if (lastLine) {
    socket.emit('draw', {
      id: currentId,
      points: lastLine.points(),
      stroke: lastLine.stroke(),
      strokeWidth: lastLine.strokeWidth(),
      globalCompositeOperation: lastLine.globalCompositeOperation()
    });
  }
});

// === EFFET TEXTURE (ancien système) ===
function createTextureEffect(x, y, color, size) {
  for (let i = 0; i < 5; i++) {
    const offsetX = (Math.random() - 0.5) * 10;
    const offsetY = (Math.random() - 0.5) * 10;
    const alpha = 0.3 + Math.random() * 0.3;
    const dot = new Konva.Line({
      points: [
        x + offsetX,
        y + offsetY,
        x + offsetX + Math.random() * 2,
        y + offsetY + Math.random() * 2
      ],
      stroke: color,
      strokeWidth: 1 + Math.random() * (size / 3),
      globalAlpha: alpha,
      lineCap: 'round',
      lineJoin: 'round'
    });
    layer.add(dot);
  }
  layer.batchDraw();
}

// === FALLBACK SIMPLE POUR LES BRUSH ANIMÉS ===
function createSimpleFallbackEffect(x, y, color, size) {
  const circle = new Konva.Circle({
    x: x,
    y: y,
    radius: size,
    fill: color,
    opacity: 0.6
  });
  layer.add(circle);
  
  // Animation simple de disparition
  circle.to({
    radius: size * 2,
    opacity: 0,
    duration: 1,
    onFinish: () => {
      circle.destroy();
    }
  });
  
  layer.batchDraw();
}

// === SOCKET LISTENERS ===

// Initialize existing shapes on load
socket.on('initShapes', shapes => {
  shapes.forEach(data => {
    const line = new Konva.Line({
      id: data.id,
      points: data.points,
      stroke: data.stroke,
      strokeWidth: data.strokeWidth,
      globalCompositeOperation: data.globalCompositeOperation,
      lineCap: 'round',
      lineJoin: 'round'
    });
    layer.add(line);
  });
  layer.draw();
});

// Écouter les brush effects des autres utilisateurs
socket.on('brushEffect', (data) => {
  const manager = getBrushManager();
  if (manager) {
    manager.createNetworkEffect(data);
  } else {
    console.warn('🔶 BrushManager not ready for network effect, skipping');
  }
});

// Nettoyage des effets d'un utilisateur déconnecté
socket.on('cleanupUserEffects', (data) => {
  const manager = getBrushManager();
  if (manager) {
    manager.cleanupUserEffects(data.socketId);
  }
});

// Socket listeners existants
socket.on('drawing', data => {
  let shape = layer.findOne('#' + data.id);
  if (shape) {
    shape.points(data.points);
  } else {
    const line = new Konva.Line({
      id: data.id,
      points: data.points,
      stroke: data.stroke,
      strokeWidth: data.strokeWidth,
      globalCompositeOperation: data.globalCompositeOperation,
      lineCap: 'round',
      lineJoin: 'round'
    });
    layer.add(line);
  }
  layer.batchDraw();
});

socket.on('texture', data => {
  createTextureEffect(data.x, data.y, data.color, data.size);
});

socket.on('draw', data => {
  let shape = layer.findOne('#' + data.id);
  if (shape) {
    shape.points(data.points);
    shape.stroke(data.stroke);
    shape.strokeWidth(data.strokeWidth);
    shape.globalCompositeOperation(data.globalCompositeOperation);
  } else {
    const line = new Konva.Line({
      id: data.id,
      points: data.points,
      stroke: data.stroke,
      strokeWidth: data.strokeWidth,
      globalCompositeOperation: data.globalCompositeOperation,
      lineCap: 'round',
      lineJoin: 'round'
    });
    layer.add(line);
  }
  layer.draw();
});

socket.on('deleteShape', ({ id }) => {
  const shape = layer.findOne('#' + id);
  if (shape) {
    shape.destroy();
    layer.draw();
  }
});

socket.on('clearCanvas', () => {
  layer.destroyChildren();
  // Utiliser le BrushManager pour nettoyer les traces permanentes si disponible
  const manager = getBrushManager();
  if (manager) {
    manager.clearPermanentTraces();
  }
  layer.draw();
});

socket.on('restoreShapes', (shapes) => {
  layer.destroyChildren();
  // Utiliser le BrushManager pour nettoyer les traces permanentes si disponible
  const manager = getBrushManager();
  if (manager) {
    manager.clearPermanentTraces();
  }
  
  shapes.forEach(data => {
    const line = new Konva.Line({
      id: data.id,
      points: data.points,
      stroke: data.stroke,
      strokeWidth: data.strokeWidth,
      globalCompositeOperation: data.globalCompositeOperation,
      lineCap: 'round',
      lineJoin: 'round'
    });
    layer.add(line);
  });
  layer.draw();
});

socket.on('shapeCreate', data => {
  let shape;
  const config = data.config;
  
  switch(data.type) {
    case 'shape-circle':
      shape = new Konva.Circle(config);
      break;
    case 'shape-rectangle':
      shape = new Konva.Rect(config);
      break;
    case 'shape-line':
    case 'shape-arrow':
      shape = new Konva.Line(config);
      break;
  }
  
  if (shape) {
    shape.id(data.id);
    layer.add(shape);
    layer.draw();
  }
});

console.log('✅ App.js loaded for public interface');