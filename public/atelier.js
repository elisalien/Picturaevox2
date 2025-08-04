// public/atelier.js
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

// Throttle helper
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

// Fonction pour obtenir la pression
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

// Throttling réduit pour texture (économie réseau)
const emitTextureThrottled = throttle((data) => {
  socket.emit('texture', data);
}, 150);

// Throttling pour paillettes (effet local uniquement, pas de réseau)
const createSparklesThrottled = throttle((x, y, color, size) => {
  createSparklesEffect(x, y, color, size);
}, 100);

// Throttling pour les nouveaux brushs (effets locaux uniquement)
const createWatercolorThrottled = throttle((x, y, color, size) => {
  createWatercolorEffect(x, y, color, size);
}, 120);

const createElectricThrottled = throttle((x, y, color, size) => {
  createElectricEffect(x, y, color, size);
}, 100);

const createPetalsThrottled = throttle((x, y, color, size) => {
  createPetalsEffect(x, y, color, size);
}, 200);

// Fonction pour créer l'effet aquarelle
function createWatercolorEffect(x, y, color, size) {
  const drops = 3 + Math.floor(Math.random() * 4); // 3-6 gouttes
  
  for (let i = 0; i < drops; i++) {
    const offsetX = (Math.random() - 0.5) * size * 1.5;
    const offsetY = (Math.random() - 0.5) * size * 1.5;
    const dropSize = size * (0.5 + Math.random() * 0.8);
    
    const drop = new Konva.Circle({
      x: x + offsetX,
      y: y + offsetY,
      radius: dropSize,
      fill: color,
      opacity: 0.15 + Math.random() * 0.25, // Très transparent
      scaleX: 0.8 + Math.random() * 0.4,
      scaleY: 0.8 + Math.random() * 0.4
    });
    
    layer.add(drop);
    
    // Animation de diffusion
    const diffusion = new Konva.Animation((frame) => {
      const progress = frame.time / 2000; // 2 secondes
      const scale = 1 + progress * 0.5;
      const opacity = Math.max(0, drop.opacity() - progress * 0.1);
      
      drop.scaleX(scale);
      drop.scaleY(scale);
      drop.opacity(opacity);
      
      if (progress >= 1 || opacity <= 0) {
        drop.destroy();
        diffusion.stop();
      }
    }, layer);
    
    diffusion.start();
  }
  layer.batchDraw();
}

// Fonction pour créer l'effet électrique
function createElectricEffect(x, y, color, size) {
  const bolts = 2 + Math.floor(Math.random() * 3); // 2-4 éclairs
  
  for (let i = 0; i < bolts; i++) {
    const points = [x, y];
    const segments = 5 + Math.floor(Math.random() * 5); // 5-9 segments
    
    let currentX = x;
    let currentY = y;
    
    // Créer un zigzag aléatoire
    for (let j = 0; j < segments; j++) {
      currentX += (Math.random() - 0.5) * size * 0.8;
      currentY += (Math.random() - 0.5) * size * 0.8;
      points.push(currentX, currentY);
    }
    
    const bolt = new Konva.Line({
      points: points,
      stroke: color,
      strokeWidth: 1 + Math.random() * 2,
      opacity: 0.7 + Math.random() * 0.3,
      lineCap: 'round',
      tension: 0.1
    });
    
    layer.add(bolt);
    
    // Animation de scintillement
    const flicker = new Konva.Animation((frame) => {
      const opacity = 0.3 + Math.sin(frame.time * 0.02) * 0.4;
      bolt.opacity(opacity);
      
      if (frame.time > 1500) { // 1.5 secondes
        bolt.destroy();
        flicker.stop();
      }
    }, layer);
    
    flicker.start();
  }
  layer.batchDraw();
}

