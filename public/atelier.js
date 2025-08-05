// public/atelier.js - VERSION SIMPLIFIÉE AVEC BRUSH MANAGER
const socket = io();
const stage = new Konva.Stage({
  container: 'canvas-container',
  width: window.innerWidth,
  height: window.innerHeight
});
const layer = new Konva.Layer();
stage.add(layer);

let currentTool = 'brush';
let currentColor = '#FF5252';
let currentSize = 4;
let isDrawing = false;
let lastLine;
let currentId;
let lastPanPos = null;
let currentZoom = 1;
let isCreatingShape = false;
let shapePreview = null;
let shapeStartPos = null;

// === INITIALISER LE BRUSH MANAGER (ATELIER = QUALITÉ ÉLEVÉE) ===
const brushManager = new BrushManager('atelier', layer, socket);

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

// Effet texture (ancien système)
function createTextureEffect(x, y, color, size) {
  for (let i = 0; i < 5; i++) {
    const offsetX = (Math.random() - 0.5) * 10;
    const offsetY = (Math.random() - 0.5) * 10;
    const alpha = 0.3 + Math.random() * 0.3;
    const dot = new Konva.Line({
      points: [x + offsetX, y + offsetY, x + offsetX + Math.random() * 2, y + offsetY + Math.random() * 2],
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

// === INTERFACE UTILISATEUR ===

// Gestion des outils
document.querySelectorAll('.tool-btn, .shape-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-btn, .shape-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTool = btn.id;
    updateCursor();
  });
});

function updateCursor() {
  const container = stage.container();
  switch(currentTool) {
    case 'pan':
      container.style.cursor = 'grab';
      break;
    case 'eyedropper':
      container.style.cursor = 'crosshair';
      break;
    default:
      container.style.cursor = 'crosshair';
  }
}

// Gestion des couleurs
document.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-btn').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    currentColor = btn.dataset.color;
    updateColorPicker();
  });
});

const colorPicker = document.getElementById('color-picker');
colorPicker.addEventListener('input', (e) => {
  currentColor = e.target.value;
  document.querySelectorAll('.color-btn').forEach(c => c.classList.remove('active'));
});

function updateColorPicker() {
  colorPicker.value = currentColor;
}

// Slider d'épaisseur
const sizeSlider = document.getElementById('size-slider');
const sizeDisplay = document.getElementById('size-display');
sizeSlider.addEventListener('input', (e) => {
  currentSize = parseInt(e.target.value, 10);
  sizeDisplay.textContent = currentSize + 'px';
});

// Zoom avec molette
stage.on('wheel', (e) => {
  e.evt.preventDefault();
  
  const scaleBy = 1.1;
  const stage = e.target.getStage();
  const pointer = stage.getPointerPosition();
  const mousePointTo = {
    x: (pointer.x - stage.x()) / stage.scaleX(),
    y: (pointer.y - stage.y()) / stage.scaleY(),
  };

  let direction = e.evt.deltaY > 0 ? -1 : 1;
  let newScale = stage.scaleX() * (scaleBy ** direction);
  
  newScale = Math.max(0.1, Math.min(5, newScale));
  
  stage.scale({ x: newScale, y: newScale });
  
  const newPos = {
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  };
  stage.position(newPos);
  stage.batchDraw();
  
  currentZoom = newScale;
  updateZoomDisplay();
});

// Boutons zoom
document.getElementById('zoom-in').addEventListener('click', () => {
  const newScale = Math.min(5, currentZoom * 1.2);
  stage.scale({ x: newScale, y: newScale });
  stage.batchDraw();
  currentZoom = newScale;
  updateZoomDisplay();
});

document.getElementById('zoom-out').addEventListener('click', () => {
  const newScale = Math.max(0.1, currentZoom / 1.2);
  stage.scale({ x: newScale, y: newScale });
  stage.batchDraw();
  currentZoom = newScale;
  updateZoomDisplay();
});

document.getElementById('reset-zoom').addEventListener('click', () => {
  stage.scale({ x: 1, y: 1 });
  stage.position({ x: 0, y: 0 });
  stage.batchDraw();
  currentZoom = 1;
  updateZoomDisplay();
});

function updateZoomDisplay() {
  document.getElementById('zoom-indicator').textContent = Math.round(currentZoom * 100) + '%';
}

// Pipette couleur
function pickColor(x, y) {
  const canvas = stage.toCanvas({ x: x, y: y, width: 1, height: 1 });
  const ctx = canvas.getContext('2d');
  const pixel = ctx.getImageData(0, 0, 1, 1).data;
  
  if (pixel[3] > 0) {
    const color = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
    currentColor = color;
    colorPicker.value = color;
    document.querySelectorAll('.color-btn').forEach(c => c.classList.remove('active'));
  }
}

