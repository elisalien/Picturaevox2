// public/admin.js
const socket = io();
const stage = new Konva.Stage({
  container: 'canvas-container',
  width: window.innerWidth,
  height: window.innerHeight
});
const layer = new Konva.Layer();
stage.add(layer);

// === SYSTÈME BRUSH ANIMÉS HAUTE QUALITÉ POUR ADMIN/PROJECTION ===

// Configuration optimisée pour l'interface admin (qualité maximale)
const AdminBrushConfig = {
  sparkles: { particles: 8, duration: 2000 },
  watercolor: { drops: 6, duration: 3000 },
  electric: { bolts: 4, segments: 8, duration: 2000 },
  petals: { count: 6, duration: 4000 },
  neon: { particles: 10, duration: 2500 },
  fire: { flames: 8, duration: 2000 }
};

// Gestionnaire d'effets pour interface admin (version haute qualité)
class AdminBrushManager {
  constructor() {
    this.activeEffects = new Map();
    this.effectCount = 0;
    this.maxEffects = 100; // Limite élevée pour admin
    
    // Nettoyage automatique toutes les 30 secondes
    setInterval(() => this.cleanup(), 30000);
  }

  // Créer effet reçu du réseau (admin ne dessine pas, juste affiche)
  createNetworkEffect(data) {
    this.createEffect(data.type, data.x, data.y, data.color, data.size);
  }

