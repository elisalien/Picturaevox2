// public/admin.js - VERSION ADMIN OBSERVATION SEULE AVEC BRUSHMANAGER INTÉGRÉ
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

// === BRUSHMANAGER INTÉGRÉ DIRECTEMENT (VERSION ADMIN HAUTE QUALITÉ - RÉCEPTION SEULE) ===
class BrushManager {
  constructor(clientType, layer, socket) {
    this.clientType = clientType;
    this.layer = layer;
    this.socket = socket; // null pour admin car il n'émet pas
    this.activeEffects = new Map();
    this.permanentTraces = new Map();
    this.lastEmit = 0;
    this.effectCount = 0;
    this.permanentCount = 0;
    
    this.config = this.getConfig();
    this.maxPermanent = this.config.maxPermanent;
    this.throttleTime = this.config.throttleTime;
    this.cleanupInterval = this.config.cleanupInterval;
    
    // Zone visible pour optimisation (admin uniquement)
    this.viewportBounds = null;
    if (this.clientType === 'admin') {
      this.setupViewportTracking();
    }
    
    setInterval(() => this.cleanup(), this.cleanupInterval);
    console.log(`✅ BrushManager ready for ${clientType} with quality:`, this.config.quality);
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
    return configs[this.clientType] || configs.public;
  }

  // Suivi de la zone visible pour /chantilly (admin)
  setupViewportTracking() {
    this.updateViewportBounds();
    
    if (typeof window !== 'undefined' && window.stage) {
      window.stage.on('dragend', () => this.updateViewportBounds());
      window.stage.on('wheel', () => {
        setTimeout(() => this.updateViewportBounds(), 50);
      });
      setInterval(() => this.updateViewportBounds(), 2000);
    }
  }

  updateViewportBounds() {
    if (typeof window !== 'undefined' && window.stage) {
      const stage = window.stage;
      const scale = stage.scaleX();
      const pos = stage.position();
      
      // Zone visible avec marge de 20%
      const margin = 0.2;
      const width = window.innerWidth / scale;
      const height = window.innerHeight / scale;
      const marginX = width * margin;
      const marginY = height * margin;
      
      this.viewportBounds = {
        x: (-pos.x / scale) - marginX,
        y: (-pos.y / scale) - marginY,
        width: width + (marginX * 2),
        height: height + (marginY * 2)
      };
    }
  }

  // Vérifier si un point est dans la zone visible (optimisation admin)
  isInViewport(x, y) {
    if (!this.viewportBounds || this.clientType !== 'admin') return true;
    
    const bounds = this.viewportBounds;
    return x >= bounds.x && x <= bounds.x + bounds.width &&
           y >= bounds.y && y <= bounds.y + bounds.height;
  }