// Fonction pour créer l'effet pétales
function createPetalsEffect(x, y, color, size) {
  const petals = 4 + Math.floor(Math.random() * 4); // 4-7 pétales
  
  for (let i = 0; i < petals; i++) {
    const offsetX = (Math.random() - 0.5) * size;
    const offsetY = (Math.random() - 0.5) * size;
    const petalSize = size * (0.3 + Math.random() * 0.4);
    
    const petal = new Konva.Ellipse({
      x: x + offsetX,
      y: y + offsetY,
      radiusX: petalSize,
      radiusY: petalSize * 0.6,
      fill: color,
      opacity: 0.6 + Math.random() * 0.3,
      rotation: Math.random() * 360,
      scaleX: 0.8 + Math.random() * 0.4,
      scaleY: 0.8 + Math.random() * 0.4
    });
    
    layer.add(petal);
    
    // Animation de rotation et chute
    const fall = new Konva.Animation((frame) => {
      const progress = frame.time / 3000; // 3 secondes
      const rotation = petal.rotation() + 2;
      const y = petal.y() + 0.5;
      const opacity = Math.max(0, petal.opacity() - progress * 0.2);
      
      petal.rotation(rotation);
      petal.y(y);
      petal.opacity(opacity);
      
      if (progress >= 1 || opacity <= 0) {
        petal.destroy();
        fall.stop();
      }
    }, layer);
    
    fall.start();
  }
  layer.batchDraw();
}
function createSparklesEffect(x, y, color, size) {
  const sparkleCount = 8 + Math.floor(Math.random() * 5); // 8-12 paillettes
  
  for (let i = 0; i < sparkleCount; i++) {
    const offsetX = (Math.random() - 0.5) * size * 2;
    const offsetY = (Math.random() - 0.5) * size * 2;
    const sparkleSize = 1 + Math.random() * 3;
    
    // Créer une paillette
    const sparkle = new Konva.Star({
      x: x + offsetX,
      y: y + offsetY,
      numPoints: 4,
      innerRadius: sparkleSize * 0.5,
      outerRadius: sparkleSize,
      fill: color,
      rotation: Math.random() * 360,
      opacity: 0.8 + Math.random() * 0.2,
      scaleX: 0.5 + Math.random() * 0.5,
      scaleY: 0.5 + Math.random() * 0.5
    });
    
    layer.add(sparkle);
    
    // Animation scintillante
    const scaleAnimation = new Konva.Animation((frame) => {
      const scale = 0.5 + Math.sin(frame.time * 0.01 + i) * 0.3;
      sparkle.scaleX(scale);
      sparkle.scaleY(scale);
      
      const opacity = 0.3 + Math.sin(frame.time * 0.008 + i * 0.5) * 0.5;
      sparkle.opacity(opacity);
      
      // Faire disparaître après 3 secondes
      if (frame.time > 3000) {
        sparkle.destroy();
        scaleAnimation.stop();
      }
    }, layer);
    
    scaleAnimation.start();
  }
  layer.batchDraw();
}

// Fonction pour créer l'effet texture
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

// Fonction pour créer triangle
function createTriangle(startPos, endPos) {
  const width = Math.abs(endPos.x - startPos.x);
  const height = Math.abs(endPos.y - startPos.y);
  
  const centerX = (startPos.x + endPos.x) / 2;
  const topY = Math.min(startPos.y, endPos.y);
  const bottomY = Math.max(startPos.y, endPos.y);
  
  return new Konva.Line({
    points: [
      centerX, topY,
      startPos.x, bottomY,
      endPos.x, bottomY,
      centerX, topY
    ],
    stroke: currentColor,
    strokeWidth: currentSize,
    fill: 'transparent',
    closed: true
  });
}

// Fonction pour créer étoile
function createStar(startPos, endPos) {
  const radius = Math.sqrt(Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2));
  
  return new Konva.Star({
    x: startPos.x,
    y: startPos.y,
    numPoints: 5,
    innerRadius: radius * 0.4,
    outerRadius: radius,
    stroke: currentColor,
    strokeWidth: currentSize,
    fill: 'transparent'
  });
}
function createCalligraphyStroke(points, pressure) {
  const strokeWidth = getPressureSize(pressure);
  const angle = Math.random() * Math.PI / 6; // Variation d'angle
  
  return new Konva.Line({
    points: points,
    stroke: currentColor,
    strokeWidth: strokeWidth,
    lineCap: 'round',
    lineJoin: 'round',
    rotation: angle,
    globalCompositeOperation: 'source-over'
  });
}