  // Créer effet haute qualité
  createEffect(type, x, y, color, size) {
    if (this.effectCount >= this.maxEffects) return;
    
    const effectId = 'admin_effect_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    
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

  // Effets haute qualité pour projection
  createSparkles(x, y, color, size, effectId) {
    const config = AdminBrushConfig.sparkles;
    const elements = [];
    
    for (let i = 0; i < config.particles; i++) {
      const offsetX = (Math.random() - 0.5) * size * 1.5;
      const offsetY = (Math.random() - 0.5) * size * 1.5;
      const sparkleSize = 1 + Math.random() * 3;
      
      const sparkle = new Konva.Star({
        x: x + offsetX,
        y: y + offsetY,
        numPoints: 4,
        innerRadius: sparkleSize * 0.5,
        outerRadius: sparkleSize,
        fill: color,
        rotation: Math.random() * 360,
        opacity: 0.9,
        effectId: effectId
      });
      
      layer.add(sparkle);
      elements.push(sparkle);
      
      // Animation complexe avec scintillement
      const animation = new Konva.Animation((frame) => {
        const progress = frame.time / config.duration;
        const scale = 0.8 + Math.sin(frame.time * 0.008 + i) * 0.4;
        const rotation = sparkle.rotation() + 2;
        const opacity = Math.max(0, 0.9 - progress * 0.7);
        
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

  createNeon(x, y, color, size, effectId) {
    const config = AdminBrushConfig.neon;
    const elements = [];
    
    for (let i = 0; i < config.particles; i++) {
      const offsetX = (Math.random() - 0.5) * size;
      const offsetY = (Math.random() - 0.5) * size;
      const particleSize = 2 + Math.random() * 3;
      
      const particle = new Konva.Circle({
        x: x + offsetX,
        y: y + offsetY,
        radius: particleSize,
        fill: color,
        opacity: 0.8,
        shadowColor: color,
        shadowBlur: 10,
        shadowOpacity: 0.6,
        effectId: effectId
      });
      
      layer.add(particle);
      elements.push(particle);
      
      // Animation glow avec halo
      const animation = new Konva.Animation((frame) => {
        const progress = frame.time / config.duration;
        const glow = 8 + Math.sin(frame.time * 0.01 + i) * 5;
        const opacity = Math.max(0, 0.8 - progress * 0.6);
        const scale = 1 + Math.sin(frame.time * 0.006 + i) * 0.3;
        
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
    const config = AdminBrushConfig.fire;
    const elements = [];
    
    for (let i = 0; i < config.flames; i++) {
      const offsetX = (Math.random() - 0.5) * size * 0.6;
      const offsetY = (Math.random() - 0.5) * size * 0.6;
      
      const flame = new Konva.Ellipse({
        x: x + offsetX,
        y: y + offsetY,
        radiusX: 3 + Math.random() * 2,
        radiusY: 6 + Math.random() * 4,
        fill: color,
        opacity: 0.7,
        shadowColor: '#FF4500',
        shadowBlur: 8,
        shadowOpacity: 0.4,
        effectId: effectId
      });
      
      layer.add(flame);
      elements.push(flame);
      
      // Animation flamme réaliste
      const animation = new Konva.Animation((frame) => {
        const progress = frame.time / config.duration;
        const flicker = 0.8 + Math.sin(frame.time * 0.02 + i * 0.5) * 0.3;
        const rise = flame.y() - 0.8;
        const sway = Math.sin(frame.time * 0.015 + i) * 2;
        const opacity = Math.max(0, 0.7 - progress * 0.5);
        
        flame.scaleX(flicker);
        flame.scaleY(flicker);
        flame.y(rise);
        flame.x(flame.x() + sway * 0.1);
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

  createWatercolor(x, y, color, size, effectId) {
    const config = AdminBrushConfig.watercolor;
    const elements = [];
    
    for (let i = 0; i < config.drops; i++) {
      const offsetX = (Math.random() - 0.5) * size;
      const offsetY = (Math.random() - 0.5) * size;
      const dropSize = size * (0.4 + Math.random() * 0.5);
      
      const drop = new Konva.Circle({
        x: x + offsetX,
        y: y + offsetY,
        radius: dropSize,
        fill: color,
        opacity: 0.25 + Math.random() * 0.15,
        scaleX: 0.9 + Math.random() * 0.2,
        scaleY: 0.9 + Math.random() * 0.2,
        effectId: effectId
      });
      
      layer.add(drop);
      elements.push(drop);
      
      // Animation de diffusion complexe
      const animation = new Konva.Animation((frame) => {
        const progress = frame.time / config.duration;
        const expansion = 1 + progress * 1.5;
        const opacity = Math.max(0, drop.opacity() - progress * 0.08);
        const wave = Math.sin(frame.time * 0.003 + i) * 0.1;
        
        drop.scaleX(expansion + wave);
        drop.scaleY(expansion + wave * 0.5);
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
    const config = AdminBrushConfig.electric;
    const elements = [];
    
    for (let i = 0; i < config.bolts; i++) {
      const points = [x, y];
      let currentX = x;
      let currentY = y;
      
      // Créer un zigzag complexe
      for (let j = 0; j < config.segments; j++) {
        currentX += (Math.random() - 0.5) * size * 0.8;
        currentY += (Math.random() - 0.5) * size * 0.8;
        points.push(currentX, currentY);
      }
      
      const bolt = new Konva.Line({
        points: points,
        stroke: color,
        strokeWidth: 1 + Math.random() * 2,
        opacity: 0.8,
        lineCap: 'round',
        shadowColor: color,
        shadowBlur: 6,
        shadowOpacity: 0.5,
        effectId: effectId
      });
      
      layer.add(bolt);
      elements.push(bolt);
      
      // Animation de scintillement électrique
      const animation = new Konva.Animation((frame) => {
        const progress = frame.time / config.duration;
        const flicker = 0.4 + Math.sin(frame.time * 0.05 + i * 2) * 0.6;
        const glow = 4 + Math.sin(frame.time * 0.03 + i) * 3;
        const opacity = Math.max(0, 0.8 - progress * 0.6);
        
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
    const config = AdminBrushConfig.petals;
    const elements = [];
    
    for (let i = 0; i < config.count; i++) {
      const offsetX = (Math.random() - 0.5) * size * 0.8;
      const offsetY = (Math.random() - 0.5) * size * 0.8;
      const petalSize = size * (0.3 + Math.random() * 0.4);
      
      const petal = new Konva.Ellipse({
        x: x + offsetX,
        y: y + offsetY,
        radiusX: petalSize,
        radiusY: petalSize * 0.6,
        fill: color,
        opacity: 0.7 + Math.random() * 0.2,
        rotation: Math.random() * 360,
        scaleX: 0.8 + Math.random() * 0.4,
        scaleY: 0.8 + Math.random() * 0.4,
        shadowColor: color,
        shadowBlur: 3,
        shadowOpacity: 0.3,
        effectId: effectId
      });
      
      layer.add(petal);
      elements.push(petal);
      
      // Animation de chute réaliste avec rotation
      const animation = new Konva.Animation((frame) => {
        const progress = frame.time / config.duration;
        const rotation = petal.rotation() + 1.5;
        const fall = petal.y() + 0.7;
        const sway = Math.sin(frame.time * 0.008 + i) * 1.5;
        const opacity = Math.max(0, petal.opacity() - progress * 0.2);
        const flutter = 0.9 + Math.sin(frame.time * 0.012 + i) * 0.2;
        
        petal.rotation(rotation);
        petal.y(fall);
        petal.x(petal.x() + sway * 0.05);
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

  trackEffect(effectId, elements, duration) {
    this.activeEffects.set(effectId, {
      elements,
      timestamp: Date.now(),
      duration
    });
    this.effectCount++;
    
    // Auto-cleanup avec marge
    setTimeout(() => {
      this.removeEffect(effectId);
    }, duration + 1000);
    
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
      if (now - effect.timestamp > effect.duration + 3000) {
        expired.push(effectId);
      }
    });
    
    expired.forEach(id => this.removeEffect(id));
    layer.batchDraw();
    
    if (expired.length > 0) {
      console.log(`Admin interface: cleaned ${expired.length} expired effects`);
    }
  }
}

// Initialiser le gestionnaire d'effets admin
const brushManager = new AdminBrushManager();

// === FIN SYSTÈME BRUSH ANIMÉS ===

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

// Real-time streaming updates
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

// Fonction pour créer l'effet texture (identique à app.js)
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

// Écouter les brush effects des autres utilisateurs (HAUTE QUALITÉ)
socket.on('brushEffect', (data) => {
  brushManager.createNetworkEffect(data);
});

// Écouter les événements texture des autres utilisateurs
socket.on('texture', data => {
  createTextureEffect(data.x, data.y, data.color, data.size);
});

// Nettoyage des effets d'un utilisateur déconnecté
socket.on('cleanupUserEffects', (data) => {
  brushManager.activeEffects.forEach((effect, effectId) => {
    if (effect.socketId === data.socketId) {
      brushManager.removeEffect(effectId);
    }
  });
});

// Final draw event
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

// Shape deletion
socket.on('deleteShape', ({ id }) => {
  const shape = layer.findOne('#' + id);
  if (shape) {
    shape.destroy();
    layer.draw();
  }
});

// Canvas clear
socket.on('clearCanvas', () => {
  layer.destroyChildren();
  layer.draw();
});

// Écouter la restauration de formes (pour undo clear)
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

// Raccourci Ctrl+Z pour undo
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault();
    socket.emit('undo');
  }
});

// Écouter les formes créées par l'interface artiste
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

// Toolbar controls
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

// État de l'UI
let uiVisible = true;
const toolbar = document.querySelector('.toolbar');
const minimap = document.getElementById('minimap');

function setActiveButton(activeBtn) {
  [panBtn, zoomInBtn, zoomOutBtn, resetZoomBtn, bgBlackBtn, bgWhiteBtn, eraserBtn, clearBtn, exportBtn, backHomeBtn, hideUIBtn]
    .forEach(btn => btn.classList.remove('active'));
  activeBtn.classList.add('active');
}

// Masquer/Afficher UI
hideUIBtn.addEventListener('click', () => {
  uiVisible = !uiVisible;
  
  if (uiVisible) {
    toolbar.style.display = 'flex';
    minimap.style.display = 'block';
    hideUIBtn.textContent = '👁️';
    hideUIBtn.title = 'Masquer interface';
  } else {
    toolbar.style.display = 'none';
    minimap.style.display = 'none';
    hideUIBtn.style.display = 'block';
    hideUIBtn.textContent = '👁️‍🗨️';
    hideUIBtn.title = 'Afficher interface';
  }
});

// Pan
panBtn.addEventListener('click', () => {
  setActiveButton(panBtn);
  stage.draggable(true);
  container.style.cursor = 'grab';
});

// Zoom in
zoomInBtn.addEventListener('click', () => {
  setActiveButton(zoomInBtn);
  stage.draggable(false);
  const oldScale = stage.scaleX();
  stage.scale({ x: oldScale * scaleFactor, y: oldScale * scaleFactor });
  stage.batchDraw();
  container.style.cursor = 'crosshair';
});

// Zoom out
zoomOutBtn.addEventListener('click', () => {
  setActiveButton(zoomOutBtn);
  stage.draggable(false);
  const oldScale = stage.scaleX();
  stage.scale({ x: oldScale / scaleFactor, y: oldScale / scaleFactor });
  stage.batchDraw();
  container.style.cursor = 'crosshair';
});

// Reset zoom
resetZoomBtn.addEventListener('click', () => {
  setActiveButton(panBtn);
  stage.scale({ x: 1, y: 1 });
  stage.position({ x: 0, y: 0 });
  stage.batchDraw();
  stage.draggable(true);
  container.style.cursor = 'grab';
});

// Background toggle
bgBlackBtn.addEventListener('click', () => {
  bgBlackBtn.classList.add('active');
  bgWhiteBtn.classList.remove('active');
  container.style.backgroundColor = '#000';
});
bgWhiteBtn.addEventListener('click', () => {
  bgWhiteBtn.classList.add('active');
  bgBlackBtn.classList.remove('active');
  container.style.backgroundColor = '#fff';
});

// Eraser (object deletion)
eraserBtn.addEventListener('click', () => {
  setActiveButton(eraserBtn);
  stage.draggable(false);
  container.style.cursor = 'crosshair';
});

stage.on('click', evt => {
  if (eraserBtn.classList.contains('active')) {
    const target = evt.target;
    
    if (target.getClassName() === 'Line' && target.id()) {
      const shape = target;
      const id = shape.id();
      
      // Ajouter feedback visuel
      shape.stroke('#ff0000');
      shape.opacity(0.5);
      layer.draw();
      
      // Supprimer après court délai
      setTimeout(() => {
        shape.destroy();
        layer.draw();
        socket.emit('deleteShape', { id });
      }, 150);
    }
  }
});

// Ajouter feedback au survol en mode gomme
stage.on('mouseover', evt => {
  if (eraserBtn.classList.contains('active')) {
    const target = evt.target;
    if (target.getClassName() === 'Line' && target.id()) {
      target.opacity(0.7);
      layer.draw();
      container.style.cursor = 'pointer';
    }
  }
});

stage.on('mouseout', evt => {
  if (eraserBtn.classList.contains('active')) {
    const target = evt.target;
    if (target.getClassName() === 'Line' && target.id()) {
      target.opacity(1);
      layer.draw();
      container.style.cursor = 'crosshair';
    }
  }
});

// Clear canvas
clearBtn.addEventListener('click', () => {
  setActiveButton(clearBtn);
  layer.destroyChildren();
  layer.draw();
  socket.emit('clearCanvas');
});

// Export PNG
exportBtn.addEventListener('click', () => {
  setActiveButton(exportBtn);
  const uri = stage.toDataURL({ pixelRatio: 3 });
  const link = document.createElement('a');
  link.download = 'canvas.png';
  link.href = uri;
  link.click();
});

// Back to public
backHomeBtn.addEventListener('click', () => {
  setActiveButton(backHomeBtn);
  window.location.href = '/';
});

// Style spécial pour le bouton masquer UI
hideUIBtn.style.position = 'fixed';
hideUIBtn.style.top = '10px';
hideUIBtn.style.right = '10px';
hideUIBtn.style.zIndex = '2000';
hideUIBtn.style.backgroundColor = 'rgba(0,0,0,0.7)';
hideUIBtn.style.border = '1px solid #666';
hideUIBtn.style.borderRadius = '50%';
hideUIBtn.style.width = '40px';
hideUIBtn.style.height = '40px';