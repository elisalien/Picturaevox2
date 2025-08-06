// public/brushManager.js - Système unifié et simplifié
class BrushManager {
  constructor(layer, socket = null) {
    this.layer = layer;
    this.socket = socket;
    this.activeEffects = new Map();
    this.lastEmit = 0;
    this.throttleTime = 200; // Unifié - léger sur la bande passante
    
    // Nettoyage automatique toutes les 30 secondes
    this.cleanupInterval = setInterval(() => this.cleanup(), 30000);
    
    console.log('✅ Unified BrushManager initialized');
  }

  // Méthode publique pour créer et émettre un effet
  createAndEmitEffect(type, x, y, color, size) {
    const now = Date.now();
    if (now - this.lastEmit < this.throttleTime) return;
    
    // Créer l'effet localement
    this.createLocalEffect(type, x, y, color, size);
    
    // Émettre via socket si disponible
    if (this.socket) {
      this.socket.emit('brushEffect', {
        type, x, y, color, size,
        timestamp: now
      });
    }
    
    this.lastEmit = now;
  }

  // Méthode pour recevoir les effets réseau
  createNetworkEffect(data) {
    this.createLocalEffect(data.type, data.x, data.y, data.color, data.size);
  }

  // Création d'effet local unifié
  createLocalEffect(type, x, y, color, size) {
    const effectId = `effect_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    switch(type) {
      case 'sparkles': 
        this.createSparkles(x, y, color, size, effectId); 
        break;
      case 'neon': 
        this.createNeon(x, y, color, size, effectId); 
        break;
      case 'watercolor': 
        this.createWatercolor(x, y, color, size, effectId); 
        break;
      case 'electric': 
        this.createElectric(x, y, color, size, effectId); 
        break;
      case 'fire': 
        this.createFire(x, y, color, size, effectId); 
        break;
      case 'petals': 
        this.createPetals(x, y, color, size, effectId); 
        break;
    }
  }

  // === EFFETS UNIFIÉS (configuration simple pour tous) ===
  
  createSparkles(x, y, color, size, effectId) {
    const elements = [];
    const particles = 4; // Unifié
    const duration = 1200;
    
    for (let i = 0; i < particles; i++) {
      const offsetX = (Math.random() - 0.5) * size * 3;
      const offsetY = (Math.random() - 0.5) * size * 3;
      const sparkleSize = 2 + Math.random() * 6;
      
      const sparkle = new Konva.Star({
        x: x + offsetX, 
        y: y + offsetY,
        numPoints: 4, 
        innerRadius: sparkleSize * 0.4, 
        outerRadius: sparkleSize,
        fill: color, 
        rotation: Math.random() * 360,
        opacity: 1.0,
        effectId
      });
      
      this.layer.add(sparkle);
      elements.push(sparkle);
      
      // Animation simple
      this.animateSparkle(sparkle, duration, i);
    }
    
    this.trackEffect(effectId, elements, duration);
  }

  createNeon(x, y, color, size, effectId) {
    const elements = [];
    const particles = 4;
    const duration = 1400;
    
    for (let i = 0; i < particles; i++) {
      const offsetX = (Math.random() - 0.5) * size * 2.5;
      const offsetY = (Math.random() - 0.5) * size * 2.5;
      const particleSize = 3 + Math.random() * 5;
      
      const particle = new Konva.Circle({
        x: x + offsetX, 
        y: y + offsetY, 
        radius: particleSize, 
        fill: color,
        opacity: 0.9,
        shadowColor: color, 
        shadowBlur: 15, 
        shadowOpacity: 0.8,
        effectId
      });
      
      this.layer.add(particle);
      elements.push(particle);
      
      this.animateNeon(particle, duration, i);
    }
    
    this.trackEffect(effectId, elements, duration);
  }

  createWatercolor(x, y, color, size, effectId) {
    const elements = [];
    const drops = 3;
    const duration = 1500;
    
    for (let i = 0; i < drops; i++) {
      const offsetX = (Math.random() - 0.5) * size * 2;
      const offsetY = (Math.random() - 0.5) * size * 2;
      const dropSize = size * (0.6 + Math.random() * 0.8);
      
      const drop = new Konva.Circle({
        x: x + offsetX, 
        y: y + offsetY, 
        radius: dropSize, 
        fill: color,
        opacity: 0.5,
        scaleX: 0.8 + Math.random() * 0.6, 
        scaleY: 0.6 + Math.random() * 0.6,
        effectId
      });
      
      this.layer.add(drop);
      elements.push(drop);
      
      this.animateWatercolor(drop, duration, i);
    }
    
    this.trackEffect(effectId, elements, duration);
  }

  createElectric(x, y, color, size, effectId) {
    const elements = [];
    const bolts = 2;
    const duration = 1100;
    
    for (let i = 0; i < bolts; i++) {
      const points = this.generateElectricPath(x, y, size, 4);
      
      const bolt = new Konva.Line({
        points, 
        stroke: color,
        strokeWidth: 2.5 + Math.random() * 4,
        opacity: 0.9,
        lineCap: 'round', 
        lineJoin: 'round',
        shadowColor: color, 
        shadowBlur: 15, 
        shadowOpacity: 0.8,
        effectId,
        originalPoints: [...points], 
        animationOffset: Math.random() * Math.PI * 2
      });
      
      this.layer.add(bolt);
      elements.push(bolt);
      
      this.animateElectric(bolt, duration, i);
    }
    
    this.trackEffect(effectId, elements, duration);
  }

  createFire(x, y, color, size, effectId) {
    const elements = [];
    const flames = 4;
    const duration = 1200;
    
    for (let i = 0; i < flames; i++) {
      const offsetX = (Math.random() - 0.5) * size * 2;
      const offsetY = (Math.random() - 0.5) * size * 1.2;
      
      const flame = new Konva.Ellipse({
        x: x + offsetX, 
        y: y + offsetY,
        radiusX: 5 + Math.random() * 6,
        radiusY: 10 + Math.random() * 8,
        fill: color, 
        opacity: 0.8,
        shadowColor: '#FF4500', 
        shadowBlur: 16, 
        shadowOpacity: 0.7,
        effectId
      });
      
      this.layer.add(flame);
      elements.push(flame);
      
      this.animateFire(flame, duration, i);
    }
    
    this.trackEffect(effectId, elements, duration);
  }

  createPetals(x, y, color, size, effectId) {
    const elements = [];
    const count = 3;
    const duration = 2200;
    
    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * size * 2.5;
      const offsetY = (Math.random() - 0.5) * size * 2.5;
      const petalSize = size * (0.5 + Math.random() * 0.6);
      
      const petal = new Konva.Ellipse({
        x: x + offsetX, 
        y: y + offsetY,
        radiusX: petalSize, 
        radiusY: petalSize * 0.6, 
        fill: color,
        opacity: 0.8 + Math.random() * 0.2,
        rotation: Math.random() * 360,
        scaleX: 0.8 + Math.random() * 0.6, 
        scaleY: 0.6 + Math.random() * 0.6,
        effectId
      });
      
      this.layer.add(petal);
      elements.push(petal);
      
      this.animatePetals(petal, duration, i, size);
    }
    
    this.trackEffect(effectId, elements, duration);
  }

  // === ANIMATIONS SIMPLIFIÉES ===

  animateSparkle(sparkle, duration, index) {
    const animation = new Konva.Animation((frame) => {
      const progress = frame.time / duration;
      const scale = 0.9 + Math.sin(frame.time * 0.01 + index * 0.6) * 0.6;
      const rotation = sparkle.rotation() + 3;
      const opacity = Math.max(0, 1.0 - progress * 0.8);
      
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
      const glow = 12 + Math.sin(frame.time * 0.012 + index * 0.8) * 10;
      const opacity = Math.max(0, 0.9 - progress * 0.6);
      const pulse = 1 + Math.sin(frame.time * 0.008 + index) * 0.5;
      
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
      const expansion = 1 + progress * 2.8;
      const opacity = Math.max(0, 0.5 - progress * 0.25);
      
      drop.scaleX(expansion).scaleY(expansion).opacity(opacity);
      
      if (progress >= 1 || opacity <= 0) {
        drop.destroy();
        animation.stop();
      }
    }, this.layer);
    animation.start();
  }

  animateElectric(bolt, duration, index) {
    const originalPoints = bolt.originalPoints;
    const animationOffset = bolt.animationOffset;
    
    const animation = new Konva.Animation((frame) => {
      const progress = frame.time / duration;
      const flicker = 0.5 + Math.sin(frame.time * 0.06 + index * 2) * 0.5;
      const glow = 10 + Math.sin(frame.time * 0.04 + index) * 8;
      const opacity = Math.max(0, 0.9 - progress * 0.6);
      
      // Déformation simple du tracé
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
      const flicker = 0.9 + Math.sin(frame.time * 0.02 + index * 0.7) * 0.3;
      const rise = flame.y() - 1.8;
      const sway = Math.sin(frame.time * 0.015 + index) * 3;
      const opacity = Math.max(0, 0.8 - progress * 0.5);
      
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
      const rotation = petal.rotation() + 2;
      const fall = petal.y() + 2;
      const sway = Math.sin(frame.time * 0.012 + index) * 3;
      const opacity = Math.max(0, petal.opacity() - progress * 0.2);
      const flutter = 0.8 + Math.sin(frame.time * 0.015 + index) * 0.3;
      
      petal.rotation(rotation).y(fall).x(petal.x() + sway * 0.08)
           .opacity(opacity).scaleX(flutter).scaleY(flutter * 0.7);
      
      if (progress >= 1 || opacity <= 0) {
        petal.destroy();
        animation.stop();
      }
    }, this.layer);
    animation.start();
  }

  // === UTILITAIRES ===

  generateElectricPath(startX, startY, size, segments) {
    const points = [startX, startY];
    let currentX = startX, currentY = startY;
    
    for (let i = 0; i < segments; i++) {
      const angle = Math.random() * Math.PI * 2;
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

  trackEffect(effectId, elements, duration) {
    this.activeEffects.set(effectId, { 
      elements, 
      timestamp: Date.now(), 
      duration 
    });
    
    // Auto-cleanup après la durée + marge
    setTimeout(() => this.removeEffect(effectId), duration + 2000);
    this.layer.batchDraw();
  }

  removeEffect(effectId) {
    const effect = this.activeEffects.get(effectId);
    if (effect) {
      effect.elements.forEach(el => { 
        if (!el.isDestroyed()) {
          el.destroy();
        }
      });
      this.activeEffects.delete(effectId);
    }
  }

  // Nettoyage automatique
  cleanup() {
    const now = Date.now();
    const expired = [];
    
    this.activeEffects.forEach((effect, effectId) => {
      if (now - effect.timestamp > effect.duration + 5000) {
        expired.push(effectId);
      }
    });
    
    expired.forEach(id => this.removeEffect(id));
    
    if (expired.length > 0) {
      console.log(`🧹 BrushManager cleanup: removed ${expired.length} expired effects`);
      this.layer.batchDraw();
    }
  }

  // Nettoyage complet des effets
  clearAllEffects() {
    this.activeEffects.forEach((effect, effectId) => {
      this.removeEffect(effectId);
    });
    this.activeEffects.clear();
    this.layer.batchDraw();
    console.log('🧹 BrushManager: All effects cleared');
  }

  // Nettoyage pour utilisateur déconnecté
  cleanupUserEffects(socketId) {
    // Simplifié - on nettoie tout car pas de tracking par user
    // dans cette version simplifiée
  }

  // Destruction propre
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clearAllEffects();
  }
}