// Fonctions pour créer des formes (simplifiées)
function createCircle(startPos, endPos) {
  const radius = Math.sqrt(Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2));
  return new Konva.Circle({
    x: startPos.x, y: startPos.y, radius: radius,
    stroke: currentColor, strokeWidth: currentSize, fill: 'transparent'
  });
}

function createRectangle(startPos, endPos) {
  return new Konva.Rect({
    x: Math.min(startPos.x, endPos.x), y: Math.min(startPos.y, endPos.y),
    width: Math.abs(endPos.x - startPos.x), height: Math.abs(endPos.y - startPos.y),
    stroke: currentColor, strokeWidth: currentSize, fill: 'transparent'
  });
}

function createLine(startPos, endPos) {
  return new Konva.Line({
    points: [startPos.x, startPos.y, endPos.x, endPos.y],
    stroke: currentColor, strokeWidth: currentSize, lineCap: 'round'
  });
}

// === ÉVÉNEMENTS DE DESSIN ===

stage.on('mousedown touchstart pointerdown', (evt) => {
  const pointer = stage.getPointerPosition();
  const scenePos = {
    x: (pointer.x - stage.x()) / stage.scaleX(),
    y: (pointer.y - stage.y()) / stage.scaleY()
  };

  if (currentTool === 'pan') {
    lastPanPos = pointer;
    return;
  }

  if (currentTool === 'eyedropper') {
    pickColor(scenePos.x, scenePos.y);
    return;
  }

  // Formes prédéfinies
  if (currentTool.startsWith('shape-')) {
    isCreatingShape = true;
    shapeStartPos = scenePos;
    return;
  }

  const pressure = getPressure(evt);
  const pressureSize = getPressureSize(pressure);

  if (currentTool === 'texture') {
    isDrawing = true;
    currentId = generateId();
    emitTextureThrottled({ x: scenePos.x, y: scenePos.y, color: currentColor, size: pressureSize });
    createTextureEffect(scenePos.x, scenePos.y, currentColor, pressureSize);
    return;
  }

  // BRUSH ANIMÉS - Utilise le BrushManager
  if (['sparkles', 'watercolor', 'electric', 'petals', 'neon', 'fire'].includes(currentTool)) {
    isDrawing = true;
    currentId = generateId();
    brushManager.createAndEmitEffect(currentTool, scenePos.x, scenePos.y, currentColor, pressureSize);
    return;
  }

  // Dessin normal
  isDrawing = true;
  currentId = generateId();
  lastLine = new Konva.Line({
    id: currentId,
    points: [scenePos.x, scenePos.y],
    stroke: currentColor,
    strokeWidth: pressureSize,
    globalCompositeOperation: currentTool === 'eraser' ? 'destination-out' : 'source-over',
    lineCap: 'round',
    lineJoin: 'round'
  });
  layer.add(lastLine);
});

stage.on('mousemove touchmove pointermove', (evt) => {
  const pointer = stage.getPointerPosition();
  const scenePos = {
    x: (pointer.x - stage.x()) / stage.scaleX(),
    y: (pointer.y - stage.y()) / stage.scaleY()
  };

  // Pan
  if (currentTool === 'pan' && lastPanPos) {
    const dx = pointer.x - lastPanPos.x;
    const dy = pointer.y - lastPanPos.y;
    stage.x(stage.x() + dx);
    stage.y(stage.y() + dy);
    stage.batchDraw();
    lastPanPos = pointer;
    return;
  }

  // Formes en cours de création
  if (isCreatingShape && shapeStartPos) {
    if (shapePreview) shapePreview.destroy();

    switch(currentTool) {
      case 'shape-circle':
        shapePreview = createCircle(shapeStartPos, scenePos);
        break;
      case 'shape-rectangle':
        shapePreview = createRectangle(shapeStartPos, scenePos);
        break;
      case 'shape-line':
        shapePreview = createLine(shapeStartPos, scenePos);
        break;
    }

    if (shapePreview) {
      shapePreview.opacity(0.5);
      layer.add(shapePreview);
      layer.batchDraw();
    }
    return;
  }

  if (!isDrawing) return;

  const pressure = getPressure(evt);
  const pressureSize = getPressureSize(pressure);

  if (currentTool === 'texture') {
    emitTextureThrottled({ x: scenePos.x, y: scenePos.y, color: currentColor, size: pressureSize });
    createTextureEffect(scenePos.x, scenePos.y, currentColor, pressureSize);
    return;
  }

  // BRUSH ANIMÉS - Continuer l'effet
  if (['sparkles', 'watercolor', 'electric', 'petals', 'neon', 'fire'].includes(currentTool)) {
    brushManager.createAndEmitEffect(currentTool, scenePos.x, scenePos.y, currentColor, pressureSize);
    return;
  }

  // Dessin normal
  lastLine.points(lastLine.points().concat([scenePos.x, scenePos.y]));
  lastLine.strokeWidth(pressureSize);
  layer.batchDraw();

  emitDrawingThrottled({
    id: currentId,
    points: lastLine.points(),
    stroke: lastLine.stroke(),
    strokeWidth: lastLine.strokeWidth(),
    globalCompositeOperation: lastLine.globalCompositeOperation()
  });
});