  // Admin ne dessine pas, seulement reçoit
  createNetworkEffect(data) {
    // Optimisation zone visible pour /chantilly
    if (!this.isInViewport(data.x, data.y)) {
      return;
    }
    
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
      case 'electric': this.createElectric(x, y, color, size, effectConfig, effectId); break;
      case 'fire': this.createFire(x, y, color, size, effectConfig, effectId); break;
      case 'petals': this.createPetals(x, y, color, size, effectConfig, effectId); break;
    }
  }

  // Effets haute qualité pour admin
  createSparkles(x, y, color, size, config, effectId) {
    const elements = [];
    for (let i = 0; i < config.particles; i++) {
      const offsetX = (Math.random() - 0.5) * size * 1.8;
      const offsetY = (Math.random() - 0.5) * size * 1.8;
      const sparkleSize = 1.5 + Math.random() * 4;
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
    for (let i = 0; i < config.particles; i++) {
      const offsetX = (Math.random() - 0.5) * size * 1.0;
      const offsetY = (Math.random() - 0.5) * size * 1.0;
      const particleSize = 2.5 + Math.random() * 4;
      const isPermanent = Math.random() < 0.5;
      
      const particle = new Konva.Circle({
        x: x + offsetX, y: y + offsetY, radius: particleSize, fill: color,
        opacity: isPermanent ? config.permanentOpacity : 0.9,
        shadowColor: color, shadowBlur: isPermanent ? 6 : 15, shadowOpacity: isPermanent ? 0.5 : 0.9,
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
      const offsetX = (Math.random() - 0.5) * size * 0.8;
      const offsetY = (Math.random() - 0.5) * size * 0.8;
      const dropSize = size * (0.5 + Math.random() * 0.8);
      const isPermanent = Math.random() < 0.5;
      
      const drop = new Konva.Circle({
        x: x + offsetX, y: y + offsetY, radius: dropSize, fill: color,
        opacity: isPermanent ? config.permanentOpacity : 0.4,
        scaleX: 0.7 + Math.random() * 0.5, scaleY: 0.5 + Math.random() * 0.5,
        effectId, createdAt: Date.now(), isPermanent
      });
      
      this.layer.add(drop);
      
      if (isPermanent) {
        drop.to({ radius: dropSize * 2.2, scaleX: drop.scaleX() * 1.5, scaleY: drop.scaleY() * 1.4, duration: 3, easing: Konva.Easings.EaseOut });
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
        const distance = (Math.random() * size * 1.0) + (size * 0.4);
        currentX += Math.cos(angle) * distance;
        currentY += Math.sin(angle) * distance;
        points.push(currentX, currentY);
      }
      
      const isPermanent = Math.random() < 0.4;
      
      const bolt = new Konva.Line({
        points, stroke: color,
        strokeWidth: isPermanent ? 1.2 : (2 + Math.random() * 3),
        opacity: isPermanent ? config.permanentOpacity : 0.9,
        lineCap: 'round', lineJoin: 'round',
        shadowColor: color, shadowBlur: isPermanent ? 4 : 12, shadowOpacity: isPermanent ? 0.5 : 0.8,
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
      const offsetX = (Math.random() - 0.5) * size * 0.8;
      const offsetY = (Math.random() - 0.5) * size * 0.5;
      const isPermanent = Math.random() < 0.4;
      
      const flame = new Konva.Ellipse({
        x: x + offsetX, y: y + offsetY,
        radiusX: isPermanent ? 3 : (4 + Math.random() * 4),
        radiusY: isPermanent ? 4 : (8 + Math.random() * 5),
        fill: color, opacity: isPermanent ? config.permanentOpacity : 0.8,
        shadowColor: '#FF4500', shadowBlur: isPermanent ? 3 : 12, shadowOpacity: isPermanent ? 0.4 : 0.6,
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
      const offsetX = (Math.random() - 0.5) * size * 1.0;
      const offsetY = (Math.random() - 0.5) * size * 1.0;
      const petalSize = size * (0.4 + Math.random() * 0.5);
      const isPermanent = Math.random() < 0.5;
      
      const petal = new Konva.Ellipse({
        x: x + offsetX, y: y + offsetY,
        radiusX: petalSize, radiusY: petalSize * 0.6, fill: color,
        opacity: isPermanent ? config.permanentOpacity : (0.8 + Math.random() * 0.2),
        rotation: Math.random() * 360,
        scaleX: 0.7 + Math.random() * 0.5, scaleY: 0.5 + Math.random() * 0.5,
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

  // Animations haute qualité pour admin
  animateSparkle(sparkle, duration, index) {
    const animation = new Konva.Animation((frame) => {
      const progress = frame.time / duration;
      const scale = 0.9 + Math.sin(frame.time * 0.008 + index * 0.4) * 0.5;
      const rotation = sparkle.rotation() + 2.5;
      const opacity = Math.max(0, 1.0 - progress * 0.7);
      
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
      const glow = 12 + Math.sin(frame.time * 0.01 + index * 0.6) * 8;
      const opacity = Math.max(0, 0.9 - progress * 0.5);
      const pulse = 1 + Math.sin(frame.time * 0.006 + index) * 0.4;
      
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
      const expansion = 1 + progress * 2.5;
      const opacity = Math.max(0, 0.4 - progress * 0.12);
      const organic = Math.sin(frame.time * 0.003 + index) * 0.2;
      
      drop.scaleX(expansion + organic).scaleY(expansion + organic * 0.5).opacity(opacity);
      
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
      const flicker = 0.5 + Math.sin(frame.time * 0.06 + index * 1.8) * 0.5;
      const glow = 8 + Math.sin(frame.time * 0.04 + index) * 6;
      const opacity = Math.max(0, 0.9 - progress * 0.5);
      
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
      const flicker = 0.9 + Math.sin(frame.time * 0.02 + index * 0.5) * 0.2;
      const rise = flame.y() - 1.8;
      const sway = Math.sin(frame.time * 0.015 + index) * 2.5;
      const opacity = Math.max(0, 0.8 - progress * 0.4);
      
      flame.scaleX(flicker).scaleY(flicker * 1.3).y(rise).x(flame.x() + sway * 0.12).opacity(opacity);
      
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
      const rotation = petal.rotation() + 1.8;
      const fall = petal.y() + 2.0;
      const sway = Math.sin(frame.time * 0.012 + index) * 2.5;
      const opacity = Math.max(0, petal.opacity() - progress * 0.2);
      const flutter = 0.8 + Math.sin(frame.time * 0.015 + index) * 0.25;
      
      petal.rotation(rotation).y(fall).x(petal.x() + sway * 0.06)
           .opacity(opacity).scaleX(flutter).scaleY(flutter * 0.6);
      
      if (progress >= 1 || opacity <= 0) {
        petal.destroy();
        animation.stop();
      }
    }, this.layer);
    animation.start();
  }

  // Système de vieillissement identique aux autres versions
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

// === INITIALISATION BRUSHMANAGER ADMIN ===
const brushManager = new BrushManager('admin', layer, null); // null car admin ne dessine pas
console.log('🎯 BrushManager admin (chantilly) loaded with HIGH QUALITY + viewport optimization!');

// === SOCKET LISTENERS POUR RÉCEPTION D'EFFETS ===

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

// Effet texture (ancien système)
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

// BRUSH EFFECTS - Utilise le BrushManager haute qualité avec optimisation zone visible
socket.on('brushEffect', (data) => {
  brushManager.createNetworkEffect(data);
});

socket.on('texture', data => {
  createTextureEffect(data.x, data.y, data.color, data.size);
});

socket.on('cleanupUserEffects', (data) => {
  brushManager.cleanupUserEffects(data.socketId);
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

// Raccourci Ctrl+Z pour undo
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault();
    socket.emit('undo');
  }
});

// === INTERFACE ADMIN (TOOLBAR, ZOOM, ETC.) ===

const panBtn = document.getElementById('pan');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const resetZoomBtn = document.getElementById('reset-zoom');
const bgBlackBtn = document.getElementById('bg-black');
const bgWhiteBtn = document.getElementById('bg-white');
const eraserBtn = document.getElementById('eraser');
const clearBtn = document.getElementById('clear-canvas');
const exportBtn = document.getElementById('export');
const backHomeBtn = document.getElementById('back-home');
const hideUIBtn = document.getElementById('hide-ui');
const container = stage.container();
const scaleFactor = 1.2;

let uiVisible = true;
const toolbar = document.querySelector('.toolbar');
const minimap = document.getElementById('minimap');

function setActiveButton(activeBtn) {
  [panBtn, zoomInBtn, zoomOutBtn, resetZoomBtn, bgBlackBtn, bgWhiteBtn, eraserBtn, clearBtn, exportBtn, backHomeBtn, hideUIBtn]
    .forEach(btn => btn?.classList.remove('active'));
  activeBtn?.classList.add('active');
}

// Masquer/Afficher UI
hideUIBtn?.addEventListener('click', () => {
  uiVisible = !uiVisible;
  
  if (uiVisible) {
    toolbar.style.display = 'flex';
    if (minimap) minimap.style.display = 'block';
    hideUIBtn.textContent = '👁️';
    hideUIBtn.title = 'Masquer interface';
  } else {
    toolbar.style.display = 'none';
    if (minimap) minimap.style.display = 'none';
    hideUIBtn.style.display = 'block';
    hideUIBtn.textContent = '👁️‍🗨️';
    hideUIBtn.title = 'Afficher interface';
  }
});

// Pan avec notification de mise à jour viewport
panBtn?.addEventListener('click', () => {
  setActiveButton(panBtn);
  stage.draggable(true);
  container.style.cursor = 'grab';
  
  // Notifier le BrushManager du changement de viewport
  setTimeout(() => brushManager.updateViewportBounds(), 50);
});

// Zoom in avec notification de mise à jour viewport
zoomInBtn?.addEventListener('click', () => {
  setActiveButton(zoomInBtn);
  stage.draggable(false);
  const oldScale = stage.scaleX();
  stage.scale({ x: oldScale * scaleFactor, y: oldScale * scaleFactor });
  stage.batchDraw();
  container.style.cursor = 'crosshair';
  
  // Notifier le BrushManager du changement de viewport
  setTimeout(() => brushManager.updateViewportBounds(), 50);
});

// Zoom out avec notification de mise à jour viewport
zoomOutBtn?.addEventListener('click', () => {
  setActiveButton(zoomOutBtn);
  stage.draggable(false);
  const oldScale = stage.scaleX();
  stage.scale({ x: oldScale / scaleFactor, y: oldScale / scaleFactor });
  stage.batchDraw();
  container.style.cursor = 'crosshair';
  
  // Notifier le BrushManager du changement de viewport
  setTimeout(() => brushManager.updateViewportBounds(), 50);
});

// Reset zoom avec notification de mise à jour viewport
resetZoomBtn?.addEventListener('click', () => {
  setActiveButton(panBtn);
  stage.scale({ x: 1, y: 1 });
  stage.position({ x: 0, y: 0 });
  stage.batchDraw();
  stage.draggable(true);
  container.style.cursor = 'grab';
  
  // Notifier le BrushManager du changement de viewport
  setTimeout(() => brushManager.updateViewportBounds(), 50);
});

// Background toggle
bgBlackBtn?.addEventListener('click', () => {
  bgBlackBtn.classList.add('active');
  bgWhiteBtn?.classList.remove('active');
  container.style.backgroundColor = '#000';
});

bgWhiteBtn?.addEventListener('click', () => {
  bgWhiteBtn.classList.add('active');
  bgBlackBtn?.classList.remove('active');
  container.style.backgroundColor = '#fff';
});

// Eraser (object deletion)
eraserBtn?.addEventListener('click', () => {
  setActiveButton(eraserBtn);
  stage.draggable(false);
  container.style.cursor = 'crosshair';
});

stage.on('click', evt => {
  if (eraserBtn?.classList.contains('active')) {
    const target = evt.target;
    
    if (target.getClassName() === 'Line' && target.id()) {
      const shape = target;
      const id = shape.id();
      
      shape.stroke('#ff0000');
      shape.opacity(0.5);
      layer.draw();
      
      setTimeout(() => {
        shape.destroy();
        layer.draw();
        socket.emit('deleteShape', { id });
      }, 150);
    }
  }
});

// Feedback au survol en mode gomme
stage.on('mouseover', evt => {
  if (eraserBtn?.classList.contains('active')) {
    const target = evt.target;
    if (target.getClassName() === 'Line' && target.id()) {
      target.opacity(0.7);
      layer.draw();
      container.style.cursor = 'pointer';
    }
  }
});

stage.on('mouseout', evt => {
  if (eraserBtn?.classList.contains('active')) {
    const target = evt.target;
    if (target.getClassName() === 'Line' && target.id()) {
      target.opacity(1);
      layer.draw();
      container.style.cursor = 'crosshair';
    }
  }
});

// Clear canvas
clearBtn?.addEventListener('click', () => {
  setActiveButton(clearBtn);
  layer.destroyChildren();
  brushManager.clearPermanentTraces();
  layer.draw();
  socket.emit('clearCanvas');
});

// Export PNG
exportBtn?.addEventListener('click', () => {
  setActiveButton(exportBtn);
  const uri = stage.toDataURL({ pixelRatio: 3 });
  const link = document.createElement('a');
  link.download = 'chantilly-canvas.png';
  link.href = uri;
  link.click();
});

// Back to public
backHomeBtn?.addEventListener('click', () => {
  setActiveButton(backHomeBtn);
  window.location.href = '/';
});

// Style spécial pour le bouton masquer UI
if (hideUIBtn) {
  hideUIBtn.style.position = 'fixed';
  hideUIBtn.style.top = '10px';
  hideUIBtn.style.right = '10px';
  hideUIBtn.style.zIndex = '2000';
  hideUIBtn.style.backgroundColor = 'rgba(0,0,0,0.7)';
  hideUIBtn.style.border = '1px solid #666';
  hideUIBtn.style.borderRadius = '50%';
  hideUIBtn.style.width = '40px';
  hideUIBtn.style.height = '40px';
}

// === ÉVÉNEMENTS DE DÉPLACEMENT POUR OPTIMISATION VIEWPORT ===

// Mise à jour du viewport lors du drag
stage.on('dragend', () => {
  brushManager.updateViewportBounds();
});

// Mise à jour du viewport lors du zoom molette
stage.on('wheel', (e) => {
  e.evt.preventDefault();
  
  const scaleBy = 1.1;
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
  
  // Notifier le BrushManager du changement de viewport après un délai
  setTimeout(() => brushManager.updateViewportBounds(), 100);
});

// Initialisation par défaut
stage.draggable(true);
container.style.cursor = 'grab';

console.log('✅ Admin.js loaded for chantilly interface with HIGH QUALITY viewport optimization');
console.log('🎯 BrushManager status: Ready with viewport culling for maximum performance');
console.log('📍 Only effects in visible area + 20% margin will be rendered');