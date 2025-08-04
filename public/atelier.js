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

// === SYSTÈME BRUSH ANIMÉS OPTIMISÉ POUR INTERFACE ATELIER ===

// Configuration optimisée pour l'interface atelier (qualité élevée)
const AtelierBrushConfig = {
  sparkles: { particles: 5, duration: 1500 },
  watercolor: { drops: 4, duration: 2000 },
  electric: { bolts: 3, segments: 6, duration: 1500 },
  petals: { count: 4, duration: 3000 },
  neon: { particles: 6, duration: 2000 },
  fire: { flames: 5, duration: 1500 }
};

// Gestionnaire d'effets pour interface atelier (version création)
class AtelierBrushManager {
  constructor() {
    this.activeEffects = new Map();
    this.lastEmit = 0;
    this.effectCount = 0;
    this.maxEffects = 50; // Limite modérée pour atelier
    
    // Nettoyage automatique toutes les 25 secondes
    setInterval(() => this.cleanup(), 25000);
  }

  // Créer effet local avec émission réseau
  createAndEmitEffect(type, x, y, color, size) {
    // Throttling modéré pour interface atelier (200ms)
    const now = Date.now();
    if (now - this.lastEmit < 200) return;
    
    // Créer l'effet local
    this.createLocalEffect(type, x, y, color, size);
    
    // Émettre vers le réseau
    socket.emit('brushEffect', {
      type,
      x,
      y,
      color,
      size,
      interface: 'atelier',
      timestamp: now
    });
    
    this.lastEmit = now;
  }

  // Créer effet reçu du réseau
  createNetworkEffect(data) {
    this.createLocalEffect(data.type, data.x, data.y, data.color, data.size);
  }

