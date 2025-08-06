// public/app.js - VERSION AVEC BRUSHMANAGER AMÉLIORÉ
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

// === BRUSHMANAGER AMÉLIORÉ INTÉGRÉ DIRECTEMENT ===
class BrushManager {
  constructor(clientType, layer, socket) {
    this.clientType = clientType;
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
    // Performance monitoring périodique
    setInterval(() => this.adaptQualityToPerformance(), 30000);
    console.log(`✅ Enhanced BrushManager ready for ${clientType} with quality:`, this.config.quality);
  }

  getConfig() {
    const configs = {
      public: {
        quality: 'enhanced_low',
        maxPermanent: 120, // Augmenté de 100 → 120
        throttleTime: 400, // Réduit de 500 → 400ms
        cleanupInterval: 20000,
        effects: {
          sparkles: { 
            particles: 4, // Augmenté de 2 → 4
            duration: 1200, // Augmenté de 800 → 1200ms
            permanentOpacity: 0.12, // Augmenté de 0.05 → 0.12
            fadeStartTime: 15, // Augmenté de 10 → 15s
            sizeMultiplier: 1.8
          },
          neon: { 
            particles: 4, duration: 1400, permanentOpacity: 0.15, 
            fadeStartTime: 15, sizeMultiplier: 1.6
          },
          watercolor: { 
            drops: 3, duration: 1500, permanentOpacity: 0.08, 
            fadeStartTime: 15, sizeMultiplier: 1.4
          },
          electric: { 
            bolts: 2, segments: 4, duration: 1100, permanentOpacity: 0.10, 
            fadeStartTime: 15, sizeMultiplier: 1.3
          },
          fire: { 
            flames: 4, duration: 1200, permanentOpacity: 0.06, 
            fadeStartTime: 15, sizeMultiplier: 1.5
          },
          petals: { 
            count: 3, duration: 2200, permanentOpacity: 0.09, 
            fadeStartTime: 15, sizeMultiplier: 1.3
          }
        }
      }
    };
    return configs[this.clientType] || configs.public;
  }

