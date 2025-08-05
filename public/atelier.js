// public/atelier.js - VERSION AVEC BRUSHMANAGER INTÉGRÉ
const socket = io();
const stage = new Konva.Stage({
  container: 'canvas-container',
  width: window.innerWidth,
  height: window.innerHeight
});
const layer = new Konva.Layer();
stage.add(layer);

// Rendre stage disponible globalement
window.stage = stage;

// === BRUSHMANAGER INTÉGRÉ DIRECTEMENT (VERSION ATELIER) ===
class BrushManager {
  constructor(interface, layer, socket) {
    this.interface = interface;
    this.layer = layer;
    this.socket = socket;
    this.activeEffects = new Map();
    this.permanentTraces = new Map();
    this.lastEmit = 0;
    this.effectCount = 0;
    this.permanentCount = 0;
    
    this.config = this.getConfig();
    this.maxPermanent = this.config.maxPermanent;
    this.throttleTime = this.config.throttleTime;
    this.cleanupInterval = this.config.cleanupInterval;
    
    setInterval(() => this.cleanup(), this.cleanupInterval);
    console.log(`✅ BrushManager ready for ${interface} with quality:`, this.config.quality);
  }

  getConfig() {
    const configs = {
      public: {
        quality: 'low',
        maxPermanent: 100,
        throttleTime: 500,
        cleanupInterval: 20000,
        effects: {
          sparkles: { particles: 2, duration: 800, permanentOpacity: 0.05, fadeStartTime: 10 },
          neon: { particles: 2, duration: 1000, permanentOpacity: 0.06, fadeStartTime: 10 },
          watercolor: { drops: 1, duration: 1000, permanentOpacity: 0.03, fadeStartTime: 10 },
          electric: { bolts: 1, segments: 3, duration: 800, permanentOpacity: 0.04, fadeStartTime: 10 },
          fire: { flames: 2, duration: 800, permanentOpacity: 0.02, fadeStartTime: 10 },
          petals: { count: 1, duration: 1500, permanentOpacity: 0.04, fadeStartTime: 10 }
        }
      },
      atelier: {
        quality: 'medium',
        maxPermanent: 200,
        throttleTime: 300,
        cleanupInterval: 25000,
        effects: {
          sparkles: { particles: 4, duration: 1200, permanentOpacity: 0.08, fadeStartTime: 15 },
          neon: { particles: 4, duration: 1500, permanentOpacity: 0.1, fadeStartTime: 15 },
          watercolor: { drops: 3, duration: 1500, permanentOpacity: 0.05, fadeStartTime: 15 },
          electric: { bolts: 2, segments: 5, duration: 1200, permanentOpacity: 0.06, fadeStartTime: 15 },
          fire: { flames: 3, duration: 1200, permanentOpacity: 0.03, fadeStartTime: 15 },
          petals: { count: 3, duration: 2500, permanentOpacity: 0.07, fadeStartTime: 15 }
        }
      },
      admin: {
        quality: 'high',
        maxPermanent: 300,
        throttleTime: 150,
        cleanupInterval: 30000,
        effects: {
          sparkles: { particles: 6, duration: 1800, permanentOpacity: 0.12, fadeStartTime: 20 },
          neon: { particles: 6, duration: 2000, permanentOpacity: 0.15, fadeStartTime: 20 },
          watercolor: { drops: 4, duration: 2000, permanentOpacity: 0.08, fadeStartTime: 20 },
          electric: { bolts: 3, segments: 7, duration: 1800, permanentOpacity: 0.08, fadeStartTime: 20 },
          fire: { flames: 5, duration: 1800, permanentOpacity: 0.04, fadeStartTime: 20 },
          petals: { count: 4, duration: 3500, permanentOpacity: 0.1, fadeStartTime: 20 }
        }
      }
    };
    return configs[this.interface] || configs.public;
  }

  createAndEmitEffect(type, x, y, color, size) {
    const now = Date.now();
    if (now - this.lastEmit < this.throttleTime) return;
    
    this.createLocalEffect(type, x, y, color, size);
    
    if (this.socket) {
      this.socket.emit('brushEffect', {
        type, x, y, color, size,
        interface: this.interface,
        timestamp: now
      });
    }
    this.lastEmit = now;
  }

  createNetworkEffect(data) {
    this.createLocalEffect(data.type, data.x, data.y, data.color, data.size);
  }