  // Créer effet local (qualité élevée pour création)
  createLocalEffect(type, x, y, color, size) {
    if (this.effectCount >= this.maxEffects) return;
    
    const effectId = 'atelier_effect_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    
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

  // Effets qualité élevée pour création
  createSparkles(x, y, color, size, effectId) {
    const config = AtelierBrushConfig.sparkles;
    const elements = [];
    
    for (let i = 0; i < config.particles; i++) {
      const offsetX = (Math.random() - 0.5) * size * 1.2;
      const offsetY = (Math.random() - 0.5) * size * 1.2;
      const sparkleSize = 1 + Math.random() * 2.5;
      
      const sparkle = new Konva.Star({
        x: x + offsetX,
        y: y + offsetY,
        numPoints: 4,
        innerRadius: sparkleSize * 0.5,
        outerRadius: sparkleSize,
        fill: color,
        rotation: Math.random() * 360,
        opacity: 0.8,
        effectId: effectId
      });
      
      layer.add(sparkle);
      elements.push(sparkle);
      
      // Animation avec scintillement
      const animation = new Konva.Animation((frame) => {
        const progress = frame.time / config.duration;
        const scale = 0.6 + Math.sin(frame.time * 0.007 + i) * 0.35;
        const rotation = sparkle.rotation() + 1.5;
        const opacity = Math.max(0, 0.8 - progress * 0.6);
        
        sparkle.scaleX(scale);
        sparkle.scaleY(scale);
        sparkle.rotation(rotation);
        sparkle.opacity(opacity);
        
        if (progress >= 1 || opacity <= 0) {
          sparkle.destroy();
          animation.stop();
        }
      }, layer);
      
      animation.start();
    }
    
    this.trackEffect(effectId, elements, config.duration);
  }

  createWatercolor(x, y, color, size, effectId) {
    const config = AtelierBrushConfig.watercolor;
    const elements = [];
    
    for (let i = 0; i < config.drops; i++) {
      const offsetX = (Math.random() - 0.5) * size * 1.2;
      const offsetY = (Math.random() - 0.5) * size * 1.2;
      const dropSize = size * (0.4 + Math.random() * 0.4);
      
      const drop = new Konva.Circle({
        x: x + offsetX,
        y: y + offsetY,
        radius: dropSize,
        fill: color,
        opacity: 0.2 + Math.random() * 0.2,
        scaleX: 0.8 + Math.random() * 0.3,
        scaleY: 0.8 + Math.random() * 0.3,
        effectId: effectId
      });
      
      layer.add(drop);
      elements.push(drop);
      
      // Animation de diffusion
      const animation = new Konva.Animation((frame) => {
        const progress = frame.time / config.duration;
        const expansion = 1 + progress * 1.2;
        const opacity = Math.max(0, drop.opacity() - progress * 0.1);
        const wave = Math.sin(frame.time * 0.004 + i) * 0.08;
        
        drop.scaleX(expansion + wave);
        drop.scaleY(expansion + wave * 0.7);
        drop.opacity(opacity);
        
        if (progress >= 1 || opacity <= 0) {
          drop.destroy();
          animation.stop();
        }
      }, layer);
      
      animation.start();
    }
    
    this.trackEffect(effectId, elements, config.duration);
  }

  createElectric(x, y, color, size, effectId) {
    const config = AtelierBrushConfig.electric;
    const elements = [];
    
    for (let i = 0; i < config.bolts; i++) {
      const points = [x, y];
      let currentX = x;
      let currentY = y;
      
      // Créer un zigzag
      for (let j = 0; j < config.segments; j++) {
        currentX += (Math.random() - 0.5) * size * 0.7;
        currentY += (Math.random() - 0.5) * size * 0.7;
        points.push(currentX, currentY);
      }
      
      const bolt = new Konva.Line({
        points: points,
        stroke: color,
        strokeWidth: 1 + Math.random() * 1.5,
        opacity: 0.7,
        lineCap: 'round',
        shadowColor: color,
        shadowBlur: 4,
        shadowOpacity: 0.4,
        effectId: effectId
      });
      
      layer.add(bolt);
      elements.push(bolt);
      
      // Animation de scintillement
      const animation = new Konva.Animation((frame) => {
        const progress = frame.time / config.duration;
        const flicker = 0.3 + Math.sin(frame.time * 0.04 + i * 1.5) * 0.5;
        const glow = 3 + Math.sin(frame.time * 0.025 + i) * 2;
        const opacity = Math.max(0, 0.7 - progress * 0.5);
        
        bolt.opacity(flicker * opacity);
        bolt.shadowBlur(glow);
        
        if (progress >= 1 || opacity <= 0) {
          bolt.destroy();
          animation.stop();
        }
      }, layer);
      
      animation.start();
    }
    
    this.trackEffect(effectId, elements, config.duration);
  }

  createPetals(x, y, color, size, effectId) {
    const config = AtelierBrushConfig.petals;
    const elements = [];
    
    for (let i = 0; i < config.count; i++) {
      const offsetX = (Math.random() - 0.5) * size * 0.7;
      const offsetY = (Math.random() - 0.5) * size * 0.7;
      const petalSize = size * (0.25 + Math.random() * 0.35);
      
      const petal = new Konva.Ellipse({
        x: x + offsetX,
        y: y + offsetY,
        radiusX: petalSize,
        radiusY: petalSize * 0.6,
        fill: color,
        opacity: 0.6 + Math.random() * 0.2,
        rotation: Math.random() * 360,
        scaleX: 0.8 + Math.random() * 0.3,
        scaleY: 0.8 + Math.random() * 0.3,
        effectId: effectId
      });
      
      layer.add(petal);
      elements.push(petal);
      
      // Animation de chute avec rotation
      const animation = new Konva.Animation((frame) => {
        const progress = frame.time / config.duration;
        const rotation = petal.rotation() + 1.2;
        const fall = petal.y() + 0.6;
        const sway = Math.sin(frame.time * 0.01 + i) * 1.2;
        const opacity = Math.max(0, petal.opacity() - progress * 0.18);
        const flutter = 0.9 + Math.sin(frame.time * 0.01 + i) * 0.15;
        
        petal.rotation(rotation);
        petal.y(fall);
        petal.x(petal.x() + sway * 0.03);
        petal.opacity(opacity);
        petal.scaleX(flutter);
        petal.scaleY(flutter * 0.8);
        
        if (progress >= 1 || opacity <= 0) {
          petal.destroy();
          animation.stop();
        }
      }, layer);
      
      animation.start();
    }
    
    this.trackEffect(effectId, elements, config.duration);
  }

  createNeon(x, y, color, size, effectId) {
    const config = AtelierBrushConfig.neon;
    const elements = [];
    
    for (let i = 0; i < config.particles; i++) {
      const offsetX = (Math.random() - 0.5) * size * 0.8;
      const offsetY = (Math.random() - 0.5) * size * 0.8;
      const particleSize = 1.5 + Math.random() * 2;
      
      const particle = new Konva.Circle({
        x: x + offsetX,
        y: y + offsetY,
        radius: particleSize,
        fill: color,
        opacity: 0.7,
        shadowColor: color,
        shadowBlur: 8,
        shadowOpacity: 0.5,
        effectId: effectId
      });
      
      layer.add(particle);
      elements.push(particle);
      
      // Animation glow
      const animation = new Konva.Animation((frame) => {
        const progress = frame.time / config.duration;
        const glow = 6 + Math.sin(frame.time * 0.008 + i) * 4;
        const opacity = Math.max(0, 0.7 - progress * 0.5);
        const scale = 1 + Math.sin(frame.time * 0.005 + i) * 0.25;
        
        particle.shadowBlur(glow);
        particle.opacity(opacity);
        particle.scaleX(scale);
        particle.scaleY(scale);
        
        if (progress >= 1 || opacity <= 0) {
          particle.destroy();
          animation.stop();
        }
      }, layer);
      
      animation.start();
    }
    
    this.trackEffect(effectId, elements, config.duration);
  }

  createFire(x, y, color, size, effectId) {
    const config = AtelierBrushConfig.fire;
    const elements = [];
    
    for (let i = 0; i < config.flames; i++) {
      const offsetX = (Math.random() - 0.5) * size * 0.5;
      const offsetY = (Math.random() - 0.5) * size * 0.5;
      
      const flame = new Konva.Ellipse({
        x: x + offsetX,
        y: y + offsetY,
        radiusX: 2.5 + Math.random() * 1.5,
        radiusY: 5 + Math.random() * 3,
        fill: color,
        opacity: 0.6,
        shadowColor: '#FF4500',
        shadowBlur: 6,
        shadowOpacity: 0.3,
        effectId: effectId
      });
      
      layer.add(flame);
      elements.push(flame);
      
      // Animation flamme
      const animation = new Konva.Animation((frame) => {
        const progress = frame.time / config.duration;
        const flicker = 0.7 + Math.sin(frame.time * 0.018 + i * 0.4) * 0.25;
        const rise = flame.y() - 0.6;
        const sway = Math.sin(frame.time * 0.012 + i) * 1.5;
        const opacity = Math.max(0, 0.6 - progress * 0.4);
        
        flame.scaleX(flicker);
        flame.scaleY(flicker);
        flame.y(rise);
        flame.x(flame.x() + sway * 0.08);
        flame.opacity(opacity);
        
        if (progress >= 1 || opacity <= 0) {
          flame.destroy();
          animation.stop();
        }
      }, layer);
      
      animation.start();
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
    }, duration + 800);
    
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
      if (now - effect.timestamp > effect.duration + 2500) {
        expired.push(effectId);
      }
    });
    
    expired.forEach(id => this.removeEffect(id));
    layer.batchDraw();
    
    if (expired.length > 0) {
      console.log(`Atelier interface: cleaned ${expired.length} expired effects`);
    }
  }
}

