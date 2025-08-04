// public/app.js
const socket = io();
const stage = new Konva.Stage({
  container: 'canvas-container',
  width: window.innerWidth,
  height: window.innerHeight
});
const layer = new Konva.Layer();
stage.add(layer);

let currentTool  = 'brush';
let currentColor = document.querySelector('.color-btn.active').dataset.color;
let currentSize  = parseInt(document.getElementById('size-slider').value, 10);
let isDrawing    = false;
let lastLine;
let currentId;
let isCreatingShape = false;
let shapePreview = null;
let shapeStartPos = null;

// === SYSTÈME BRUSH ANIMÉS OPTIMISÉ POUR INTERFACE PUBLIQUE ===

// Configuration optimisée pour l'interface publique (performances prioritaires)
const PublicBrushConfig = {
  sparkles: { particles: 3, duration: 1000 },
  watercolor: { drops: 2, duration: 1200 },
  electric: { bolts: 2, segments: 4, duration: 1000 },
  petals: { count: 2, duration: 2000 },
  neon: { particles: 3, duration: 1200 },
  fire: { flames: 3, duration: 1000 }
};

// Gestionnaire d'effets pour interface publique (version allégée)
class PublicBrushManager {
  constructor() {
    this.activeEffects = new Map();
    this.lastEmit = 0;
    this.effectCount = 0;
    this.maxEffects = 20; // Limite pour interface publique
    
    // Nettoyage automatique toutes les 20 secondes
    setInterval(() => this.cleanup(), 20000);
  }

  // Créer effet local avec émission réseau
  createAndEmitEffect(type, x, y, color, size) {
    // Throttling agressif pour interface publique (400ms)
    const now = Date.now();
    if (now - this.lastEmit < 400) return;
    
    // Créer l'effet local
    this.createLocalEffect(type, x, y, color, size);
    
    // Émettre vers le réseau
    socket.emit('brushEffect', {
      type,
      x,
      y,
      color,
      size,
      interface: 'public',
      timestamp: now
    });
    
    this.lastEmit = now;
  }

  // Créer effet reçu du réseau
  createNetworkEffect(data) {
    this.createLocalEffect(data.type, data.x, data.y, data.color, data.size);
  }

  // Créer effet local (simplifié pour performances)
  createLocalEffect(type, x, y, color, size) {
    if (this.effectCount >= this.maxEffects) return;
    
    const effectId = 'effect_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    
    switch(type) {
      case 'sparkles':
        this.createSparkles(x, y, color, size, effectId);
        break;
      case 'watercolor':
        this.createWatercolor(x, y, color, size, effectId);
        break;
      case 'electric':
        this.createElectric(x, y, color, size, effectId);
        break;
      case 'petals':
        this.createPetals(x, y, color, size, effectId);
        break;
      case 'neon':
        this.createNeon(x, y, color, size, effectId);
        break;
      case 'fire':
        this.createFire(x, y, color, size, effectId);
        break;
    }
  }

  // Effets simplifiés pour interface publique
  createSparkles(x, y, color, size, effectId) {
    const config = PublicBrushConfig.sparkles;
    const elements = [];
    
    for (let i = 0; i < config.particles; i++) {
      const sparkle = new Konva.Star({
        x: x + (Math.random() - 0.5) * size,
        y: y + (Math.random() - 0.5) * size,
        numPoints: 4,
        innerRadius: 0.5,
        outerRadius: 1.5,
        fill: color,
        opacity: 0.8,
        effectId: effectId
      });
      
      layer.add(sparkle);
      elements.push(sparkle);
      
      // Animation minimaliste
      setTimeout(() => {
        sparkle.to({
          scaleX: 0,
          scaleY: 0,
          opacity: 0,
          duration: 0.5,
          onFinish: () => sparkle.destroy()
        });
      }, Math.random() * 500);
    }
    
    this.trackEffect(effectId, elements, config.duration);
  }

  createNeon(x, y, color, size, effectId) {
    const config = PublicBrushConfig.neon;
    const elements = [];
    
    for (let i = 0; i < config.particles; i++) {
      const particle = new Konva.Circle({
        x: x + (Math.random() - 0.5) * size,
        y: y + (Math.random() - 0.5) * size,
        radius: 1 + Math.random(),
        fill: color,
        opacity: 0.7,
        effectId: effectId
      });
      
      layer.add(particle);
      elements.push(particle);
      
      // Animation glow simplifiée
      particle.to({
        radius: 3,
        opacity: 0,
        duration: 0.8,
        onFinish: () => particle.destroy()
      });
    }
    
    this.trackEffect(effectId, elements, config.duration);
  }

  createFire(x, y, color, size, effectId) {
    const config = PublicBrushConfig.fire;
    const elements = [];
    
    for (let i = 0; i < config.flames; i++) {
      const flame = new Konva.Ellipse({
        x: x + (Math.random() - 0.5) * size * 0.5,
        y: y + (Math.random() - 0.5) * size * 0.5,
        radiusX: 2,
        radiusY: 4,
        fill: color,
        opacity: 0.6,
        effectId: effectId
      });
      
      layer.add(flame);
      elements.push(flame);
      
      // Animation flamme simple
      flame.to({
        y: flame.y() - size,
        scaleY: 0.1,
        opacity: 0,
        duration: 0.6,
        onFinish: () => flame.destroy()
      });
    }
    
    this.trackEffect(effectId, elements, config.duration);
  }

