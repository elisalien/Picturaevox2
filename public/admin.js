// public/admin.js - Version avec clear admin corrigé
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

// Initialiser le BrushManager unifié (sans socket car admin ne dessine pas)
const brushManager = new BrushManager(layer, null);

// Effet texture simplifié pour admin
function createTextureEffect(x, y, color, size) {
  const particleCount = 12;
  const spreadMultiplier = 1.6;
  
  for (let i = 0; i < particleCount; i++) {
    const offsetX = (Math.random() - 0.5) * 18 * spreadMultiplier;
    const offsetY = (Math.random() - 0.5) * 18 * spreadMultiplier;
    const alpha = 0.5 + Math.random() * 0.4;
    const dotSize = 1.5 + Math.random() * (size / 2);
    
    const shapeType = Math.random();
    let dot;
    
    if (shapeType < 0.6) {
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
      dot = new Konva.Circle({
        x: x + offsetX,
        y: y + offsetY,
        radius: dotSize,
        fill: color,
        opacity: alpha * 0.9
      });
    } else {
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

// === SOCKET LISTENERS POUR RÉCEPTION D'EFFETS ===

socket.on('initShapes', shapes => {
  shapes.forEach(data => {
    if (data.type === 'permanentTrace') {
      // ✅ Recréer les tracés permanents depuis le serveur
      let element;
      
      switch(data.shapeType) {
        case 'Star':
          element = new Konva.Star(data.attrs);
          break;
        case 'Circle':
          element = new Konva.Circle(data.attrs);
          break;
        case 'Line':
          element = new Konva.Line(data.attrs);
          break;
        case 'Ellipse':
          element = new Konva.Ellipse(data.attrs);
          break;
      }
      
      if (element) {
        element.id(data.id);
        element.isPermanentTrace = true;
        layer.add(element);
      }
    } else {
      // Tracé normal
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
  });
  layer.draw();
  
  console.log(`🎨 ADMIN: Loaded ${shapes.length} shapes (including permanent traces)`);
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

// ✅ CORRIGÉ : Clear canvas pour admin
socket.on('clearCanvas', () => {
  layer.destroyChildren();
  brushManager.clearEverything(); // Utilise la nouvelle méthode
  layer.draw();
  console.log('🧼 Admin received clearCanvas - everything cleared');
});

socket.on('restoreShapes', (shapes) => {
  layer.destroyChildren();
  brushManager.clearEverything();
  
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

// Raccourcis clavier admin
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault();
    socket.emit('undo');
    showAdminNotification('Undo Global ↶ (Limité à 2 actions)');
  }
  
  // ✅ CORRIGÉ : Clear global admin
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    e.preventDefault();
    
    if (confirm('ADMIN: Effacer TOUT le canvas pour TOUS les utilisateurs ?')) {
      // ✅ CORRECTION : Clear local d'abord
      layer.destroyChildren();
      brushManager.clearEverything();
      layer.draw();
      
      // ✅ Puis envoyer la commande globale
      socket.emit('clearCanvas');
      
      showAdminNotification('Canvas Cleared Globally 🧼');
    }
  }
  
  // ✅ CORRIGÉ : Reset COMPLET
  if (e.ctrlKey && e.shiftKey && e.key === 'R') {
    e.preventDefault();
    
    if (confirm('ADMIN: Reset COMPLET (dessins + effets) pour TOUS les utilisateurs ?')) {
      // Clear local complet
      layer.destroyChildren();
      brushManager.clearEverything();
      layer.draw();
      
      // Clear global complet - COMMANDES SÉPARÉES
      socket.emit('clearCanvas'); // Supprime les dessins
      socket.emit('adminResetBrushEffects'); // Supprime les effets
      
      showAdminNotification('Reset COMPLET Global 🧼✨');
    }
  }
  
  // Reset seulement les brush effects
  if (e.ctrlKey && e.shiftKey && e.key === 'E') {
    e.preventDefault();
    
    brushManager.clearAllEffects(); // Local seulement les effets temporaires
    layer.batchDraw();
    
    socket.emit('adminResetBrushEffects'); // Global
    
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

// Style CSS pour les notifications admin
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

// === INTERFACE ADMIN ===

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
const toolbar = document.querySelector('.admin-toolbar');
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

// Pan
panBtn?.addEventListener('click', () => {
  setActiveButton(panBtn);
  stage.draggable(true);
  container.style.cursor = 'grab';
});

// Zoom in
zoomInBtn?.addEventListener('click', () => {
  setActiveButton(zoomInBtn);
  stage.draggable(false);
  const oldScale = stage.scaleX();
  stage.scale({ x: oldScale * scaleFactor, y: oldScale * scaleFactor });
  stage.batchDraw();
  container.style.cursor = 'crosshair';
});

// Zoom out
zoomOutBtn?.addEventListener('click', () => {
  setActiveButton(zoomOutBtn);
  stage.draggable(false);
  const oldScale = stage.scaleX();
  stage.scale({ x: oldScale / scaleFactor, y: oldScale / scaleFactor });
  stage.batchDraw();
  container.style.cursor = 'crosshair';
});

// Reset zoom
resetZoomBtn?.addEventListener('click', () => {
  setActiveButton(panBtn);
  stage.scale({ x: 1, y: 1 });
  stage.position({ x: 0, y: 0 });
  stage.batchDraw();
  stage.draggable(true);
  container.style.cursor = 'grab';
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
        
        console.log(`🧽 ADMIN: Deleted shape ${id} for all users`);
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
      target.stroke('#ff4444');
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
      target.stroke(target.attrs.stroke || target.stroke());
      layer.draw();
      container.style.cursor = 'crosshair';
    }
  }
});

// Reset effects only
resetEffectsBtn?.addEventListener('click', () => {
  setActiveButton(resetEffectsBtn);
  
  brushManager.clearAllEffects();
  layer.batchDraw();
  
  socket.emit('adminResetBrushEffects');
  
  showAdminNotification('Effets Reset Globalement ✨');
});

// ✅ CORRIGÉ : Clear canvas button
clearBtn?.addEventListener('click', () => {
  if (confirm('ADMIN: Effacer TOUT pour TOUS les utilisateurs ?')) {
    setActiveButton(clearBtn);
    
    // Clear local
    layer.destroyChildren();
    brushManager.clearEverything();
    layer.draw();
    
    // Clear global
    socket.emit('clearCanvas');
    socket.emit('adminResetBrushEffects');
    
    showAdminNotification('Reset COMPLET Global 🧼✨');
  }
});

// Export PNG
exportBtn?.addEventListener('click', () => {
  setActiveButton(exportBtn);
  const uri = stage.toDataURL({ pixelRatio: 4 });
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

// Zoom avec molette
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
});

// Initialisation par défaut
stage.draggable(true);
container.style.cursor = 'grab';

// ✅ Reset des brush effects (côté client)
socket.on('adminResetBrushEffects', () => {
  brushManager.clearAllEffects();
  layer.batchDraw();
  console.log('🎨 ADMIN command: All brush effects reset');
});

console.log('✅ Admin.js fixed - Clear canvas and limited undo working');
console.log('👑 ADMIN POWERS:');
console.log('   • Global undo: Ctrl+Z (Limited to 2 actions)');
console.log('   • Clear drawings only: Ctrl+Shift+C');
console.log('   • Reset effects only: Ctrl+Shift+E ou bouton ✨');
console.log('   • Reset COMPLET (dessins + effets): Ctrl+Shift+R ou bouton 🧼');