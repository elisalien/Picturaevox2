// public/brushManager.js - GESTIONNAIRE UNIFIÉ DES BRUSH ANIMÉS

class BrushManager {
  constructor(interface, layer, socket) {
    this.interface = interface; // 'public', 'atelier', 'admin'
    this.layer = layer;
    this.socket = socket;
    this.activeEffects = new Map();
    this.permanentTraces = new Map();
    this.lastEmit = 0;
    this.effectCount = 0;
    this.permanentCount = 0;
    
    // Configuration par interface
    this.config = this.getConfig();
    this.maxPermanent = this.config.maxPermanent;
    this.throttleTime = this.config.throttleTime;
    this.cleanupInterval = this.config.cleanupInterval;
    
    // Démarrer le nettoyage automatique
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  // Configuration adaptée par interface
  getConfig() {
    const configs = {
      public: {
        maxPermanent: 150,
        throttleTime: 400,
        cleanupInterval: 25000,
        effects: {
          sparkles: { particles: 3, duration: 1000, permanentOpacity: 0.08 },
          neon: { particles: 3, duration: 1200, permanentOpacity: 0.1 },
          watercolor: { drops: 2, duration: 1200, permanentOpacity: 0.04 },
          electric: { bolts: 2, segments: 4, duration: 1000, permanentOpacity: 0.05 },
          fire: { flames: 3, duration: 1000, permanentOpacity: 0.03 },
          petals: { count: 2, duration: 2000, permanentOpacity: 0.06 }
        }
      },
      atelier: {
        maxPermanent: 300,
        throttleTime: 200,
        cleanupInterval: 35000,
        effects: {
          sparkles: { particles: 5, duration: 1500, permanentOpacity: 0.12 },
          neon: { particles: 6, duration: 2000, permanentOpacity: 0.15 },
          watercolor: { drops: 4, duration: 2000, permanentOpacity: 0.06 },
          electric: { bolts: 3, segments: 6, duration: 1500, permanentOpacity: 0.08 },
          fire: { flames: 5, duration: 1500, permanentOpacity: 0.04 },
          petals: { count: 4, duration: 3000, permanentOpacity: 0.1 }
        }
      },
      admin: {
        maxPermanent: 500,
        throttleTime: 100,
        cleanupInterval: 45000,
        effects: {
          sparkles: { particles: 8, duration: 2000, permanentOpacity: 0.15 },
          neon: { particles: 10, duration: 2500, permanentOpacity: 0.2 },
          watercolor: { drops: 6, duration: 3000, permanentOpacity: 0.08 },
          electric: { bolts: 4, segments: 8, duration: 2000, permanentOpacity: 0.1 },
          fire: { flames: 8, duration: 2000, permanentOpacity: 0.05 },
          petals: { count: 6, duration: 4000, permanentOpacity: 0.12 }
        }
      }
    };
    
    return configs[this.interface] || configs.public;
  }

  // Créer et émettre un effet (pour les interfaces qui dessinent)
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

  // Créer un effet reçu du réseau (pour toutes les interfaces)
  createNetworkEffect(data) {
    this.createLocalEffect(data.type, data.x, data.y, data.color, data.size);
  }

  // Créer un effet local
  createLocalEffect(type, x, y, color, size) {
    const effectConfig = this.config.effects[type];
    if (!effectConfig) return;
    
    const effectId = `${this.interface}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    switch(type) {
      case 'sparkles':
        this.createSparkles(x, y, color, size, effectConfig, effectId);
        break;
      case 'neon':
        this.createNeon(x, y, color, size, effectConfig, effectId);
        break;
      case 'watercolor':
        this.createWatercolor(x, y, color, size, effectConfig, effectId);
        break;
      case 'electric':
        this.createElectric(x, y, color, size, effectConfig, effectId);
        break;
      case 'fire':
        this.createFire(x, y, color, size, effectConfig, effectId);
        break;
      case 'petals':
        this.createPetals(x, y, color, size, effectConfig, effectId);
        break;
    }
  }

  // === EFFETS INDIVIDUELS ===

  createSparkles(x, y, color, size, config, effectId) {
    const elements = [];
    
    for (let i = 0; i < config.particles; i++) {
      const offsetX = (Math.random() - 0.5) * size * (this.interface === 'admin' ? 1.5 : 1.2);
      const offsetY = (Math.random() - 0.5) * size * (this.interface === 'admin' ? 1.5 : 1.2);
      const sparkleSize = 1 + Math.random() * (this.interface === 'admin' ? 3 : 2);
      const isPermanent = Math.random() < 0.3;
      
      const sparkle = new Konva.Star({
        x: x + offsetX, y: y + offsetY,
        numPoints: 4,
        innerRadius: sparkleSize * 0.5,
        outerRadius: sparkleSize,
        fill: color,
        rotation: Math.random() * 360,
        opacity: isPermanent ? config.permanentOpacity : 0.8,
        effectId: effectId
      });
      
      this.layer.add(sparkle);
      
      if (isPermanent) {
        this.trackPermanentTrace(sparkle);
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
      const particleSize = 1.5 + Math.random() * (this.interface === 'admin' ? 3 : 2);
      const isPermanent = Math.random() < 0.3;
      
      const particle = new Konva.Circle({
        x: x + offsetX, y: y + offsetY,
        radius: particleSize,
        fill: color,
        opacity: isPermanent ? config.permanentOpacity : 0.7,
        shadowColor: color,
        shadowBlur: isPermanent ? (this.interface === 'admin' ? 5 : 3) : (this.interface === 'admin' ? 10 : 8),
        shadowOpacity: isPermanent ? 0.4 : 0.6,
        effectId: effectId
      });
      
      this.layer.add(particle);
      
      if (isPermanent) {
        this.trackPermanentTrace(particle);
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
      const offsetX = (Math.random() - 0.5) * size;
      const offsetY = (Math.random() - 0.5) * size;
      const dropSize = size * (0.3 + Math.random() * 0.4);
      const isPermanent = Math.random() < 0.3;
      
      const drop = new Konva.Circle({
        x: x + offsetX, y: y + offsetY,
        radius: dropSize,
        fill: color,
        opacity: isPermanent ? config.permanentOpacity : 0.2,
        scaleX: 0.8 + Math.random() * 0.3,
        scaleY: 0.8 + Math.random() * 0.3,
        effectId: effectId
      });
      
      this.layer.add(drop);
      
      if (isPermanent) {
        // Expansion permanente légère
        drop.to({
          radius: dropSize * (this.interface === 'admin' ? 1.6 : 1.3),
          duration: 1,
          easing: Konva.Easings.EaseOut
        });
        this.trackPermanentTrace(drop);
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
        currentX += (Math.random() - 0.5) * size * 0.7;
        currentY += (Math.random() - 0.5) * size * 0.7;
        points.push(currentX, currentY);
      }
      
      const isPermanent = Math.random() < 0.3;
      
      const bolt = new Konva.Line({
        points: points,
        stroke: color,
        strokeWidth: isPermanent ? 0.5 : (1 + Math.random() * 1.5),
        opacity: isPermanent ? config.permanentOpacity : 0.7,
        lineCap: 'round',
        shadowColor: isPermanent ? color : color,
        shadowBlur: isPermanent ? 2 : (this.interface === 'admin' ? 6 : 4),
        shadowOpacity: isPermanent ? 0.3 : 0.5,
        effectId: effectId
      });
      
      this.layer.add(bolt);
      
      if (isPermanent) {
        this.trackPermanentTrace(bolt);
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
      const offsetX = (Math.random() - 0.5) * size * 0.6;
      const offsetY = (Math.random() - 0.5) * size * 0.6;
      const isPermanent = Math.random() < 0.3;
      
      const flame = new Konva.Ellipse({
        x: x + offsetX, y: y + offsetY,
        radiusX: isPermanent ? 1.5 : (2 + Math.random() * 2),
        radiusY: isPermanent ? 2 : (4 + Math.random() * 3),
        fill: color,
        opacity: isPermanent ? config.permanentOpacity : 0.6,
        shadowColor: isPermanent ? color : '#FF4500',
        shadowBlur: isPermanent ? 1 : (this.interface === 'admin' ? 8 : 6),
        shadowOpacity: isPermanent ? 0.2 : 0.4,
        effectId: effectId
      });
      
      this.layer.add(flame);
      
      if (isPermanent) {
        this.trackPermanentTrace(flame);
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
      const petalSize = size * (0.2 + Math.random() * 0.3);
      const isPermanent = Math.random() < 0.3;
      
      const petal = new Konva.Ellipse({
        x: x + offsetX, y: y + offsetY,
        radiusX: petalSize,
        radiusY: petalSize * 0.6,
        fill: color,
        opacity: isPermanent ? config.permanentOpacity : (0.6 + Math.random() * 0.2),
        rotation: Math.random() * 360,
        scaleX: 0.8 + Math.random() * 0.3,
        scaleY: 0.8 + Math.random() * 0.3,
        effectId: effectId
      });
      
      this.layer.add(petal);
      
      if (isPermanent) {
        this.trackPermanentTrace(petal);
      } else {
        elements.push(petal);
        this.animatePetals(petal, config.duration, i, size);
      }
    }
    
    this.trackEffect(effectId, elements, config.duration);
  }

  // === ANIMATIONS TEMPORAIRES ===

  animateSparkle(sparkle, duration, index) {
    const animation = new Konva.Animation((frame) => {
      const progress = frame.time / duration;
      const scale = 0.6 + Math.sin(frame.time * 0.007 + index) * 0.35;
      const rotation = sparkle.rotation() + (this.interface === 'admin' ? 2 : 1.5);
      const opacity = Math.max(0, 0.8 - progress * 0.7);
      
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
      const glow = (this.interface === 'admin' ? 8 : 6) + Math.sin(frame.time * 0.008 + index) * (this.interface === 'admin' ? 5 : 4);
      const opacity = Math.max(0, 0.7 - progress * 0.5);
      const scale = 1 + Math.sin(frame.time * 0.005 + index) * 0.25;
      
      particle.shadowBlur(glow).opacity(opacity).scaleX(scale).scaleY(scale);
      
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
      const expansion = 1 + progress * (this.interface === 'admin' ? 1.5 : 1.2);
      const opacity = Math.max(0, drop.opacity() - progress * 0.08);
      const wave = Math.sin(frame.time * 0.003 + index) * 0.1;
      
      drop.scaleX(expansion + wave).scaleY(expansion + wave * 0.7).opacity(opacity);
      
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
      const flicker = 0.3 + Math.sin(frame.time * 0.04 + index * 1.5) * 0.5;
      const glow = (this.interface === 'admin' ? 4 : 3) + Math.sin(frame.time * 0.03 + index) * 2;
      const opacity = Math.max(0, 0.7 - progress * 0.5);
      
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
      const flicker = 0.7 + Math.sin(frame.time * 0.018 + index * 0.4) * 0.25;
      const rise = flame.y() - 0.6;
      const sway = Math.sin(frame.time * 0.012 + index) * 1.5;
      const opacity = Math.max(0, 0.6 - progress * 0.4);
      
      flame.scaleX(flicker).scaleY(flicker).y(rise).x(flame.x() + sway * 0.08).opacity(opacity);
      
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
      const rotation = petal.rotation() + 1.2;
      const fall = petal.y() + 0.6;
      const sway = Math.sin(frame.time * 0.01 + index) * 1.2;
      const opacity = Math.max(0, petal.opacity() - progress * 0.18);
      const flutter = 0.9 + Math.sin(frame.time * 0.01 + index) * 0.15;
      
      petal.rotation(rotation).y(fall).x(petal.x() + sway * 0.03).opacity(opacity).scaleX(flutter).scaleY(flutter * 0.8);
      
      if (progress >= 1 || opacity <= 0) {
        petal.destroy();
        animation.stop();
      }
    }, this.layer);
    animation.start();
  }

  // === GESTION DES TRACES PERMANENTES ===

  trackPermanentTrace(element) {
    if (this.permanentCount >= this.maxPermanent) {
      // FIFO : supprimer la plus ancienne trace
      const oldestId = this.permanentTraces.keys().next().value;
      if (oldestId) {
        const oldTrace = this.permanentTraces.get(oldestId);
        if (oldTrace && !oldTrace.isDestroyed()) {
          oldTrace.destroy();
        }
        this.permanentTraces.delete(oldestId);
        this.permanentCount--;
      }
    }
    
    const traceId = Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    this.permanentTraces.set(traceId, element);
    this.permanentCount++;
  }

  trackEffect(effectId, elements, duration) {
    this.activeEffects.set(effectId, {
      elements,
      timestamp: Date.now(),
      duration
    });
    
    setTimeout(() => this.removeEffect(effectId), duration + 1000);
    this.layer.batchDraw();
  }

  removeEffect(effectId) {
    const effect = this.activeEffects.get(effectId);
    if (effect) {
      effect.elements.forEach(el => {
        if (!el.isDestroyed()) el.destroy();
      });
      this.activeEffects.delete(effectId);
    }
  }

  // Nettoyage automatique
  cleanup() {
    const now = Date.now();
    const expired = [];
    
    // Nettoyer les effets temporaires expirés
    this.activeEffects.forEach((effect, effectId) => {
      if (now - effect.timestamp > effect.duration + 3000) {
        expired.push(effectId);
      }
    });
    
    expired.forEach(id => this.removeEffect(id));
    
    // Nettoyer les traces permanentes si dépassement
    if (this.permanentCount > this.maxPermanent * 1.2) {
      const toDelete = Math.floor(this.maxPermanent * 0.2);
      const oldestTraces = Array.from(this.permanentTraces.entries()).slice(0, toDelete);
      
      oldestTraces.forEach(([id, element]) => {
        if (!element.isDestroyed()) element.destroy();
        this.permanentTraces.delete(id);
        this.permanentCount--;
      });
    }
    
    this.layer.batchDraw();
    
    if (expired.length > 0) {
      console.log(`${this.interface}: cleaned ${expired.length} temporary effects, ${this.permanentCount} permanent traces`);
    }
  }

  // Nettoyer toutes les traces permanentes (pour clearCanvas)
  clearPermanentTraces() {
    this.permanentTraces.forEach((element) => {
      if (!element.isDestroyed()) element.destroy();
    });
    this.permanentTraces.clear();
    this.permanentCount = 0;
  }

  // Nettoyer les effets d'un utilisateur spécifique (pour déconnexion)
  cleanupUserEffects(socketId) {
    this.activeEffects.forEach((effect, effectId) => {
      if (effect.socketId === socketId) {
        this.removeEffect(effectId);
      }
    });
  }
}

// Export pour utilisation dans les autres fichiers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrushManager;
}