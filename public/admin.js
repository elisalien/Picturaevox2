// public/admin.js - VERSION ADMIN PREMIUM AVEC BRUSHMANAGER ULTRA HAUTE QUALITÉ
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

// === BRUSHMANAGER PREMIUM INTÉGRÉ DIRECTEMENT (VERSION ADMIN ULTRA HAUTE QUALITÉ) ===
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
    setInterval(() => this.adaptQualityToPerformance(), 35000);
    console.log(`✅ PREMIUM BrushManager ready for ${clientType} with quality:`, this.config.quality);
  }

  getConfig() {
    const configs = {
      admin: {
        quality: 'ultra_premium', // Niveau premium ultime
        maxPermanent: 400, // Augmenté de 300 → 400
        throttleTime: 120, // Réduit de 150 → 120ms pour fluidité maximale
        cleanupInterval: 35000, // Augmenté de 30s → 35s
        effects: {
          sparkles: { 
            particles: 10, // Augmenté de 6 → 10
            duration: 2500, // Augmenté de 1800 → 2500ms
            permanentOpacity: 0.25, // Augmenté de 0.12 → 0.25
            fadeStartTime: 30, // Augmenté de 20 → 30s
            sizeMultiplier: 2.5
          },
          neon: { 
            particles: 10, duration: 2800, permanentOpacity: 0.30, 
            fadeStartTime: 30, sizeMultiplier: 2.2
          },
          watercolor: { 
            drops: 7, duration: 2800, permanentOpacity: 0.18, 
            fadeStartTime: 30, sizeMultiplier: 2.0
          },
          electric: { 
            bolts: 4, segments: 8, duration: 2200, permanentOpacity: 0.20, 
            fadeStartTime: 30, sizeMultiplier: 1.8
          },
          fire: { 
            flames: 8, duration: 2400, permanentOpacity: 0.12, 
            fadeStartTime: 30, sizeMultiplier: 2.0
          },
          petals: { 
            count: 7, duration: 4500, permanentOpacity: 0.20, 
            fadeStartTime: 30, sizeMultiplier: 1.8
          }
        }
      }
    };
    return configs[this.clientType] || configs.admin;
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
      
      // Zone visible avec marge de 25% pour admin premium
      const margin = 0.25;
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

  // Admin ne dessine pas, seulement reçoit avec qualité maximale
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
      case 'electric': this.createElectricTrace(x, y, color, size, effectConfig, effectId); break;
      case 'fire': this.createFire(x, y, color, size, effectConfig, effectId); break;
      case 'petals': this.createPetals(x, y, color, size, effectConfig, effectId); break;
    }
  }

  // Effets ULTRA haute qualité pour admin premium
  createSparkles(x, y, color, size, config, effectId) {
    const elements = [];
    const enhancedSize = size * config.sizeMultiplier;
    
    for (let i = 0; i < config.particles; i++) {
      const offsetX = (Math.random() - 0.5) * enhancedSize * 2.2; // Plus d'étalement
      const offsetY = (Math.random() - 0.5) * enhancedSize * 2.2;
      const sparkleSize = 3 + Math.random() * 8; // Tailles maximales
      const isPermanent = Math.random() < 0.6; // Plus de permanentes
      
      const sparkle = new Konva.Star({
        x: x + offsetX, y: y + offsetY,
        numPoints: 4, innerRadius: sparkleSize * 0.4, outerRadius: sparkleSize,
        fill: color, rotation: Math.random() * 360,
        opacity: isPermanent ? config.permanentOpacity : 1.0,
        effectId, createdAt: Date.now(), isPermanent,
        // Propriétés premium
        shadowColor: color, shadowBlur: isPermanent ? 4 : 8, shadowOpacity: 0.5
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
      const offsetX = (Math.random() - 0.5) * enhancedSize * 1.4;
      const offsetY = (Math.random() - 0.5) * enhancedSize * 1.4;
      const particleSize = 4 + Math.random() * 6; // Plus gros pour premium
      const isPermanent = Math.random() < 0.6;
      
      const particle = new Konva.Circle({
        x: x + offsetX, y: y + offsetY, radius: particleSize, fill: color,
        opacity: isPermanent ? config.permanentOpacity : 0.95,
        shadowColor: color, shadowBlur: isPermanent ? 12 : 25, shadowOpacity: isPermanent ? 0.8 : 0.95,
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
      const offsetX = (Math.random() - 0.5) * enhancedSize * 1.2;
      const offsetY = (Math.random() - 0.5) * enhancedSize * 1.2;
      const dropSize = enhancedSize * (0.8 + Math.random() * 1.0); // Tailles premium
      const isPermanent = Math.random() < 0.6;
      
      const drop = new Konva.Circle({
        x: x + offsetX, y: y + offsetY, radius: dropSize, fill: color,
        opacity: isPermanent ? config.permanentOpacity : 0.7, // Plus visible
        scaleX: 0.8 + Math.random() * 0.8, scaleY: 0.6 + Math.random() * 0.8,
        effectId, createdAt: Date.now(), isPermanent
      });
      
      this.layer.add(drop);
      
      if (isPermanent) {
        drop.to({ 
          radius: dropSize * 3.0, // Expansion maximale
          scaleX: drop.scaleX() * 1.8, 
          scaleY: drop.scaleY() * 1.7, 
          duration: 4, 
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

  // PREMIUM : Electric avec tracé déformé ultra complexe
  createElectricTrace(x, y, color, size, config, effectId) {
    const elements = [];
    const enhancedSize = size * config.sizeMultiplier;
    
    for (let i = 0; i < config.bolts; i++) {
      const points = this.generatePremiumElectricPath(x, y, enhancedSize, config.segments);
      const isPermanent = Math.random() < 0.5;
      
      const bolt = new Konva.Line({
        points, stroke: color,
        strokeWidth: isPermanent ? 2.5 : (4 + Math.random() * 5), // Épaisseur maximale
        opacity: isPermanent ? config.permanentOpacity : 0.95,
        lineCap: 'round', lineJoin: 'round',
        shadowColor: color, shadowBlur: isPermanent ? 10 : 20, shadowOpacity: isPermanent ? 0.8 : 0.9,
        effectId, createdAt: Date.now(), isPermanent,
        originalPoints: [...points], animationOffset: Math.random() * Math.PI * 2
      });
      
      this.layer.add(bolt);
      
      if (isPermanent) {
        this.trackPermanentTrace(bolt, config);
      } else {
        elements.push(bolt);
        this.animatePremiumElectricTrace(bolt, config.duration, i);
      }
    }
    this.trackEffect(effectId, elements, config.duration);
  }

  // Génération de tracé électrique premium ultra complexe
  generatePremiumElectricPath(startX, startY, size, segments) {
    const points = [startX, startY];
    let currentX = startX, currentY = startY;
    
    for (let i = 0; i < segments; i++) {
      const baseAngle = Math.random() * Math.PI * 2;
      const deviation = (Math.random() - 0.5) * Math.PI * 1.0; // Déviation maximale
      const angle = baseAngle + deviation;
      
      const distance = (Math.random() * size * 1.5) + (size * 0.6); // Distance premium
      const nextX = currentX + Math.cos(angle) * distance;
      const nextY = currentY + Math.sin(angle) * distance;
      
      // Plusieurs points intermédiaires pour courbes complexes
      const midX1 = (currentX + nextX) / 3 + (Math.random() - 0.5) * size * 0.5;
      const midY1 = (currentY + nextY) / 3 + (Math.random() - 0.5) * size * 0.5;
      const midX2 = (currentX + nextX) * 2/3 + (Math.random() - 0.5) * size * 0.4;
      const midY2 = (currentY + nextY) * 2/3 + (Math.random() - 0.5) * size * 0.4;
      
      points.push(midX1, midY1, midX2, midY2, nextX, nextY);
      currentX = nextX;
      currentY = nextY;
    }
    
    return points;
  }

  createFire(x, y, color, size, config, effectId) {
    const elements = [];
    const enhancedSize = size * config.sizeMultiplier;
    
    for (let i = 0; i < config.flames; i++) {
      const offsetX = (Math.random() - 0.5) * enhancedSize * 1.2;
      const offsetY = (Math.random() - 0.5) * enhancedSize * 0.8;
      const isPermanent = Math.random() < 0.5;
      
      const flame = new Konva.Ellipse({
        x: x + offsetX, y: y + offsetY,
        radiusX: isPermanent ? 6 : (7 + Math.random() * 8), // Tailles maximales
        radiusY: isPermanent ? 10 : (15 + Math.random() * 10),
        fill: color, opacity: isPermanent ? config.permanentOpacity : 0.85,
        shadowColor: '#FF4500', shadowBlur: isPermanent ? 8 : 20, shadowOpacity: isPermanent ? 0.7 : 0.8,
        effectId, createdAt: Date.now(), isPermanent
      });
      
      this.layer.add(flame);
      
      if (isPermanent) {
        this.trackPermanentTrace(flame, config);
      } else {
        elements.push(flame);
        this.animatePremiumFire(flame, config.duration, i);
      }
    }
    this.trackEffect(effectId, elements, config.duration);
  }

  createPetals(x, y, color, size, config, effectId) {
    const elements = [];
    const enhancedSize = size * config.sizeMultiplier;
    
    for (let i = 0; i < config.count; i++) {
      const offsetX = (Math.random() - 0.5) * enhancedSize * 1.4;
      const offsetY = (Math.random() - 0.5) * enhancedSize * 1.4;
      const petalSize = enhancedSize * (0.7 + Math.random() * 0.8); // Tailles premium
      const isPermanent = Math.random() < 0.6;
      
      const petal = new Konva.Ellipse({
        x: x + offsetX, y: y + offsetY,
        radiusX: petalSize, radiusY: petalSize * 0.6, fill: color,
        opacity: isPermanent ? config.permanentOpacity : (0.85 + Math.random() * 0.15),
        rotation: Math.random() * 360,
        scaleX: 0.8 + Math.random() * 0.8, scaleY: 0.6 + Math.random() * 0.8,
        effectId, createdAt: Date.now(), isPermanent
      });
      
      this.layer.add(petal);
      
      if (isPermanent) {
        this.trackPermanentTrace(petal, config);
      } else {
        elements.push(petal);
        this.animatePremiumPetals(petal, config.duration, i, enhancedSize);
      }
    }
    this.trackEffect(effectId, elements, config.duration);
  }

  // ANIMATIONS PREMIUM ultra haute qualité pour admin
  animateSparkle(sparkle, duration, index) {
    const animation = new Konva.Animation((frame) => {
      const progress = frame.time / duration;
      const randomFactor = 0.5 + Math.random() * 0.6; // Variabilité maximale
      const scale = 1.1 + Math.sin(frame.time * (0.010 + randomFactor * 0.006) + index * 0.8) * 0.8;
      const rotation = sparkle.rotation() + (3.5 + Math.random() * 3);
      const opacity = Math.max(0, 1.0 - progress * (0.4 + Math.random() * 0.3));
      const glow = 6 + Math.sin(frame.time * 0.015 + index) * 4;
      
      sparkle.scaleX(scale).scaleY(scale).rotation(rotation).opacity(opacity).shadowBlur(glow);
      
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
      const randomFactor = 0.7 + Math.random() * 0.7;
      const glow = 20 + Math.sin(frame.time * (0.012 + randomFactor * 0.007) + index * 1.0) * 15;
      const opacity = Math.max(0, 0.95 - progress * (0.3 + Math.random() * 0.2));
      const pulse = 1 + Math.sin(frame.time * (0.008 + randomFactor * 0.005) + index) * 0.7;
      
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
      const expansion = 1 + progress * (3.5 + Math.random() * 1.0); // Expansion maximale
      const opacity = Math.max(0, 0.7 - progress * (0.2 + Math.random() * 0.15));
      const organic = Math.sin(frame.time * (0.005 + Math.random() * 0.004) + index) * 0.4;
      
      drop.scaleX(expansion + organic).scaleY(expansion + organic * 0.9).opacity(opacity);
      
      if (progress >= 1 || opacity <= 0) {
        drop.destroy();
        animation.stop();
      }
    }, this.layer);
    animation.start();
  }

  // PREMIUM animation pour tracé électrique ultra complexe
  animatePremiumElectricTrace(bolt, duration, index) {
    const originalPoints = bolt.originalPoints;
    const animationOffset = bolt.animationOffset;
    
    const animation = new Konva.Animation((frame) => {
      const progress = frame.time / duration;
      const flicker = 0.7 + Math.sin(frame.time * (0.08 + Math.random() * 0.06) + index * 2.5) * 0.3;
      const glow = 15 + Math.sin(frame.time * (0.05 + Math.random() * 0.03) + index) * 12;
      const opacity = Math.max(0, 0.95 - progress * (0.3 + Math.random() * 0.2));
      
      // Déformation ultra complexe du tracé
      const deformedPoints = [];
      for (let i = 0; i < originalPoints.length; i += 2) {
        const x = originalPoints[i];
        const y = originalPoints[i + 1];
        
        // Déformations multiples superposées
        const deformX1 = Math.sin(frame.time * 0.014 + animationOffset + i * 0.15) * 5;
        const deformY1 = Math.cos(frame.time * 0.016 + animationOffset + i * 0.15) * 4;
        const deformX2 = Math.sin(frame.time * 0.008 + i * 0.08) * 2;
        const deformY2 = Math.cos(frame.time * 0.010 + i * 0.08) * 2;
        
        deformedPoints.push(x + deformX1 + deformX2, y + deformY1 + deformY2);
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

  animatePremiumFire(flame, duration, index) {
    const animation = new Konva.Animation((frame) => {
      const progress = frame.time / duration;
      const randomFactor = 0.6 + Math.random() * 0.8;
      const flicker = 0.9 + Math.sin(frame.time * (0.025 + randomFactor * 0.015) + index * 0.9) * 0.4;
      const rise = flame.y() - (2.5 + Math.random() * 1.2);
      const sway = Math.sin(frame.time * (0.018 + randomFactor * 0.008) + index) * (4 + Math.random() * 2);
      const opacity = Math.max(0, 0.85 - progress * (0.2 + Math.random() * 0.2));
      const intensity = 15 + Math.sin(frame.time * 0.03 + index) * 8;
      
      flame.scaleX(flicker).scaleY(flicker * 1.6).y(rise).x(flame.x() + sway * 0.2)
           .opacity(opacity).shadowBlur(intensity);
      
      if (progress >= 1 || opacity <= 0) {
        flame.destroy();
        animation.stop();
      }
    }, this.layer);
    animation.start();
  }

  animatePremiumPetals(petal, duration, index, size) {
    const animation = new Konva.Animation((frame) => {
      const progress = frame.time / duration;
      const randomFactor = 0.5 + Math.random() * 0.9;
      const rotation = petal.rotation() + (2.2 + Math.random() * 1.8);
      const fall = petal.y() + (2.5 + Math.random() * 1.2);
      const sway = Math.sin(frame.time * (0.014 + randomFactor * 0.008) + index) * (4 + Math.random() * 2);
      const opacity = Math.max(0, petal.opacity() - progress * (0.12 + Math.random() * 0.1));
      const flutter = 0.8 + Math.sin(frame.time * (0.017 + randomFactor * 0.010) + index) * 0.4;
      
      petal.rotation(rotation).y(fall).x(petal.x() + sway * 0.12)
           .opacity(opacity).scaleX(flutter).scaleY(flutter * 0.8);
      
      if (progress >= 1 || opacity <= 0) {
        petal.destroy();
        animation.stop();
      }
    }, this.layer);
    animation.start();
  }

  // Système de vieillissement PREMIUM pour admin
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
      totalLifetime: 162000, // 162 secondes pour admin premium (80% plus que public)
      qualityLevel: this.clientType
    });
    this.permanentCount++;
    this.startPremiumAgingProcess(traceId);
  }

  startPremiumAgingProcess(traceId) {
    const trace = this.permanentTraces.get(traceId);
    if (!trace) return;
    
    const checkAging = () => {
      const currentTrace = this.permanentTraces.get(traceId);
      if (!currentTrace || !currentTrace.element || currentTrace.element.isDestroyed()) return;
      
      const age = Date.now() - currentTrace.createdAt;
      const element = currentTrace.element;
      
      if (age >= currentTrace.totalLifetime) {
        element.to({
          opacity: 0, duration: 8, easing: Konva.Easings.EaseOut, // Fade out premium plus long
          onFinish: () => {
            if (!element.isDestroyed()) element.destroy();
            this.permanentTraces.delete(traceId);
            this.permanentCount--;
          }
        });
        return;
      }
      
      if (age > currentTrace.fadeStartTime) {
        const midLifetime = currentTrace.totalLifetime * 0.7; // 70% pour admin premium
        
        if (age < midLifetime) {
          // Phase 1: Vieillissement ultra doux (0-70% durée de vie)
          const fadeProgress = (age - currentTrace.fadeStartTime) / (midLifetime - currentTrace.fadeStartTime);
          const targetOpacity = currentTrace.config.permanentOpacity * (1 - fadeProgress * 0.2); // Fade minimal
          element.opacity(targetOpacity);
          if (element.shadowBlur && element.shadowBlur() > 4) {
            element.shadowBlur(Math.max(4, element.shadowBlur() * (1 - fadeProgress * 0.1))); // Garde plus de glow
          }
        } else {
          // Phase 2: Vieillissement final doux (70-100% durée de vie)
          const finalFadeProgress = (age - midLifetime) / (currentTrace.totalLifetime - midLifetime);
          const targetOpacity = currentTrace.config.permanentOpacity * 0.8 * (1 - finalFadeProgress * 0.6);
          element.opacity(targetOpacity);
          if (element.shadowBlur && element.shadowBlur() > 2) {
            element.shadowBlur(Math.max(2, element.shadowBlur() * (1 - finalFadeProgress * 0.3)));
          }
        }
      }
      setTimeout(checkAging, 1500); // Check plus fréquent pour admin premium
    };
    setTimeout(checkAging, trace.fadeStartTime);
  }

  trackEffect(effectId, elements, duration) {
    this.activeEffects.set(effectId, { elements, timestamp: Date.now(), duration, qualityLevel: this.clientType });
    setTimeout(() => this.removeEffect(effectId), duration + 3000); // Plus de temps pour premium
    this.layer.batchDraw();
  }

  removeEffect(effectId) {
    const effect = this.activeEffects.get(effectId);
    if (effect) {
      effect.elements.forEach(el => { 
        if (!el.isDestroyed()) {
          el.to({
            opacity: 0, duration: 1.0, // Fade out premium plus doux
            onFinish: () => { if (!el.isDestroyed()) el.destroy(); }
          });
        }
      });
      this.activeEffects.delete(effectId);
    }
  }

  // CLEANUP PREMIUM avec gestion intelligente de la charge
  cleanup() {
    const now = Date.now();
    const expired = [];
    
    // Cleanup des effets actifs avec grâce extended pour admin
    this.activeEffects.forEach((effect, effectId) => {
      const gracePeriod = 8000; // 8 secondes de grâce pour admin premium
      
      if (now - effect.timestamp > effect.duration + gracePeriod) {
        expired.push(effectId);
      }
    });
    
    expired.forEach(id => this.removeEffect(id));
    
    // Cleanup des traces permanentes expirées
    const expiredTraces = [];
    this.permanentTraces.forEach((trace, traceId) => {
      if (now - trace.createdAt > trace.totalLifetime + 25000) { // Plus de temps pour admin
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
    
    // Optimisation: redraw seulement si nécessaire
    if (expired.length > 0 || expiredTraces.length > 0) {
      this.layer.batchDraw();
    }
    
    // Debug info premium pour admin
    if (expired.length > 0 || expiredTraces.length > 0) {
      console.log(`🧹 PREMIUM Cleanup: ${expired.length} effects, ${expiredTraces.length} traces. Total: ${this.permanentCount}/${this.maxPermanent} permanent traces`);
    }
  }

  adaptQualityToPerformance() {
    const totalElements = this.activeEffects.size + this.permanentCount;
    const threshold = this.maxPermanent * 0.9; // Seuil plus élevé pour admin
    
    if (totalElements > threshold) {
      const oldElements = [];
      this.permanentTraces.forEach((trace, id) => {
        if (Date.now() - trace.createdAt > trace.totalLifetime * 0.8) {
          oldElements.push(id);
        }
      });
      
      // Cleanup plus conservateur pour admin
      const toRemove = Math.floor(oldElements.length * 0.2);
      oldElements.slice(0, toRemove).forEach(id => {
        const trace = this.permanentTraces.get(id);
        if (trace?.element && !trace.element.isDestroyed()) {
          trace.element.destroy();
        }
        this.permanentTraces.delete(id);
        this.permanentCount--;
      });
      
      console.log(`⚡ PREMIUM Performance cleanup: removed ${toRemove} old elements to maintain quality`);
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
    let cleanedCount = 0;
    this.activeEffects.forEach((effect, effectId) => {
      if (effect.socketId === socketId) {
        this.removeEffect(effectId);
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`🧹 PREMIUM: Cleaned ${cleanedCount} effects from disconnected user`);
    }
  }

  // NOUVELLES méthodes premium pour monitoring avancé
  getDetailedStats() {
    return {
      activeEffects: this.activeEffects.size,
      permanentTraces: this.permanentCount,
      maxPermanent: this.maxPermanent,
      qualityLevel: this.config.quality,
      throttleTime: this.throttleTime,
      memoryUsage: this.activeEffects.size + this.permanentCount,
      averageLifetime: this.getAverageTraceLifetime(),
      viewportOptimization: !!this.viewportBounds
    };
  }

  getAverageTraceLifetime() {
    if (this.permanentTraces.size === 0) return 0;
    const now = Date.now();
    let totalAge = 0;
    this.permanentTraces.forEach(trace => {
      totalAge += now - trace.createdAt;
    });
    return Math.round(totalAge / this.permanentTraces.size / 1000); // En secondes
  }
}

// === INITIALISATION BRUSHMANAGER ADMIN PREMIUM ===
const brushManager = new BrushManager('admin', layer, null); // null car admin ne dessine pas
console.log('🎯 PREMIUM BrushManager admin (chantilly) loaded with ULTRA HIGH QUALITY + viewport optimization!');

// === SOCKET LISTENERS POUR RÉCEPTION D'EFFETS PREMIUM ===

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

// Effet texture PREMIUM haute qualité pour admin
function createPremiumTextureEffect(x, y, color, size) {
  // Optimisation zone visible pour admin
  if (!brushManager.isInViewport(x, y)) {
    return;
  }
  
  // Qualité PREMIUM pour admin : maximum de particules et d'effets
  const particleCount = 12; // vs 8 pour atelier, 5 pour public
  const spreadMultiplier = 1.6; // Zone encore plus large
  
  for (let i = 0; i < particleCount; i++) {
    const offsetX = (Math.random() - 0.5) * 18 * spreadMultiplier;
    const offsetY = (Math.random() - 0.5) * 18 * spreadMultiplier;
    const alpha = 0.5 + Math.random() * 0.4; // Encore plus visible
    const dotSize = 1.5 + Math.random() * (size / 2); // Plus grand
    
    // Variation maximale dans les formes pour richesse premium
    const shapeType = Math.random();
    let dot;
    
    if (shapeType < 0.6) {
      // Points classiques (60%)
      dot = new Konva.Line({
        points: [
          x + offsetX,
          y + offsetY,
          x + offsetX + Math.random() * 4,
          y + offsetY + Math.random() * 4
        ],
        stroke: color,
        strokeWidth: dotSize,
        globalAlpha: alpha,
        lineCap: 'round',
        lineJoin: 'round'
      });
    } else if (shapeType < 0.85) {
      // Cercles pour texture (25%)
      dot = new Konva.Circle({
        x: x + offsetX,
        y: y + offsetY,
        radius: dotSize,
        fill: color,
        opacity: alpha * 0.9
      });
    } else {
      // Étoiles sparkle (15%)
      dot = new Konva.Star({
        x: x + offsetX,
        y: y + offsetY,
        numPoints: 4,
        innerRadius: dotSize * 0.4,
        outerRadius: dotSize,
        fill: color,
        opacity: alpha * 0.7,
        rotation: Math.random() * 360
      });
    }
    
    layer.add(dot);
    
    // Animation premium pour certaines particules
    if (Math.random() < 0.4) {
      dot.to({
        opacity: dot.opacity() * 0.2,
        scaleX: 1.4,
        scaleY: 1.4,
        rotation: dot.rotation ? dot.rotation() + 90 : 90,
        duration: 1.0 + Math.random() * 0.6,
        easing: Konva.Easings.EaseOut
      });
    }
  }
  layer.batchDraw();
}

// BRUSH EFFECTS - Utilise le BrushManager PREMIUM avec optimisation zone visible
socket.on('brushEffect', (data) => {
  brushManager.createNetworkEffect(data);
});

socket.on('texture', data => {
  createPremiumTextureEffect(data.x, data.y, data.color, data.size);
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

// Raccourci Ctrl+Z pour undo GLOBAL admin
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault();
    
    // ADMIN peut faire undo pour tous
    socket.emit('undo');
    
    // Notification spéciale admin
    showAdminNotification('Undo Global ↶');
  }
  
  // Raccourci Ctrl+Shift+C pour clear global admin
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    e.preventDefault();
    
    if (confirm('ADMIN: Effacer TOUT le canvas pour TOUS les utilisateurs ?')) {
      // Clear local
      layer.destroyChildren();
      brushManager.clearPermanentTraces();
      layer.draw();
      
      // Clear global via socket
      socket.emit('clearCanvas');
      
      showAdminNotification('Canvas Cleared Globally 🧼');
    }
  }
  
  // Raccourci Ctrl+Shift+R pour reset COMPLET (dessins + brush effects) globalement
  if (e.ctrlKey && e.shiftKey && e.key === 'R') {
    e.preventDefault();
    
    if (confirm('ADMIN: Reset COMPLET (dessins + effets) pour TOUS les utilisateurs ?')) {
      // Clear local complet
      layer.destroyChildren();
      brushManager.clearPermanentTraces();
      brushManager.activeEffects.clear();
      layer.draw();
      
      // Clear global complet
      socket.emit('clearCanvas'); // Supprime les dessins
      socket.emit('adminResetBrushEffects'); // Supprime les effets
      
      showAdminNotification('Reset COMPLET Global 🧼✨');
    }
  }
  
  // NOUVEAU : Raccourci Ctrl+Shift+E pour reset seulement les brush effects
  if (e.ctrlKey && e.shiftKey && e.key === 'E') {
    e.preventDefault();
    
    // Nettoyer tous les brush effects locaux
    brushManager.clearPermanentTraces();
    brushManager.activeEffects.clear();
    layer.batchDraw();
    
    // Demander à tous les clients de faire pareil via un événement spécial
    socket.emit('adminResetBrushEffects');
    
    showAdminNotification('Effets Brush Reset Globalement ✨');
  }
});

// Fonction pour afficher une notification admin
function showAdminNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: rgba(255, 140, 0, 0.95);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    z-index: 3000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border-left: 4px solid #ff8c00;
    animation: adminNotification 2s ease-out;
  `;
  notification.textContent = `👑 ADMIN: ${message}`;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 2000);
}

// Ajouter l'animation CSS pour les notifications admin
const adminStyle = document.createElement('style');
adminStyle.textContent = `
  @keyframes adminNotification {
    0% {
      opacity: 0;
      transform: translateX(100px);
    }
    20% {
      opacity: 1;
      transform: translateX(0);
    }
    80% {
      opacity: 1;
      transform: translateX(0);
    }
    100% {
      opacity: 0;
      transform: translateX(100px);
    }
  }
`;
document.head.appendChild(adminStyle);

// === INTERFACE ADMIN PREMIUM (TOOLBAR, ZOOM, ETC.) ===

const panBtn = document.getElementById('pan');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const resetZoomBtn = document.getElementById('reset-zoom');
const bgBlackBtn = document.getElementById('bg-black');
const bgWhiteBtn = document.getElementById('bg-white');
const eraserBtn = document.getElementById('eraser');
const resetEffectsBtn = document.getElementById('reset-effects');
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
  [panBtn, zoomInBtn, zoomOutBtn, resetZoomBtn, bgBlackBtn, bgWhiteBtn, eraserBtn, resetEffectsBtn, clearBtn, exportBtn, backHomeBtn, hideUIBtn]
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

// Eraser (object deletion) - ADMIN PEUT SUPPRIMER POUR TOUS
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
      
      // Feedback visuel immédiat
      shape.stroke('#ff0000');
      shape.opacity(0.5);
      layer.draw();
      
      setTimeout(() => {
        // Suppression locale
        shape.destroy();
        layer.draw();
        
        // COMMANDE GLOBALE - Supprimer pour tous les utilisateurs
        socket.emit('deleteShape', { id });
        
        console.log(`🧽 ADMIN: Deleted shape ${id} for all users`);
      }, 150);
    }
  }
});

// Feedback au survol en mode gomme - avec indication admin
stage.on('mouseover', evt => {
  if (eraserBtn?.classList.contains('active')) {
    const target = evt.target;
    if (target.getClassName() === 'Line' && target.id()) {
      target.opacity(0.7);
      target.stroke('#ff4444'); // Rouge plus visible pour admin
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
      target.stroke(target.attrs.stroke || target.stroke()); // Restaurer couleur originale
      layer.draw();
      container.style.cursor = 'crosshair';
    }
  }
});

// Reset effects only
resetEffectsBtn?.addEventListener('click', () => {
  setActiveButton(resetEffectsBtn);
  
  // Clear local brush effects
  brushManager.clearPermanentTraces();
  brushManager.activeEffects.clear();
  layer.batchDraw();
  
  // Clear global brush effects
  socket.emit('adminResetBrushEffects');
  
  showAdminNotification('Effets Reset Globalement ✨');
});

// Clear canvas
clearBtn?.addEventListener('click', () => {
  if (confirm('ADMIN: Effacer TOUT pour TOUS les utilisateurs ?')) {
    setActiveButton(clearBtn);
    
    // Clear local
    layer.destroyChildren();
    brushManager.clearPermanentTraces();
    brushManager.activeEffects.clear();
    layer.draw();
    
    // Clear global
    socket.emit('clearCanvas');
    socket.emit('adminResetBrushEffects');
    
    showAdminNotification('Reset COMPLET Global 🧼✨');
  }
});

// Export PNG PREMIUM
exportBtn?.addEventListener('click', () => {
  setActiveButton(exportBtn);
  const uri = stage.toDataURL({ pixelRatio: 4 }); // Qualité maximale pour admin
  const link = document.createElement('a');
  link.download = 'chantilly-premium-canvas.png';
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
  hideUIBtn.style.backgroundColor = 'rgba(0,0,0,0.8)';
  hideUIBtn.style.border = '1px solid #666';
  hideUIBtn.style.borderRadius = '50%';
  hideUIBtn.style.width = '40px';
  hideUIBtn.style.height = '40px';
}

// === ÉVÉNEMENTS DE DÉPLACEMENT POUR OPTIMISATION VIEWPORT PREMIUM ===

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

// Monitoring premium pour admin
setInterval(() => {
  const stats = brushManager.getDetailedStats();
  console.log(`📊 PREMIUM Stats: ${stats.activeEffects} active, ${stats.permanentTraces}/${stats.maxPermanent} permanent, avg lifetime: ${stats.averageLifetime}s`);
}, 60000); // Log toutes les minutes

// Nouvel événement pour reset des brush effects (côté client)
socket.on('adminResetBrushEffects', () => {
  brushManager.clearPermanentTraces();
  brushManager.activeEffects.clear();
  layer.batchDraw();
  console.log('🎨 ADMIN command: All brush effects reset');
});

console.log('✅ PREMIUM Admin.js loaded for chantilly interface with ULTRA HIGH QUALITY viewport optimization');
console.log('🎯 PREMIUM BrushManager status: Ready with viewport culling + premium monitoring');
console.log('📍 Only effects in visible area + 25% margin will be rendered with maximum quality');
console.log('🎨 PREMIUM Features: 10+ particles, 2500-4500ms duration, ultra complex animations!');
console.log('👑 ADMIN POWERS:');
console.log('   • Global undo: Ctrl+Z');
console.log('   • Clear drawings only: Ctrl+Shift+C');
console.log('   • Reset effects only: Ctrl+Shift+E ou bouton ✨');
console.log('   • Reset COMPLET (dessins + effets): Ctrl+Shift+R ou bouton 🧼');