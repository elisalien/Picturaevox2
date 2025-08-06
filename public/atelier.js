// public/atelier.js - VERSION AVEC BRUSHMANAGER AMÉLIORÉ
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

// === BRUSHMANAGER AMÉLIORÉ INTÉGRÉ DIRECTEMENT (VERSION ATELIER MEDIUM QUALITY) ===
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
    setInterval(() => this.adaptQualityToPerformance(), 30000);
    console.log(`✅ Enhanced BrushManager ready for ${clientType} with quality:`, this.config.quality);
  }

  getConfig() {
    const configs = {
      atelier: {
        quality: 'enhanced_medium',
        maxPermanent: 250, // Augmenté de 200 → 250
        throttleTime: 250, // Réduit de 300 → 250ms
        cleanupInterval: 25000,
        effects: {
          sparkles: { 
            particles: 6, // Augmenté de 4 → 6
            duration: 1600, // Augmenté de 1200 → 1600ms
            permanentOpacity: 0.18, // Augmenté de 0.08 → 0.18
            fadeStartTime: 20, // Augmenté de 15 → 20s
            sizeMultiplier: 2.0
          },
          neon: { 
            particles: 6, duration: 1800, permanentOpacity: 0.22, 
            fadeStartTime: 20, sizeMultiplier: 1.8
          },
          watercolor: { 
            drops: 5, duration: 2000, permanentOpacity: 0.12, 
            fadeStartTime: 20, sizeMultiplier: 1.6
          },
          electric: { 
            bolts: 3, segments: 6, duration: 1500, permanentOpacity: 0.14, 
            fadeStartTime: 20, sizeMultiplier: 1.5
          },
          fire: { 
            flames: 5, duration: 1600, permanentOpacity: 0.08, 
            fadeStartTime: 20, sizeMultiplier: 1.7
          },
          petals: { 
            count: 5, duration: 3000, permanentOpacity: 0.14, 
            fadeStartTime: 20, sizeMultiplier: 1.5
          }
        }
      }
    };
    return configs[this.clientType] || configs.atelier;
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
      const sparkleSize = 2.5 + Math.random() * 6.5; // Plus gros pour atelier
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
      const offsetX = (Math.random() - 0.5) * enhancedSize * 1.3;
      const offsetY = (Math.random() - 0.5) * enhancedSize * 1.3;
      const particleSize = 3.5 + Math.random() * 5.5; // Plus gros
      const isPermanent = Math.random() < 0.5;
      
      const particle = new Konva.Circle({
        x: x + offsetX, y: y + offsetY, radius: particleSize, fill: color,
        opacity: isPermanent ? config.permanentOpacity : 0.9,
        shadowColor: color, shadowBlur: isPermanent ? 10 : 20, shadowOpacity: isPermanent ? 0.7 : 0.9,
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
      const offsetX = (Math.random() - 0.5) * enhancedSize * 1.1;
      const offsetY = (Math.random() - 0.5) * enhancedSize * 1.1;
      const dropSize = enhancedSize * (0.7 + Math.random() * 0.9); // Plus gros
      const isPermanent = Math.random() < 0.5;
      
      const drop = new Konva.Circle({
        x: x + offsetX, y: y + offsetY, radius: dropSize, fill: color,
        opacity: isPermanent ? config.permanentOpacity : 0.6, // Plus visible
        scaleX: 0.8 + Math.random() * 0.7, scaleY: 0.6 + Math.random() * 0.7,
        effectId, createdAt: Date.now(), isPermanent
      });
      
      this.layer.add(drop);
      
      if (isPermanent) {
        drop.to({ 
          radius: dropSize * 2.7, 
          scaleX: drop.scaleX() * 1.7, 
          scaleY: drop.scaleY() * 1.6, 
          duration: 3.5, 
          easing: Konva.Easings.EaseOut 
        });
        this.trackPermanentTrace(drop, config);
      } else {
        elements.push(drop);
        this.animateWatercolor(drop, config.duration, i);
      }
    }
    this.trackEffect(effectId, elements, config.duration);
  }

  // NOUVEAU : Electric avec tracé déformé (version atelier)
  createElectricTrace(x, y, color, size, config, effectId) {
    const elements = [];
    const enhancedSize = size * config.sizeMultiplier;
    
    for (let i = 0; i < config.bolts; i++) {
      const points = this.generateElectricPath(x, y, enhancedSize, config.segments);
      const isPermanent = Math.random() < 0.4;
      
      const bolt = new Konva.Line({
        points, stroke: color,
        strokeWidth: isPermanent ? 2 : (3 + Math.random() * 4.5), // Plus épais pour atelier
        opacity: isPermanent ? config.permanentOpacity : 0.9,
        lineCap: 'round', lineJoin: 'round',
        shadowColor: color, shadowBlur: isPermanent ? 8 : 18, shadowOpacity: isPermanent ? 0.7 : 0.8,
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
      const deviation = (Math.random() - 0.5) * Math.PI * 0.9; // Plus de déviation
      const angle = baseAngle + deviation;
      
      const distance = (Math.random() * size * 1.3) + (size * 0.5); // Distance plus grande
      const nextX = currentX + Math.cos(angle) * distance;
      const nextY = currentY + Math.sin(angle) * distance;
      
      const midX = (currentX + nextX) / 2 + (Math.random() - 0.5) * size * 0.4;
      const midY = (currentY + nextY) / 2 + (Math.random() - 0.5) * size * 0.4;
      
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
      const offsetX = (Math.random() - 0.5) * enhancedSize * 1.1;
      const offsetY = (Math.random() - 0.5) * enhancedSize * 0.7;
      const isPermanent = Math.random() < 0.4;
      
      const flame = new Konva.Ellipse({
        x: x + offsetX, y: y + offsetY,
        radiusX: isPermanent ? 5 : (6 + Math.random() * 7), // Plus gros
        radiusY: isPermanent ? 8 : (12 + Math.random() * 9),
        fill: color, opacity: isPermanent ? config.permanentOpacity : 0.8,
        shadowColor: '#FF4500', shadowBlur: isPermanent ? 7 : 18, shadowOpacity: isPermanent ? 0.6 : 0.7,
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
      const offsetX = (Math.random() - 0.5) * enhancedSize * 1.3;
      const offsetY = (Math.random() - 0.5) * enhancedSize * 1.3;
      const petalSize = enhancedSize * (0.6 + Math.random() * 0.7); // Plus gros
      const isPermanent = Math.random() < 0.5;
      
      const petal = new Konva.Ellipse({
        x: x + offsetX, y: y + offsetY,
        radiusX: petalSize, radiusY: petalSize * 0.6, fill: color,
        opacity: isPermanent ? config.permanentOpacity : (0.8 + Math.random() * 0.2),
        rotation: Math.random() * 360,
        scaleX: 0.8 + Math.random() * 0.7, scaleY: 0.6 + Math.random() * 0.7,
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

  // ANIMATIONS AMÉLIORÉES (version atelier avec plus de variabilité)
  animateSparkle(sparkle, duration, index) {
    const animation = new Konva.Animation((frame) => {
      const progress = frame.time / duration;
      const randomFactor = 0.4 + Math.random() * 0.5; // Plus de variation
      const scale = 1.0 + Math.sin(frame.time * (0.009 + randomFactor * 0.005) + index * 0.7) * 0.7;
      const rotation = sparkle.rotation() + (3 + Math.random() * 2.5);
      const opacity = Math.max(0, 1.0 - progress * (0.5 + Math.random() * 0.3));
      
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
      const randomFactor = 0.6 + Math.random() * 0.6;
      const glow = 15 + Math.sin(frame.time * (0.011 + randomFactor * 0.006) + index * 0.9) * 12;
      const opacity = Math.max(0, 0.9 - progress * (0.35 + Math.random() * 0.2));
      const pulse = 1 + Math.sin(frame.time * (0.007 + randomFactor * 0.004) + index) * 0.6;
      
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
      const expansion = 1 + progress * (3.0 + Math.random() * 0.8); // Plus d'expansion
      const opacity = Math.max(0, 0.6 - progress * (0.18 + Math.random() * 0.12));
      const organic = Math.sin(frame.time * (0.004 + Math.random() * 0.003) + index) * 0.35;
      
      drop.scaleX(expansion + organic).scaleY(expansion + organic * 0.8).opacity(opacity);
      
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
      const flicker = 0.6 + Math.sin(frame.time * (0.07 + Math.random() * 0.05) + index * 2.2) * 0.4;
      const glow = 12 + Math.sin(frame.time * (0.045 + Math.random() * 0.025) + index) * 10;
      const opacity = Math.max(0, 0.9 - progress * (0.35 + Math.random() * 0.2));
      
      // Déformation du tracé plus prononcée pour atelier
      const deformedPoints = [];
      for (let i = 0; i < originalPoints.length; i += 2) {
        const x = originalPoints[i];
        const y = originalPoints[i + 1];
        const deformX = Math.sin(frame.time * 0.012 + animationOffset + i * 0.12) * 4;
        const deformY = Math.cos(frame.time * 0.014 + animationOffset + i * 0.12) * 3;
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
      const randomFactor = 0.5 + Math.random() * 0.7;
      const flicker = 0.9 + Math.sin(frame.time * (0.022 + randomFactor * 0.012) + index * 0.8) * 0.35;
      const rise = flame.y() - (2.0 + Math.random() * 1.0);
      const sway = Math.sin(frame.time * (0.016 + randomFactor * 0.006) + index) * (3.5 + Math.random() * 1.5);
      const opacity = Math.max(0, 0.8 - progress * (0.25 + Math.random() * 0.2));
      
      flame.scaleX(flicker).scaleY(flicker * 1.5).y(rise).x(flame.x() + sway * 0.18).opacity(opacity);
      
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
      const randomFactor = 0.4 + Math.random() * 0.8;
      const rotation = petal.rotation() + (2.0 + Math.random() * 1.5);
      const fall = petal.y() + (2.2 + Math.random() * 1.0);
      const sway = Math.sin(frame.time * (0.013 + randomFactor * 0.007) + index) * (3.5 + Math.random() * 1.5);
      const opacity = Math.max(0, petal.opacity() - progress * (0.15 + Math.random() * 0.1));
      const flutter = 0.8 + Math.sin(frame.time * (0.016 + randomFactor * 0.009) + index) * 0.35;
      
      petal.rotation(rotation).y(fall).x(petal.x() + sway * 0.1)
           .opacity(opacity).scaleX(flutter).scaleY(flutter * 0.75);
      
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
      totalLifetime: 126000, // 126 secondes pour atelier (40% plus que public)
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
          opacity: 0, duration: 7, easing: Konva.Easings.EaseOut,
          onFinish: () => {
            if (!element.isDestroyed()) element.destroy();
            this.permanentTraces.delete(traceId);
            this.permanentCount--;
          }
        });
        return;
      }
      
      if (age > currentTrace.fadeStartTime) {
        const midLifetime = currentTrace.totalLifetime * 0.65; // 65% pour atelier
        
        if (age < midLifetime) {
          const fadeProgress = (age - currentTrace.fadeStartTime) / (midLifetime - currentTrace.fadeStartTime);
          const targetOpacity = currentTrace.config.permanentOpacity * (1 - fadeProgress * 0.25); // Fade plus doux
          element.opacity(targetOpacity);
          if (element.shadowBlur && element.shadowBlur() > 3) {
            element.shadowBlur(Math.max(3, element.shadowBlur() * (1 - fadeProgress * 0.15)));
          }
        } else {
          const finalFadeProgress = (age - midLifetime) / (currentTrace.totalLifetime - midLifetime);
          const targetOpacity = currentTrace.config.permanentOpacity * 0.75 * (1 - finalFadeProgress * 0.65);
          element.opacity(targetOpacity);
          if (element.shadowBlur && element.shadowBlur() > 1.5) {
            element.shadowBlur(Math.max(1.5, element.shadowBlur() * (1 - finalFadeProgress * 0.35)));
          }
        }
      }
      setTimeout(checkAging, 2000); // Check plus fréquent pour atelier
    };
    setTimeout(checkAging, trace.fadeStartTime);
  }

  trackEffect(effectId, elements, duration) {
    this.activeEffects.set(effectId, { elements, timestamp: Date.now(), duration, qualityLevel: this.clientType });
    setTimeout(() => this.removeEffect(effectId), duration + 2500);
    this.layer.batchDraw();
  }

  removeEffect(effectId) {
    const effect = this.activeEffects.get(effectId);
    if (effect) {
      effect.elements.forEach(el => { 
        if (!el.isDestroyed()) {
          el.to({
            opacity: 0, duration: 0.7,
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
      if (now - effect.timestamp > effect.duration + 6000) { // Plus de grâce pour atelier
        expired.push(effectId);
      }
    });
    
    expired.forEach(id => this.removeEffect(id));
    
    const expiredTraces = [];
    this.permanentTraces.forEach((trace, traceId) => {
      if (now - trace.createdAt > trace.totalLifetime + 20000) {
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
    if (totalElements > this.maxPermanent * 0.85) {
      const oldElements = [];
      this.permanentTraces.forEach((trace, id) => {
        if (Date.now() - trace.createdAt > trace.totalLifetime * 0.75) {
          oldElements.push(id);
        }
      });
      
      oldElements.slice(0, Math.floor(oldElements.length * 0.25)).forEach(id => {
        const trace = this.permanentTraces.get(id);
        if (trace?.element && !trace.element.isDestroyed()) {
          trace.element.destroy();
        }
        this.permanentTraces.delete(id);
        this.permanentCount--;
      });
      
      console.log(`⚡ Atelier performance cleanup: removed ${oldElements.length} old elements`);
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

// Initialisation du BrushManager amélioré
const brushManager = new BrushManager('atelier', layer, socket);
console.log('🎯 Enhanced BrushManager atelier loaded and ready!');

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

// Effet texture (ancien système) amélioré pour atelier
function createTextureEffect(x, y, color, size) {
  for (let i = 0; i < 7; i++) { // Plus de particules pour atelier
    const offsetX = (Math.random() - 0.5) * 12;
    const offsetY = (Math.random() - 0.5) * 12;
    const alpha = 0.4 + Math.random() * 0.4; // Plus visible
    const dot = new Konva.Line({
      points: [x + offsetX, y + offsetY, x + offsetX + Math.random() * 3, y + offsetY + Math.random() * 3],
      stroke: color,
      strokeWidth: 1.5 + Math.random() * (size / 2.5), // Plus épais
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

function createTriangle(startPos, endPos) {
  const width = endPos.x - startPos.x;
  const height = endPos.y - startPos.y;
  return new Konva.Line({
    points: [startPos.x, endPos.y, startPos.x + width/2, startPos.y, endPos.x, endPos.y, startPos.x, endPos.y],
    stroke: currentColor, strokeWidth: currentSize, fill: 'transparent', closed: true
  });
}

function createStar(startPos, endPos) {
  const centerX = (startPos.x + endPos.x) / 2;
  const centerY = (startPos.y + endPos.y) / 2;
  const radius = Math.sqrt(Math.pow(endPos.x - centerX, 2) + Math.pow(endPos.y - centerY, 2));
  return new Konva.Star({
    x: centerX, y: centerY, numPoints: 5, innerRadius: radius * 0.4, outerRadius: radius,
    stroke: currentColor, strokeWidth: currentSize, fill: 'transparent'
  });
}

function createLine(startPos, endPos) {
  return new Konva.Line({
    points: [startPos.x, startPos.y, endPos.x, endPos.y],
    stroke: currentColor, strokeWidth: currentSize, lineCap: 'round'
  });
}

function createArrow(startPos, endPos) {
  const line = new Konva.Line({
    points: [startPos.x, startPos.y, endPos.x, endPos.y],
    stroke: currentColor, strokeWidth: currentSize, lineCap: 'round'
  });
  
  // Ajouter pointe de flèche
  const angle = Math.atan2(endPos.y - startPos.y, endPos.x - startPos.x);
  const arrowLength = 20;
  const arrowAngle = Math.PI / 6;
  
  const arrow1X = endPos.x - arrowLength * Math.cos(angle - arrowAngle);
  const arrow1Y = endPos.y - arrowLength * Math.sin(angle - arrowAngle);
  const arrow2X = endPos.x - arrowLength * Math.cos(angle + arrowAngle);
  const arrow2Y = endPos.y - arrowLength * Math.sin(angle + arrowAngle);
  
  line.points([startPos.x, startPos.y, endPos.x, endPos.y, arrow1X, arrow1Y, endPos.x, endPos.y, arrow2X, arrow2Y]);
  return line;
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

  // BRUSH ANIMÉS - Utilise le BrushManager amélioré
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
      case 'shape-triangle':
        shapePreview = createTriangle(shapeStartPos, localPos);
        break;
      case 'shape-star':
        shapePreview = createStar(shapeStartPos, localPos);
        break;
      case 'shape-line':
        shapePreview = createLine(shapeStartPos, localPos);
        break;
      case 'shape-arrow':
        shapePreview = createArrow(shapeStartPos, localPos);
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

// Boutons d'action
document.getElementById('export')?.addEventListener('click', () => {
  const uri = stage.toDataURL({ pixelRatio: 2 });
  const link = document.createElement('a');
  link.download = 'atelier-canvas.png';
  link.href = uri;
  link.click();
});

document.getElementById('back-home')?.addEventListener('click', () => {
  window.location.href = '/';
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

// BRUSH EFFECTS - Utilise le BrushManager amélioré
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
    case 'shape-triangle':
    case 'shape-line':
    case 'shape-arrow':
      shape = new Konva.Line(config);
      break;
    case 'shape-star':
      shape = new Konva.Star(config);
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
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(255, 140, 0, 0.9);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    z-index: 2000;
    animation: fadeInOut 2s ease-out;
    pointer-events: none;
  `;
  notification.textContent = '✨ Effets réinitialisés par Admin';
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 2000);
  
  console.log('🎨 Admin reset: All brush effects cleared');
});

// Animation CSS pour la notification
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
  }
`;
document.head.appendChild(notificationStyle);

console.log('✅ Enhanced Atelier.js loaded with improved BrushManager');
console.log('🎯 All enhanced brush effects ready: bigger particles, longer duration, better visibility!');