  createWatercolor(x, y, color, size, effectId) {
    const config = PublicBrushConfig.watercolor;
    const elements = [];
    
    for (let i = 0; i < config.drops; i++) {
      const drop = new Konva.Circle({
        x: x + (Math.random() - 0.5) * size,
        y: y + (Math.random() - 0.5) * size,
        radius: size * 0.3,
        fill: color,
        opacity: 0.2,
        effectId: effectId
      });
      
      layer.add(drop);
      elements.push(drop);
      
      // Diffusion simple
      drop.to({
        radius: size * 0.8,
        opacity: 0,
        duration: 1,
        onFinish: () => drop.destroy()
      });
    }
    
    this.trackEffect(effectId, elements, config.duration);
  }

  createElectric(x, y, color, size, effectId) {
    const config = PublicBrushConfig.electric;
    const elements = [];
    
    for (let i = 0; i < config.bolts; i++) {
      const points = [x, y];
      for (let j = 0; j < config.segments; j++) {
        points.push(
          points[points.length - 2] + (Math.random() - 0.5) * size * 0.5,
          points[points.length - 1] + (Math.random() - 0.5) * size * 0.5
        );
      }
      
      const bolt = new Konva.Line({
        points: points,
        stroke: color,
        strokeWidth: 1,
        opacity: 0.8,
        effectId: effectId
      });
      
      layer.add(bolt);
      elements.push(bolt);
      
      // Scintillement simple
      setTimeout(() => {
        bolt.to({
          opacity: 0,
          duration: 0.3,
          onFinish: () => bolt.destroy()
        });
      }, Math.random() * 300);
    }
    
    this.trackEffect(effectId, elements, config.duration);
  }

  createPetals(x, y, color, size, effectId) {
    const config = PublicBrushConfig.petals;
    const elements = [];
    
    for (let i = 0; i < config.count; i++) {
      const petal = new Konva.Ellipse({
        x: x + (Math.random() - 0.5) * size,
        y: y + (Math.random() - 0.5) * size,
        radiusX: size * 0.2,
        radiusY: size * 0.1,
        fill: color,
        opacity: 0.6,
        rotation: Math.random() * 360,
        effectId: effectId
      });
      
      layer.add(petal);
      elements.push(petal);
      
      // Chute simple
      petal.to({
        y: petal.y() + size * 2,
        rotation: petal.rotation() + 180,
        opacity: 0,
        duration: 1.5,
        onFinish: () => petal.destroy()
      });
    }
    
    this.trackEffect(effectId, elements, config.duration);
  }

  trackEffect(effectId, elements, duration) {
    this.activeEffects.set(effectId, {
      elements,
      timestamp: Date.now(),
      duration
    });
    this.effectCount++;
    
    // Auto-cleanup
    setTimeout(() => {
      this.removeEffect(effectId);
    }, duration + 500);
    
    layer.batchDraw();
  }

  removeEffect(effectId) {
    const effect = this.activeEffects.get(effectId);
    if (effect) {
      effect.elements.forEach(el => {
        if (!el.isDestroyed()) el.destroy();
      });
      this.activeEffects.delete(effectId);
      this.effectCount = Math.max(0, this.effectCount - 1);
    }
  }

  cleanup() {
    const now = Date.now();
    const expired = [];
    
    this.activeEffects.forEach((effect, effectId) => {
      if (now - effect.timestamp > effect.duration + 2000) {
        expired.push(effectId);
      }
    });
    
    expired.forEach(id => this.removeEffect(id));
    layer.batchDraw();
    
    if (expired.length > 0) {
      console.log(`Public interface: cleaned ${expired.length} expired effects`);
    }
  }
}

// Initialiser le gestionnaire d'effets
const brushManager = new PublicBrushManager();

// === FIN SYSTÈME BRUSH ANIMÉS ===

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

// Throttling pour texture (réseau réduit)
const emitTextureThrottled = throttle((data) => {
  socket.emit('texture', data);
}, 150);

// Tool buttons
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTool = btn.id;
    const cursor = currentTool === 'pan' ? 'grab' : 'crosshair';
    stage.container().style.cursor = cursor;
    
    // Gestion du bouton formes
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

// Drawing and pan handlers
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

  // Nouveaux brush animés synchronisés
  if (['neon', 'fire', 'electric', 'sparkles', 'watercolor', 'petals'].includes(currentTool)) {
    isDrawing = true;
    currentId = generateId();
    brushManager.createAndEmitEffect(currentTool, scenePos.x, scenePos.y, currentColor, pressureSize);
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

  // Nouveaux brush animés (continuer l'effet)
  if (['neon', 'fire', 'electric', 'sparkles', 'watercolor', 'petals'].includes(currentTool)) {
    brushManager.createAndEmitEffect(currentTool, scenePos.x, scenePos.y, currentColor, pressureSize);
    return;
  }
  
  // Mode brush normal ou gomme
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
});

stage.on('mouseup touchend pointerup', () => {
  const pointer = stage.getPointerPosition();
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
  
  if (currentTool === 'texture' || ['neon', 'fire', 'electric', 'sparkles', 'watercolor', 'petals'].includes(currentTool)) {
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

// Fonction pour créer l'effet texture localement
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

// === ÉCOUTEURS SOCKET POUR EFFETS RÉSEAU ===

// Écouter les brush effects des autres utilisateurs
socket.on('brushEffect', (data) => {
  // Créer l'effet reçu du réseau
  brushManager.createNetworkEffect(data);
});

// Nettoyage des effets d'un utilisateur déconnecté
socket.on('cleanupUserEffects', (data) => {
  // Nettoyer les effets de cet utilisateur spécifique
  brushManager.activeEffects.forEach((effect, effectId) => {
    if (effect.socketId === data.socketId) {
      brushManager.removeEffect(effectId);
    }
  });
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

// Écouter les événements texture des autres utilisateurs
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