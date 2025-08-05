// public/admin.js - VERSION AVEC INITIALISATION SIMPLIFIÉE ET ROBUSTE
const socket = io();
const stage = new Konva.Stage({
  container: 'canvas-container',
  width: window.innerWidth,
  height: window.innerHeight
});
const layer = new Konva.Layer();
stage.add(layer);

// Rendre stage disponible globalement pour BrushManager
window.stage = stage;

// === INITIALISATION SIMPLIFIÉE DU BRUSH MANAGER (ADMIN = SPECTATEUR HAUTE QUALITÉ) ===
let brushManager = null;

// Fonction d'initialisation directe (BrushManager doit être déjà chargé)
function initBrushManager() {
  if (typeof BrushManager !== 'undefined') {
    try {
      brushManager = new BrushManager('admin', layer, null); // null car admin ne dessine pas
      console.log('✅ BrushManager initialized successfully for admin interface (high quality + viewport optimization)');
      return true;
    } catch (error) {
      console.error('❌ Error creating BrushManager:', error);
      return false;
    }
  } else {
    console.error('❌ BrushManager class not found - check script loading order');
    return false;
  }
}

// Initialisation immédiate (BrushManager doit être chargé avant ce script)
const brushManagerReady = initBrushManager();

// Fonction pour obtenir le BrushManager de façon sûre
function getBrushManager() {
  return brushManagerReady ? brushManager : null;
}

// === SOCKET LISTENERS POUR RÉCEPTION D'EFFETS ===

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
  const manager = getBrushManager();
  if (manager) {
    manager.createNetworkEffect(data);
  } else {
    console.warn('🔶 BrushManager not available for network effect, skipping');
  }
});

socket.on('texture', data => {
  createTextureEffect(data.x, data.y, data.color, data.size);
});

socket.on('cleanupUserEffects', (data) => {
  const manager = getBrushManager();
  if (manager) {
    manager.cleanupUserEffects(data.socketId);
  }
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
  // UTILISE LE BRUSH MANAGER pour nettoyer les traces permanentes
  const manager = getBrushManager();
  if (manager) {
    manager.clearPermanentTraces();
  }
  layer.draw();
});

socket.on('restoreShapes', (shapes) => {
  layer.destroyChildren();
  // UTILISE LE BRUSH MANAGER pour nettoyer les traces permanentes
  const manager = getBrushManager();
  if (manager) {
    manager.clearPermanentTraces();
  }
  
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
  const manager = getBrushManager();
  if (manager && manager.updateViewportBounds) {
    setTimeout(() => manager.updateViewportBounds(), 50);
  }
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
  const manager = getBrushManager();
  if (manager && manager.updateViewportBounds) {
    setTimeout(() => manager.updateViewportBounds(), 50);
  }
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
  const manager = getBrushManager();
  if (manager && manager.updateViewportBounds) {
    setTimeout(() => manager.updateViewportBounds(), 50);
  }
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
  const manager = getBrushManager();
  if (manager) {
    manager.clearPermanentTraces();
  }
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
  const manager = getBrushManager();
  if (manager && manager.updateViewportBounds) {
    manager.updateViewportBounds();
  }
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
  const manager = getBrushManager();
  if (manager && manager.updateViewportBounds) {
    setTimeout(() => manager.updateViewportBounds(), 100);
  }
});

console.log('✅ Admin.js loaded for chantilly interface with viewport optimization');
console.log('🎯 BrushManager status:', brushManagerReady ? 'Ready (High quality + viewport optimization)' : 'Not available');
console.log('📍 Viewport optimization enabled for performance');