  createAndEmitEffect(type, x, y, color, size) {
    const now = Date.now();
    if (now - this.lastEmit < this.throttleTime) return;
    
    this.createLocalEffect(type, x, y, color, size);
    
    if (this.socket) {
      this.socket.emit('brushEffect', {
        type, x, y, color, size,
        interface: this.clientType,
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
    
    const effectId = `${this.clientType}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    switch(type) {
      case 'sparkles': this.createSparkles(x, y, color, size, effectConfig, effectId); break;
      case 'neon': this.createNeon(x, y, color, size, effectConfig, effectId); break;
      case 'watercolor': this.createWatercolor(x, y, color, size, effectConfig, effectId); break;
      case 'electric': this.createElectricTrace(x, y, color, size, effectConfig, effectId); break;
      case 'fire': this.createFire(x, y, color, size, effectConfig, effectId); break;
      case 'petals': this.createPetals(x, y, color, size, effectConfig, effectId); break;
    }
  }

  createSparkles(x, y, color, size, config, effectId) {
    const elements = [];
    const enhancedSize = size * config.sizeMultiplier;
    
    for (let i = 0; i < config.particles; i++) {
      const offsetX = (Math.random() - 0.5) * enhancedSize * 2.0;
      const offsetY = (Math.random() - 0.5) * enhancedSize * 2.0;
      const sparkleSize = 2 + Math.random() * 6;
      const isPermanent = Math.random() < 0.5;
      
      const sparkle = new Konva.Star({
        x: x + offsetX, y: y + offsetY,
        numPoints: 4, innerRadius: sparkleSize * 0.4, outerRadius: sparkleSize,
        fill: color, rotation: Math.random() * 360,
        opacity: isPermanent ? config.permanentOpacity : 1.0,
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
    const enhancedSize = size * config.sizeMultiplier;
    
    for (let i = 0; i < config.particles; i++) {
      const offsetX = (Math.random() - 0.5) * enhancedSize * 1.2;
      const offsetY = (Math.random() - 0.5) * enhancedSize * 1.2;
      const particleSize = 3 + Math.random() * 5;
      const isPermanent = Math.random() < 0.5;
      
      const particle = new Konva.Circle({
        x: x + offsetX, y: y + offsetY, radius: particleSize, fill: color,
        opacity: isPermanent ? config.permanentOpacity : 0.9,
        shadowColor: color, shadowBlur: isPermanent ? 8 : 18, shadowOpacity: isPermanent ? 0.6 : 0.9,
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
    const enhancedSize = size * config.sizeMultiplier;
    
    for (let i = 0; i < config.drops; i++) {
      const offsetX = (Math.random() - 0.5) * enhancedSize * 1.0;
      const offsetY = (Math.random() - 0.5) * enhancedSize * 1.0;
      const dropSize = enhancedSize * (0.6 + Math.random() * 0.8);
      const isPermanent = Math.random() < 0.5;
      
      const drop = new Konva.Circle({
        x: x + offsetX, y: y + offsetY, radius: dropSize, fill: color,
        opacity: isPermanent ? config.permanentOpacity : 0.5,
        scaleX: 0.8 + Math.random() * 0.6, scaleY: 0.6 + Math.random() * 0.6,
        effectId, createdAt: Date.now(), isPermanent
      });
      
      this.layer.add(drop);
      
      if (isPermanent) {
        drop.to({ radius: dropSize * 2.5, scaleX: drop.scaleX() * 1.6, scaleY: drop.scaleY() * 1.5, duration: 3, easing: Konva.Easings.EaseOut });
        this.trackPermanentTrace(drop, config);
      } else {
        elements.push(drop);
        this.animateWatercolor(drop, config.duration, i);
      }
    }
    this.trackEffect(effectId, elements, config.duration);
  }

  // NOUVEAU : Electric avec tracé déformé
  createElectricTrace(x, y, color, size, config, effectId) {
    const elements = [];
    const enhancedSize = size * config.sizeMultiplier;
    
    for (let i = 0; i < config.bolts; i++) {
      const points = this.generateElectricPath(x, y, enhancedSize, config.segments);
      const isPermanent = Math.random() < 0.4;
      
      const bolt = new Konva.Line({
        points, stroke: color,
        strokeWidth: isPermanent ? 1.5 : (2.5 + Math.random() * 4),
        opacity: isPermanent ? config.permanentOpacity : 0.9,
        lineCap: 'round', lineJoin: 'round',
        shadowColor: color, shadowBlur: isPermanent ? 6 : 15, shadowOpacity: isPermanent ? 0.6 : 0.8,
        effectId, createdAt: Date.now(), isPermanent,
        originalPoints: [...points], animationOffset: Math.random() * Math.PI * 2
      });
      
      this.layer.add(bolt);
      
      if (isPermanent) {
        this.trackPermanentTrace(bolt, config);
      } else {
        elements.push(bolt);
        this.animateElectricTrace(bolt, config.duration, i);
      }
    }
    this.trackEffect(effectId, elements, config.duration);
  }

  generateElectricPath(startX, startY, size, segments) {
    const points = [startX, startY];
    let currentX = startX, currentY = startY;
    
    for (let i = 0; i < segments; i++) {
      const baseAngle = Math.random() * Math.PI * 2;
      const deviation = (Math.random() - 0.5) * Math.PI * 0.8;
      const angle = baseAngle + deviation;
      
      const distance = (Math.random() * size * 1.2) + (size * 0.4);
      const nextX = currentX + Math.cos(angle) * distance;
      const nextY = currentY + Math.sin(angle) * distance;
      
      const midX = (currentX + nextX) / 2 + (Math.random() - 0.5) * size * 0.3;
      const midY = (currentY + nextY) / 2 + (Math.random() - 0.5) * size * 0.3;
      
      points.push(midX, midY, nextX, nextY);
      currentX = nextX;
      currentY = nextY;
    }
    
    return points;
  }

  createFire(x, y, color, size, config, effectId) {
    const elements = [];
    const enhancedSize = size * config.sizeMultiplier;
    
    for (let i = 0; i < config.flames; i++) {
      const offsetX = (Math.random() - 0.5) * enhancedSize * 1.0;
      const offsetY = (Math.random() - 0.5) * enhancedSize * 0.6;
      const isPermanent = Math.random() < 0.4;
      
      const flame = new Konva.Ellipse({
        x: x + offsetX, y: y + offsetY,
        radiusX: isPermanent ? 4 : (5 + Math.random() * 6),
        radiusY: isPermanent ? 6 : (10 + Math.random() * 8),
        fill: color, opacity: isPermanent ? config.permanentOpacity : 0.8,
        shadowColor: '#FF4500', shadowBlur: isPermanent ? 5 : 16, shadowOpacity: isPermanent ? 0.5 : 0.7,
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
    const enhancedSize = size * config.sizeMultiplier;
    
    for (let i = 0; i < config.count; i++) {
      const offsetX = (Math.random() - 0.5) * enhancedSize * 1.2;
      const offsetY = (Math.random() - 0.5) * enhancedSize * 1.2;
      const petalSize = enhancedSize * (0.5 + Math.random() * 0.6);
      const isPermanent = Math.random() < 0.5;
      
      const petal = new Konva.Ellipse({
        x: x + offsetX, y: y + offsetY,
        radiusX: petalSize, radiusY: petalSize * 0.6, fill: color,
        opacity: isPermanent ? config.permanentOpacity : (0.8 + Math.random() * 0.2),
        rotation: Math.random() * 360,
        scaleX: 0.8 + Math.random() * 0.6, scaleY: 0.6 + Math.random() * 0.6,
        effectId, createdAt: Date.now(), isPermanent
      });
      
      this.layer.add(petal);
      
      if (isPermanent) {
        this.trackPermanentTrace(petal, config);
      } else {
        elements.push(petal);
        this.animatePetals(petal, config.duration, i, enhancedSize);
      }
    }
    this.trackEffect(effectId, elements, config.duration);
  }

  // ANIMATIONS AMÉLIORÉES
  animateSparkle(sparkle, duration, index) {
    const animation = new Konva.Animation((frame) => {
      const progress = frame.time / duration;
      const randomFactor = 0.3 + Math.random() * 0.4;
      const scale = 0.9 + Math.sin(frame.time * (0.008 + randomFactor * 0.004) + index * 0.6) * 0.6;
      const rotation = sparkle.rotation() + (2.5 + Math.random() * 2);
      const opacity = Math.max(0, 1.0 - progress * (0.6 + Math.random() * 0.3));
      
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
      const randomFactor = 0.5 + Math.random() * 0.5;
      const glow = 12 + Math.sin(frame.time * (0.01 + randomFactor * 0.005) + index * 0.8) * 10;
      const opacity = Math.max(0, 0.9 - progress * (0.4 + Math.random() * 0.2));
      const pulse = 1 + Math.sin(frame.time * (0.006 + randomFactor * 0.003) + index) * 0.5;
      
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
      const expansion = 1 + progress * (2.8 + Math.random() * 0.7);
      const opacity = Math.max(0, 0.5 - progress * (0.15 + Math.random() * 0.1));
      const organic = Math.sin(frame.time * (0.003 + Math.random() * 0.002) + index) * 0.3;
      
      drop.scaleX(expansion + organic).scaleY(expansion + organic * 0.7).opacity(opacity);
      
      if (progress >= 1 || opacity <= 0) {
        drop.destroy();
        animation.stop();
      }
    }, this.layer);
    animation.start();
  }

  animateElectricTrace(bolt, duration, index) {
    const originalPoints = bolt.originalPoints;
    const animationOffset = bolt.animationOffset;
    
    const animation = new Konva.Animation((frame) => {
      const progress = frame.time / duration;
      const flicker = 0.5 + Math.sin(frame.time * (0.06 + Math.random() * 0.04) + index * 2) * 0.5;
      const glow = 10 + Math.sin(frame.time * (0.04 + Math.random() * 0.02) + index) * 8;
      const opacity = Math.max(0, 0.9 - progress * (0.4 + Math.random() * 0.2));
      
      const deformedPoints = [];
      for (let i = 0; i < originalPoints.length; i += 2) {
        const x = originalPoints[i];
        const y = originalPoints[i + 1];
        const deformX = Math.sin(frame.time * 0.01 + animationOffset + i * 0.1) * 3;
        const deformY = Math.cos(frame.time * 0.012 + animationOffset + i * 0.1) * 2;
        deformedPoints.push(x + deformX, y + deformY);
      }
      
      bolt.points(deformedPoints);
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
      const randomFactor = 0.4 + Math.random() * 0.6;
      const flicker = 0.9 + Math.sin(frame.time * (0.02 + randomFactor * 0.01) + index * 0.7) * 0.3;
      const rise = flame.y() - (1.8 + Math.random() * 0.8);
      const sway = Math.sin(frame.time * (0.015 + randomFactor * 0.005) + index) * (3 + Math.random());
      const opacity = Math.max(0, 0.8 - progress * (0.3 + Math.random() * 0.2));
      
      flame.scaleX(flicker).scaleY(flicker * 1.4).y(rise).x(flame.x() + sway * 0.15).opacity(opacity);
      
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
      const randomFactor = 0.3 + Math.random() * 0.7;
      const rotation = petal.rotation() + (1.8 + Math.random() * 1.2);
      const fall = petal.y() + (2.0 + Math.random() * 0.8);
      const sway = Math.sin(frame.time * (0.012 + randomFactor * 0.006) + index) * (3 + Math.random());
      const opacity = Math.max(0, petal.opacity() - progress * (0.18 + Math.random() * 0.1));
      const flutter = 0.8 + Math.sin(frame.time * (0.015 + randomFactor * 0.008) + index) * 0.3;
      
      petal.rotation(rotation).y(fall).x(petal.x() + sway * 0.08)
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
      totalLifetime: 90000, // 90 secondes pour public
      qualityLevel: this.clientType
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
          opacity: 0, duration: 6, easing: Konva.Easings.EaseOut,
          onFinish: () => {
            if (!element.isDestroyed()) element.destroy();
            this.permanentTraces.delete(traceId);
            this.permanentCount--;
          }
        });
        return;
      }
      
      if (age > currentTrace.fadeStartTime) {
        const midLifetime = currentTrace.totalLifetime * 0.6;
        
        if (age < midLifetime) {
          const fadeProgress = (age - currentTrace.fadeStartTime) / (midLifetime - currentTrace.fadeStartTime);
          const targetOpacity = currentTrace.config.permanentOpacity * (1 - fadeProgress * 0.3);
          element.opacity(targetOpacity);
          if (element.shadowBlur && element.shadowBlur() > 2) {
            element.shadowBlur(Math.max(2, element.shadowBlur() * (1 - fadeProgress * 0.2)));
          }
        } else {
          const finalFadeProgress = (age - midLifetime) / (currentTrace.totalLifetime - midLifetime);
          const targetOpacity = currentTrace.config.permanentOpacity * 0.7 * (1 - finalFadeProgress * 0.7);
          element.opacity(targetOpacity);
          if (element.shadowBlur && element.shadowBlur() > 1) {
            element.shadowBlur(Math.max(1, element.shadowBlur() * (1 - finalFadeProgress * 0.4)));
          }
        }
      }
      setTimeout(checkAging, 2500);
    };
    setTimeout(checkAging, trace.fadeStartTime);
  }

  trackEffect(effectId, elements, duration) {
    this.activeEffects.set(effectId, { elements, timestamp: Date.now(), duration, qualityLevel: this.clientType });
    setTimeout(() => this.removeEffect(effectId), duration + 2000);
    this.layer.batchDraw();
  }

  removeEffect(effectId) {
    const effect = this.activeEffects.get(effectId);
    if (effect) {
      effect.elements.forEach(el => { 
        if (!el.isDestroyed()) {
          el.to({
            opacity: 0, duration: 0.5,
            onFinish: () => { if (!el.isDestroyed()) el.destroy(); }
          });
        }
      });
      this.activeEffects.delete(effectId);
    }
  }

  cleanup() {
    const now = Date.now();
    const expired = [];
    
    this.activeEffects.forEach((effect, effectId) => {
      if (now - effect.timestamp > effect.duration + 4000) {
        expired.push(effectId);
      }
    });
    
    expired.forEach(id => this.removeEffect(id));
    
    const expiredTraces = [];
    this.permanentTraces.forEach((trace, traceId) => {
      if (now - trace.createdAt > trace.totalLifetime + 15000) {
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
    
    if (expired.length > 0 || expiredTraces.length > 0) {
      this.layer.batchDraw();
    }
  }

  adaptQualityToPerformance() {
    const totalElements = this.activeEffects.size + this.permanentCount;
    if (totalElements > this.maxPermanent * 0.8) {
      const oldElements = [];
      this.permanentTraces.forEach((trace, id) => {
        if (Date.now() - trace.createdAt > trace.totalLifetime * 0.7) {
          oldElements.push(id);
        }
      });
      
      oldElements.slice(0, Math.floor(oldElements.length * 0.3)).forEach(id => {
        const trace = this.permanentTraces.get(id);
        if (trace?.element && !trace.element.isDestroyed()) {
          trace.element.destroy();
        }
        this.permanentTraces.delete(id);
        this.permanentCount--;
      });
    }
  }

  clearPermanentTraces() {
    this.permanentTraces.forEach((trace) => {
      if (trace.element && !trace.element.isDestroyed()) {
        trace.element.destroy();
      }
    });
    this.permanentTraces.clear();
    this.permanentCount = 0;
    this.layer.batchDraw();
  }

  cleanupUserEffects(socketId) {
    this.activeEffects.forEach((effect, effectId) => {
      if (effect.socketId === socketId) {
        this.removeEffect(effectId);
      }
    });
  }
}

// === RESTE DU CODE APP.JS IDENTIQUE ===

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

// Initialisation du BrushManager amélioré
const brushManager = new BrushManager('public', layer, socket);
console.log('🎯 Enhanced BrushManager loaded and ready!');

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
    // Gestion spéciale pour le bouton undo
    if (btn.id === 'undo') {
      handleUndo();
      return;
    }
    
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTool = btn.id;
    
    const cursor = currentTool === 'pan' ? 'grab' : 'crosshair';
    stage.container().style.cursor = cursor;
  });
});

// Fonction pour gérer l'undo avec notification visuelle
function handleUndo() {
  socket.emit('undo');
  showUndoNotification();
}

// Fonction pour afficher une notification d'undo
function showUndoNotification() {
  const notification = document.createElement('div');
  notification.className = 'undo-notification';
  notification.textContent = 'Annulé ↶';
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 800);
}

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

// Raccourci Ctrl+Z pour undo avec notification
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault();
    handleUndo();
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

  // BRUSH ANIMÉS - Utilisation du BrushManager amélioré
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

  // BRUSH ANIMÉS - Continuer l'effet avec BrushManager amélioré
  if (['neon', 'fire', 'electric', 'sparkles', 'watercolor', 'petals'].includes(currentTool)) {
    brushManager.createAndEmitEffect(currentTool, scenePos.x, scenePos.y, currentColor, pressureSize);
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
  brushManager.createNetworkEffect(data);
});

// Nettoyage des effets d'un utilisateur déconnecté
socket.on('cleanupUserEffects', (data) => {
  brushManager.cleanupUserEffects(data.socketId);
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

// NOUVEL ÉVÉNEMENT - Reset des brush effects par admin
socket.on('adminResetBrushEffects', () => {
  brushManager.clearPermanentTraces();
  brushManager.activeEffects.clear();
  layer.batchDraw();
  
  // Notification pour informer l'utilisateur
  showUndoNotification('Effets réinitialisés par Admin ✨');
  console.log('🎨 Admin reset: All brush effects cleared');
});

console.log('✅ Enhanced App.js loaded for public interface with improved BrushManager');
console.log('🎯 All enhanced brush effects ready: bigger particles, longer duration, better visibility!');