// Gestion des outils
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.closest('.tool-group')) {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.id;
      updateCursor();
      
      // Debug pour vérifier
      console.log('Outil sélectionné:', currentTool);
    }
  });
});

// Gestion des formes
document.querySelectorAll('.shape-btn').forEach(btn => {
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

// Sélecteur de couleur
const colorPicker = document.getElementById('color-picker');
colorPicker.addEventListener('input', (e) => {
  currentColor = e.target.value;
  // Retirer l'active des couleurs prédéfinies
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
  
  // Limiter le zoom
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
  // Créer un canvas temporaire pour récupérer la couleur
  const canvas = stage.toCanvas({ x: x, y: y, width: 1, height: 1 });
  const ctx = canvas.getContext('2d');
  const pixel = ctx.getImageData(0, 0, 1, 1).data;
  
  if (pixel[3] > 0) { // Si ce n'est pas transparent
    const color = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
    currentColor = color;
    colorPicker.value = color;
    
    // Retirer active des couleurs prédéfinies
    document.querySelectorAll('.color-btn').forEach(c => c.classList.remove('active'));
  }
}

// Fonctions pour créer des formes
function createCircle(startPos, endPos) {
  const radius = Math.sqrt(Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2));
  return new Konva.Circle({
    x: startPos.x,
    y: startPos.y,
    radius: radius,
    stroke: currentColor,
    strokeWidth: currentSize,
    fill: 'transparent'
  });
}

function createRectangle(startPos, endPos) {
  return new Konva.Rect({
    x: Math.min(startPos.x, endPos.x),
    y: Math.min(startPos.y, endPos.y),
    width: Math.abs(endPos.x - startPos.x),
    height: Math.abs(endPos.y - startPos.y),
    stroke: currentColor,
    strokeWidth: currentSize,
    fill: 'transparent'
  });
}

function createLine(startPos, endPos) {
  return new Konva.Line({
    points: [startPos.x, startPos.y, endPos.x, endPos.y],
    stroke: currentColor,
    strokeWidth: currentSize,
    lineCap: 'round'
  });
}

function createArrow(startPos, endPos) {
  const dx = endPos.x - startPos.x;
  const dy = endPos.y - startPos.y;
  const angle = Math.atan2(dy, dx);
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // Pointe de flèche
  const arrowLength = Math.min(20, length * 0.3);
  const arrowAngle = Math.PI / 6;
  
  const arrowX1 = endPos.x - arrowLength * Math.cos(angle - arrowAngle);
  const arrowY1 = endPos.y - arrowLength * Math.sin(angle - arrowAngle);
  const arrowX2 = endPos.x - arrowLength * Math.cos(angle + arrowAngle);
  const arrowY2 = endPos.y - arrowLength * Math.sin(angle + arrowAngle);
  
  return new Konva.Line({
    points: [
      startPos.x, startPos.y, endPos.x, endPos.y,
      endPos.x, endPos.y, arrowX1, arrowY1,
      endPos.x, endPos.y, arrowX2, arrowY2
    ],
    stroke: currentColor,
    strokeWidth: currentSize,
    lineCap: 'round',
    lineJoin: 'round'
  });
}

// Événements de dessin
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
    emitTextureThrottled({
      x: scenePos.x,
      y: scenePos.y,
      color: currentColor,
      size: pressureSize
    });
    createTextureEffect(scenePos.x, scenePos.y, currentColor, pressureSize);
    return;
  }

  if (currentTool === 'sparkles') {
    isDrawing = true;
    currentId = generateId();
    // Les paillettes ne sont pas synchronisées (effet local uniquement)
    createSparklesThrottled(scenePos.x, scenePos.y, currentColor, pressureSize);
    return;
  }

  if (currentTool === 'watercolor') {
    isDrawing = true;
    currentId = generateId();
    createWatercolorThrottled(scenePos.x, scenePos.y, currentColor, pressureSize);
    return;
  }

  if (currentTool === 'electric') {
    isDrawing = true;
    currentId = generateId();
    createElectricThrottled(scenePos.x, scenePos.y, currentColor, pressureSize);
    return;
  }

  if (currentTool === 'petals') {
    isDrawing = true;
    currentId = generateId();
    createPetalsThrottled(scenePos.x, scenePos.y, currentColor, pressureSize);
    return;
  }

  // Dessin normal
  isDrawing = true;
  currentId = generateId();

  if (currentTool === 'calligraphy') {
    lastLine = createCalligraphyStroke([scenePos.x, scenePos.y], pressure);
  } else {
    lastLine = new Konva.Line({
      id: currentId,
      points: [scenePos.x, scenePos.y],
      stroke: currentColor,
      strokeWidth: pressureSize,
      globalCompositeOperation: currentTool === 'eraser' ? 'destination-out' : 'source-over',
      lineCap: 'round',
      lineJoin: 'round'
    });
  }
  
  lastLine.id(currentId);
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
    // Supprimer l'ancien preview
    if (shapePreview) {
      shapePreview.destroy();
    }

    // Créer nouveau preview
    switch(currentTool) {
      case 'shape-circle':
        shapePreview = createCircle(shapeStartPos, scenePos);
        break;
      case 'shape-rectangle':
        shapePreview = createRectangle(shapeStartPos, scenePos);
        break;
      case 'shape-triangle':
        shapePreview = createTriangle(shapeStartPos, scenePos);
        break;
      case 'shape-star':
        shapePreview = createStar(shapeStartPos, scenePos);
        break;
      case 'shape-line':
        shapePreview = createLine(shapeStartPos, scenePos);
        break;
      case 'shape-arrow':
        shapePreview = createArrow(shapeStartPos, scenePos);
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
    emitTextureThrottled({
      x: scenePos.x,
      y: scenePos.y,
      color: currentColor,
      size: pressureSize
    });
    createTextureEffect(scenePos.x, scenePos.y, currentColor, pressureSize);
    return;
  }

  if (currentTool === 'sparkles') {
    // Continuer l'effet paillettes (local uniquement)
    createSparklesThrottled(scenePos.x, scenePos.y, currentColor, pressureSize);
    return;
  }

  if (currentTool === 'watercolor') {
    createWatercolorThrottled(scenePos.x, scenePos.y, currentColor, pressureSize);
    return;
  }

  if (currentTool === 'electric') {
    createElectricThrottled(scenePos.x, scenePos.y, currentColor, pressureSize);
    return;
  }

  if (currentTool === 'petals') {
    createPetalsThrottled(scenePos.x, scenePos.y, currentColor, pressureSize);
    return;
  }

  // Dessin normal
  lastLine.points(lastLine.points().concat([scenePos.x, scenePos.y]));
  if (currentTool !== 'calligraphy') {
    lastLine.strokeWidth(pressureSize);
  }
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
    
    // Émettre la forme créée
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

  if (currentTool === 'texture') {
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

// Raccourcis clavier
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault();
    socket.emit('undo');
  }
});

document.getElementById('export').addEventListener('click', () => {
  const uri = stage.toDataURL({ pixelRatio: 3 });
  const link = document.createElement('a');
  link.download = 'atelier-canvas.png';
  link.href = uri;
  link.click();
});

document.getElementById('back-home').addEventListener('click', () => {
  window.location.href = '/';
});

// Socket listeners (identiques aux autres interfaces)
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
  layer.draw();
});

socket.on('restoreShapes', (shapes) => {
  layer.destroyChildren();
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

// Initialisation
updateZoomDisplay();
updateColorPicker();