// Initialiser le gestionnaire d'effets
const brushManager = new AtelierBrushManager();

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

// Throttling réduit pour texture (économie réseau)
const emitTextureThrottled = throttle((data) => {
  socket.emit('texture', data);
}, 150);

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
  const angle = Math.random() * Math.PI / 6;
  
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

  // Nouveaux brush animés synchronisés
  if (['sparkles', 'watercolor', 'electric', 'petals', 'neon', 'fire'].includes(currentTool)) {
    isDrawing = true;
    currentId = generateId();
    brushManager.createAndEmitEffect(currentTool, scenePos.x, scenePos.y, currentColor, pressureSize);
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

  // Nouveaux brush animés (continuer l'effet)
  if (['sparkles', 'watercolor', 'electric', 'petals', 'neon', 'fire'].includes(currentTool)) {
    brushManager.createAndEmitEffect(currentTool, scenePos.x, scenePos.y, currentColor, pressureSize);
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

// === ÉCOUTEURS SOCKET POUR EFFETS RÉSEAU ===

// Écouter les brush effects des autres utilisateurs
socket.on('brushEffect', (data) => {
  brushManager.createNetworkEffect(data);
});

// Nettoyage des effets d'un utilisateur déconnecté
socket.on('cleanupUserEffects', (data) => {
  brushManager.activeEffects.forEach((effect, effectId) => {
    if (effect.socketId === data.socketId) {
      brushManager.removeEffect(effectId);
    }
  });
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