stage.on('mouseup touchend pointerup', () => {
  if (currentTool === 'pan') {
    lastPanPos = null;
    return;
  }

  // Finaliser forme
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
  if (currentTool === 'texture' || ['sparkles', 'watercolor', 'electric', 'petals', 'neon', 'fire'].includes(currentTool)) {
    return;
  }

  socket.emit('draw', {
    id: currentId,
    points: lastLine.points(),
    stroke: lastLine.stroke(),
    strokeWidth: lastLine.strokeWidth(),
    globalCompositeOperation: lastLine.globalCompositeOperation()
  });
});

// === SOCKET LISTENERS ===

// BRUSH EFFECTS - Utilise le BrushManager
socket.on('brushEffect', (data) => {
  brushManager.createNetworkEffect(data);
});

socket.on('cleanupUserEffects', (data) => {
  brushManager.cleanupUserEffects(data.socketId);
});

socket.on('clearCanvas', () => {
  layer.destroyChildren();
  brushManager.clearPermanentTraces();
  layer.draw();
});

socket.on('restoreShapes', (shapes) => {
  layer.destroyChildren();
  brushManager.clearPermanentTraces();
  shapes.forEach(data => {
    const line = new Konva.Line({
      id: data.id, points: data.points, stroke: data.stroke,
      strokeWidth: data.strokeWidth, globalCompositeOperation: data.globalCompositeOperation,
      lineCap: 'round', lineJoin: 'round'
    });
    layer.add(line);
  });
  layer.draw();
});

socket.on('initShapes', shapes => {
  shapes.forEach(data => {
    const line = new Konva.Line({
      id: data.id, points: data.points, stroke: data.stroke,
      strokeWidth: data.strokeWidth, globalCompositeOperation: data.globalCompositeOperation,
      lineCap: 'round', lineJoin: 'round'
    });
    layer.add(line);
  });
  layer.draw();
});

socket.on('drawing', data => {
  let shape = layer.findOne('#' + data.id);
  if (!shape) {
    shape = new Konva.Line({
      id: data.id, points: data.points, stroke: data.stroke,
      strokeWidth: data.strokeWidth, globalCompositeOperation: data.globalCompositeOperation,
      lineCap: 'round', lineJoin: 'round'
    });
    layer.add(shape);
  } else {
    shape.points(data.points);
  }
  layer.batchDraw();
});

socket.on('texture', data => createTextureEffect(data.x, data.y, data.color, data.size));

socket.on('draw', data => {
  let shape = layer.findOne('#' + data.id);
  if (shape) {
    shape.points(data.points).stroke(data.stroke).strokeWidth(data.strokeWidth).globalCompositeOperation(data.globalCompositeOperation);
  } else {
    layer.add(new Konva.Line({
      id: data.id, points: data.points, stroke: data.stroke,
      strokeWidth: data.strokeWidth, globalCompositeOperation: data.globalCompositeOperation,
      lineCap: 'round', lineJoin: 'round'
    }));
  }
  layer.draw();
});

socket.on('deleteShape', ({ id }) => {
  const shape = layer.findOne('#' + id);
  if (shape) { shape.destroy(); layer.draw(); }
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

// === RACCOURCIS ET NAVIGATION ===

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault();
    socket.emit('undo');
  }
});

document.getElementById('export')?.addEventListener('click', () => {
  const uri = stage.toDataURL({ pixelRatio: 3 });
  const link = document.createElement('a');
  link.download = 'atelier-canvas.png';
  link.href = uri;
  link.click();
});

document.getElementById('back-home')?.addEventListener('click', () => {
  window.location.href = '/';
});

// Initialisation
updateZoomDisplay();
updateColorPicker();