  createLocalEffect(type, x, y, color, size) {
    const effectConfig = this.config.effects[type];
    if (!effectConfig) return;
    
    const effectId = `${this.interface}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    switch(type) {
      case 'sparkles': this.createSparkles(x, y, color, size, effectConfig, effectId); break;
      case 'neon': this.createNeon(x, y, color, size, effectConfig, effectId); break;
      case 'watercolor': this.createWatercolor(x, y, color, size, effectConfig, effectId); break;
      case 'electric': this.createElectric(x, y, color, size, effectConfig, effectId); break;
      case 'fire': this.createFire(x, y, color, size, effectConfig, effectId); break;
      case 'petals': this.createPetals(x, y, color, size, effectConfig, effectId); break;
    }
  }

  createSparkles(x, y, color, size, config, effectId) {
    const elements = [];
    for (let i = 0; i < config.particles; i++) {
      const offsetX = (Math.random() - 0.5) * size * 1.5;
      const offsetY = (Math.random() - 0.5) * size * 1.5;
      const sparkleSize = 1 + Math.random() * 3;
      const isPermanent = Math.random() < 0.4;
      
      const sparkle = new Konva.Star({
        x: x + offsetX, y: y + offsetY,
        numPoints: 4, innerRadius: sparkleSize * 0.4, outerRadius: sparkleSize,
        fill: color, rotation: Math.random() * 360,
        opacity: isPermanent ? config.permanentOpacity : 0.9,
        effectId, createdAt: Date.now(), isPermanent
      });
      
      this.layer.add(sparkle);
      
      if (isPermanent) {
        this.trackPermanentTrace(sparkle, config);
      } else {
        elements.push(sparkle);
        this.animateSparkle(sparkle, config.duration, i);
      }
    }
    this.trackEffect(effectId, elements, config.duration);
  }

  createNeon(x, y, color, size, config, effectId) {
    const elements = [];
    for (let i = 0; i < config.particles; i++) {
      const offsetX = (Math.random() - 0.5) * size * 0.8;
      const offsetY = (Math.random() - 0.5) * size * 0.8;
      const particleSize = 2 + Math.random() * 3;
      const isPermanent = Math.random() < 0.4;
      
      const particle = new Konva.Circle({
        x: x + offsetX, y: y + offsetY, radius: particleSize, fill: color,
        opacity: isPermanent ? config.permanentOpacity : 0.8,
        shadowColor: color, shadowBlur: isPermanent ? 4 : 12, shadowOpacity: isPermanent ? 0.4 : 0.8,
        effectId, createdAt: Date.now(), isPermanent
      });
      
      this.layer.add(particle);
      
      if (isPermanent) {
        this.trackPermanentTrace(particle, config);
      } else {
        elements.push(particle);
        this.animateNeon(particle, config.duration, i);
      }
    }
    this.trackEffect(effectId, elements, config.duration);
  }

  createWatercolor(x, y, color, size, config, effectId) {
    const elements = [];
    for (let i = 0; i < config.drops; i++) {
      const offsetX = (Math.random() - 0.5) * size * 0.6;
      const offsetY = (Math.random() - 0.5) * size * 0.6;
      const dropSize = size * (0.4 + Math.random() * 0.6);
      const isPermanent = Math.random() < 0.4;
      
      const drop = new Konva.Circle({
        x: x + offsetX, y: y + offsetY, radius: dropSize, fill: color,
        opacity: isPermanent ? config.permanentOpacity : 0.3,
        scaleX: 0.8 + Math.random() * 0.4, scaleY: 0.6 + Math.random() * 0.4,
        effectId, createdAt: Date.now(), isPermanent
      });
      
      this.layer.add(drop);
      
      if (isPermanent) {
        drop.to({ radius: dropSize * 1.8, scaleX: drop.scaleX() * 1.3, scaleY: drop.scaleY() * 1.2, duration: 2, easing: Konva.Easings.EaseOut });
        this.trackPermanentTrace(drop, config);
      } else {
        elements.push(drop);
        this.animateWatercolor(drop, config.duration, i);
      }
    }
    this.trackEffect(effectId, elements, config.duration);
  }

  createElectric(x, y, color, size, config, effectId) {
    const elements = [];
    for (let i = 0; i < config.bolts; i++) {
      const points = [x, y];
      let currentX = x, currentY = y;
      
      for (let j = 0; j < config.segments; j++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = (Math.random() * size * 0.8) + (size * 0.3);
        currentX += Math.cos(angle) * distance;
        currentY += Math.sin(angle) * distance;
        points.push(currentX, currentY);
      }
      
      const isPermanent = Math.random() < 0.3;
      
      const bolt = new Konva.Line({
        points, stroke: color,
        strokeWidth: isPermanent ? 0.8 : (1.5 + Math.random() * 2),
        opacity: isPermanent ? config.permanentOpacity : 0.8,
        lineCap: 'round', lineJoin: 'round',
        shadowColor: color, shadowBlur: isPermanent ? 3 : 8, shadowOpacity: isPermanent ? 0.4 : 0.6,
        effectId, createdAt: Date.now(), isPermanent
      });
      
      this.layer.add(bolt);
      
      if (isPermanent) {
        this.trackPermanentTrace(bolt, config);
      } else {
        elements.push(bolt);
        this.animateElectric(bolt, config.duration, i);
      }
    }
    this.trackEffect(effectId, elements, config.duration);
  }

  createFire(x, y, color, size, config, effectId) {
    const elements = [];
    for (let i = 0; i < config.flames; i++) {
      const offsetX = (Math.random() - 0.5) * size * 0.7;
      const offsetY = (Math.random() - 0.5) * size * 0.4;
      const isPermanent = Math.random() < 0.3;
      
      const flame = new Konva.Ellipse({
        x: x + offsetX, y: y + offsetY,
        radiusX: isPermanent ? 2 : (3 + Math.random() * 3),
        radiusY: isPermanent ? 3 : (6 + Math.random() * 4),
        fill: color, opacity: isPermanent ? config.permanentOpacity : 0.7,
        shadowColor: '#FF4500', shadowBlur: isPermanent ? 2 : 10, shadowOpacity: isPermanent ? 0.3 : 0.5,
        effectId, createdAt: Date.now(), isPermanent
      });
      
      this.layer.add(flame);
      
      if (isPermanent) {
        this.trackPermanentTrace(flame, config);
      } else {
        elements.push(flame);
        this.animateFire(flame, config.duration, i);
      }
    }
    this.trackEffect(effectId, elements, config.duration);
  }

  createPetals(x, y, color, size, config, effectId) {
    const elements = [];
    for (let i = 0; i < config.count; i++) {
      const offsetX = (Math.random() - 0.5) * size * 0.8;
      const offsetY = (Math.random() - 0.5) * size * 0.8;
      const petalSize = size * (0.3 + Math.random() * 0.4);
      const isPermanent = Math.random() < 0.4;
      
      const petal = new Konva.Ellipse({
        x: x + offsetX, y: y + offsetY,
        radiusX: petalSize, radiusY: petalSize * 0.5, fill: color,
        opacity: isPermanent ? config.permanentOpacity : (0.7 + Math.random() * 0.2),
        rotation: Math.random() * 360,
        scaleX: 0.8 + Math.random() * 0.4, scaleY: 0.6 + Math.random() * 0.4,
        effectId, createdAt: Date.now(), isPermanent
      });
      
      this.layer.add(petal);
      
      if (isPermanent) {
        this.trackPermanentTrace(petal, config);
      } else {
        elements.push(petal);
        this.animatePetals(petal, config.duration, i, size);
      }
    }
    this.trackEffect(effectId, elements, config.duration);
  }

  // Animations (identiques à la version publique mais avec paramètres medium)
  animateSparkle(sparkle, duration, index) {
    const animation = new Konva.Animation((frame) => {
      const progress = frame.time / duration;
      const scale = 0.8 + Math.sin(frame.time * 0.01 + index * 0.5) * 0.4;
      const rotation = sparkle.rotation() + 3;
      const opacity = Math.max(0, 0.9 - progress * 0.8);
      
      sparkle.scaleX(scale).scaleY(scale).rotation(rotation).opacity(opacity);
      
      if (progress >= 1 || opacity <= 0) {
        sparkle.destroy();
        animation.stop();
      }
    }, this.layer);
    animation.start();
  }

  animateNeon(particle, duration, index) {
    const animation = new Konva.Animation((frame) => {
      const progress = frame.time / duration;
      const glow = 8 + Math.sin(frame.time * 0.012 + index * 0.7) * 6;
      const opacity = Math.max(0, 0.8 - progress * 0.6);
      const pulse = 1 + Math.sin(frame.time * 0.008 + index) * 0.3;
      
      particle.shadowBlur(glow).opacity(opacity).scaleX(pulse).scaleY(pulse);
      
      if (progress >= 1 || opacity <= 0) {
        particle.destroy();
        animation.stop();
      }
    }, this.layer);
    animation.start();
  }

  animateWatercolor(drop, duration, index) {
    const animation = new Konva.Animation((frame) => {
      const progress = frame.time / duration;
      const expansion = 1 + progress * 2;
      const opacity = Math.max(0, 0.3 - progress * 0.15);
      const organic = Math.sin(frame.time * 0.004 + index) * 0.15;
      
      drop.scaleX(expansion + organic).scaleY(expansion + organic * 0.6).opacity(opacity);
      
      if (progress >= 1 || opacity <= 0) {
        drop.destroy();
        animation.stop();
      }
    }, this.layer);
    animation.start();
  }

  animateElectric(bolt, duration, index) {
    const animation = new Konva.Animation((frame) => {
      const progress = frame.time / duration;
      const flicker = 0.4 + Math.sin(frame.time * 0.08 + index * 2) * 0.6;
      const glow = 5 + Math.sin(frame.time * 0.06 + index) * 4;
      const opacity = Math.max(0, 0.8 - progress * 0.6);
      
      bolt.opacity(flicker * opacity).shadowBlur(glow);
      
      if (progress >= 1 || opacity <= 0) {
        bolt.destroy();
        animation.stop();
      }
    }, this.layer);
    animation.start();
  }

  animateFire(flame, duration, index) {
    const animation = new Konva.Animation((frame) => {
      const progress = frame.time / duration;
      const flicker = 0.8 + Math.sin(frame.time * 0.025 + index * 0.6) * 0.3;
      const rise = flame.y() - 1.2;
      const sway = Math.sin(frame.time * 0.018 + index) * 2;
      const opacity = Math.max(0, 0.7 - progress * 0.5);
      
      flame.scaleX(flicker).scaleY(flicker * 1.2).y(rise).x(flame.x() + sway * 0.1).opacity(opacity);
      
      if (progress >= 1 || opacity <= 0) {
        flame.destroy();
        animation.stop();
      }
    }, this.layer);
    animation.start();
  }

  animatePetals(petal, duration, index, size) {
    const animation = new Konva.Animation((frame) => {
      const progress = frame.time / duration;
      const rotation = petal.rotation() + 2;
      const fall = petal.y() + 1.5;
      const sway = Math.sin(frame.time * 0.015 + index) * 2;
      const opacity = Math.max(0, petal.opacity() - progress * 0.25);
      const flutter = 0.9 + Math.sin(frame.time * 0.02 + index) * 0.2;
      
      petal.rotation(rotation).y(fall).x(petal.x() + sway * 0.05)
           .opacity(opacity).scaleX(flutter).scaleY(flutter * 0.7);
      
      if (progress >= 1 || opacity <= 0) {
        petal.destroy();
        animation.stop();
      }
    }, this.layer);
    animation.start();
  }

  trackPermanentTrace(element, config) {
    if (this.permanentCount >= this.maxPermanent) {
      const oldestId = this.permanentTraces.keys().next().value;
      if (oldestId) {
        const oldTrace = this.permanentTraces.get(oldestId);
        if (oldTrace.element && !oldTrace.element.isDestroyed()) {
          oldTrace.element.destroy();
        }
        this.permanentTraces.delete(oldestId);
        this.permanentCount--;
      }
    }
    
    const traceId = Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    this.permanentTraces.set(traceId, {
      element, createdAt: Date.now(), config,
      fadeStartTime: config.fadeStartTime * 1000,
      totalLifetime: 60000
    });
    this.permanentCount++;
    this.startAgingProcess(traceId);
  }

  startAgingProcess(traceId) {
    const trace = this.permanentTraces.get(traceId);
    if (!trace) return;
    
    const checkAging = () => {
      const currentTrace = this.permanentTraces.get(traceId);
      if (!currentTrace || !currentTrace.element || currentTrace.element.isDestroyed()) return;
      
      const age = Date.now() - currentTrace.createdAt;
      const element = currentTrace.element;
      
      if (age >= currentTrace.totalLifetime) {
        element.to({
          opacity: 0, duration: 5,
          onFinish: () => {
            if (!element.isDestroyed()) element.destroy();
            this.permanentTraces.delete(traceId);
            this.permanentCount--;
          }
        });
        return;
      }
      
      if (age > currentTrace.fadeStartTime) {
        if (age < 30000) {
          const fadeProgress = (age - currentTrace.fadeStartTime) / (30000 - currentTrace.fadeStartTime);
          const targetOpacity = currentTrace.config.permanentOpacity * (1 - fadeProgress * 0.5);
          element.opacity(targetOpacity);
          if (element.shadowBlur && element.shadowBlur() > 1) {
            element.shadowBlur(Math.max(1, element.shadowBlur() * (1 - fadeProgress * 0.3)));
          }
        } else if (age < 60000) {
          const finalFadeProgress = (age - 30000) / 30000;
          const targetOpacity = currentTrace.config.permanentOpacity * 0.5 * (1 - finalFadeProgress * 0.8);
          element.opacity(targetOpacity);
          if (element.shadowBlur && element.shadowBlur() > 0.5) {
            element.shadowBlur(Math.max(0.5, element.shadowBlur() * (1 - finalFadeProgress * 0.5)));
          }
        }
      }
      setTimeout(checkAging, 2000);
    };
    setTimeout(checkAging, trace.fadeStartTime);
  }

  trackEffect(effectId, elements, duration) {
    this.activeEffects.set(effectId, { elements, timestamp: Date.now(), duration });
    setTimeout(() => this.removeEffect(effectId), duration + 1000);
    this.layer.batchDraw();
  }

  removeEffect(effectId) {
    const effect = this.activeEffects.get(effectId);
    if (effect) {
      effect.elements.forEach(el => { if (!el.isDestroyed()) el.destroy(); });
      this.activeEffects.delete(effectId);
    }
  }

  cleanup() {
    const now = Date.now();
    const expired = [];
    
    this.activeEffects.forEach((effect, effectId) => {
      if (now - effect.timestamp > effect.duration + 5000) {
        expired.push(effectId);
      }
    });
    
    expired.forEach(id => this.removeEffect(id));
    
    const expiredTraces = [];
    this.permanentTraces.forEach((trace, traceId) => {
      if (now - trace.createdAt > trace.totalLifetime + 10000) {
        expiredTraces.push(traceId);
      }
    });
    
    expiredTraces.forEach(id => {
      const trace = this.permanentTraces.get(id);
      if (trace && trace.element && !trace.element.isDestroyed()) {
        trace.element.destroy();
      }
      this.permanentTraces.delete(id);
      this.permanentCount--;
    });
    
    this.layer.batchDraw();
  }

  clearPermanentTraces() {
    this.permanentTraces.forEach((trace) => {
      if (trace.element && !trace.element.isDestroyed()) {
        trace.element.destroy();
      }
    });
    this.permanentTraces.clear();
    this.permanentCount = 0;
  }

  cleanupUserEffects(socketId) {
    this.activeEffects.forEach((effect, effectId) => {
      if (effect.socketId === socketId) {
        this.removeEffect(effectId);
      }
    });
  }
}

// === RESTE DU CODE ATELIER.JS ===

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

// Initialisation du BrushManager
const brushManager = new BrushManager('atelier', layer, socket);
console.log('🎯 BrushManager atelier loaded and ready!');

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

// Coordonnées sans transformation par le zoom pour les événements réseau
function getScenePos(pointer) {
  return { x: pointer.x, y: pointer.y };
}

// Coordonnées pour le dessin local (avec transformation zoom)
function getLocalScenePos(pointer) {
  return {
    x: (pointer.x - stage.x()) / stage.scaleX(),
    y: (pointer.y - stage.y()) / stage.scaleY()
  };
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

// Fonctions pour créer des formes
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
  
  if (currentTool === 'pan') {
    lastPanPos = pointer;
    return;
  }

  if (currentTool === 'eyedropper') {
    const localPos = getLocalScenePos(pointer);
    pickColor(localPos.x, localPos.y);
    return;
  }

  // Formes prédéfinies
  if (currentTool.startsWith('shape-')) {
    isCreatingShape = true;
    shapeStartPos = getLocalScenePos(pointer);
    return;
  }

  const pressure = getPressure(evt);
  const pressureSize = getPressureSize(pressure);

  const networkPos = getScenePos(pointer);
  const localPos = getLocalScenePos(pointer);

  if (currentTool === 'texture') {
    isDrawing = true;
    currentId = generateId();
    emitTextureThrottled({ x: networkPos.x, y: networkPos.y, color: currentColor, size: pressureSize });
    createTextureEffect(localPos.x, localPos.y, currentColor, pressureSize);
    return;
  }

  // BRUSH ANIMÉS - Utilise le BrushManager intégré
  if (['sparkles', 'watercolor', 'electric', 'petals', 'neon', 'fire'].includes(currentTool)) {
    isDrawing = true;
    currentId = generateId();
    brushManager.createAndEmitEffect(currentTool, networkPos.x, networkPos.y, currentColor, pressureSize);
    return;
  }

  // Dessin normal
  isDrawing = true;
  currentId = generateId();
  lastLine = new Konva.Line({
    id: currentId,
    points: [localPos.x, localPos.y],
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

    const localPos = getLocalScenePos(pointer);

    switch(currentTool) {
      case 'shape-circle':
        shapePreview = createCircle(shapeStartPos, localPos);
        break;
      case 'shape-rectangle':
        shapePreview = createRectangle(shapeStartPos, localPos);
        break;
      case 'shape-line':
        shapePreview = createLine(shapeStartPos, localPos);
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
  
  const networkPos = getScenePos(pointer);
  const localPos = getLocalScenePos(pointer);

  if (currentTool === 'texture') {
    emitTextureThrottled({ x: networkPos.x, y: networkPos.y, color: currentColor, size: pressureSize });
    createTextureEffect(localPos.x, localPos.y, currentColor, pressureSize);
    return;
  }

  // BRUSH ANIMÉS - Continuer l'effet
  if (['sparkles', 'watercolor', 'electric', 'petals', 'neon', 'fire'].includes(currentTool)) {
    brushManager.createAndEmitEffect(currentTool, networkPos.x, networkPos.y, currentColor, pressureSize);
    return;
  }

  // Dessin normal
  if (lastLine) {
    lastLine.points(lastLine.points().concat([localPos.x, localPos.y]));
    lastLine.strokeWidth(pressureSize);
    layer.batchDraw();

    emitDrawingThrottled({
      id: currentId,
      points: lastLine.points(),
      stroke: lastLine.stroke(),
      strokeWidth: lastLine.strokeWidth(),
      globalCompositeOperation: lastLine.globalCompositeOperation()
    });
  }
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

  // Événement final pour le dessin normal
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

// === SOCKET LISTENERS ===

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
  if (!shape) {
    shape = new Konva.Line({
      id: data.id,
      points: data.points,
      stroke: data.stroke,
      strokeWidth: data.strokeWidth,
      globalCompositeOperation: data.globalCompositeOperation,
      lineCap: 'round',
      lineJoin: 'round'
    });
    layer.add(shape);
  } else {
    shape.points(data.points);
  }
  layer.batchDraw();
});

// BRUSH EFFECTS - Utilise le BrushManager intégré
socket.on('brushEffect', (data) => {
  brushManager.createNetworkEffect(data);
});

socket.on('cleanupUserEffects', (data) => {
  brushManager.cleanupUserEffects(data.socketId);
});

socket.on('texture', data => createTextureEffect(data.x, data.y, data.color, data.size));

socket.on('draw', data => {
  let shape = layer.findOne('#' + data.id);
  if (shape) {
    shape.points(data.points);
    shape.stroke(data.stroke);
    shape.strokeWidth(data.strokeWidth);
    shape.globalCompositeOperation(data.globalCompositeOperation);
  } else {
    layer.add(new Konva.Line({
      id: data.id,
      points: data.points,
      stroke: data.stroke,
      strokeWidth: data.strokeWidth,
      globalCompositeOperation: data.globalCompositeOperation,
      lineCap: 'round',
      lineJoin: 'round'
    }));
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
  brushManager.clearPermanentTraces();
  layer.draw();
});

socket.on('restoreShapes', (shapes) => {
  layer.destroyChildren();
  brushManager.clearPermanentTraces();
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

// RACCOURCIS ET NAVIGATION
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

console.log('✅ Atelier.js loaded with integrated BrushManager (medium quality)');