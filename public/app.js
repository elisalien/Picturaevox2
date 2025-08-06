// MODIFIÉ : Clear canvas avec logs debug ULTRA détaillés
socket.on('clearCanvas', () => {
  const childrenBefore = layer.getChildren().length;
  const permanentTraces = layer.getChildren().filter(child => child.isPermanentTrace).length;
  const normalShapes = childrenBefore - permanentTraces;
  
  console.log(`🧼 INDEX RECEIVED clearCanvas event:`);
  console.log(`   - Total elements before: ${childrenBefore}`);
  console.log(`   - Permanent traces: ${permanentTraces}`);
  console.log(`   - Normal shapes: ${normalShapes}`);
  console.log(`   - Socket ID: ${socket.id}`);
  
  layer.destroyChildren(); // ✅ Supprime TOUT (y compris tracés permanents)
  brushManager.clearEverything(); // ✅ Clear complet du BrushManager
  layer.draw();
  
  const childrenAfter = layer.getChildren().length;
  console.log(`🧼 INDEX clearCanvas COMPLETE:`);
  console.log(`   - Elements after: ${childrenAfter}`);
  console.log(`   - Successfully cleared: ${childrenBefore - childrenAfter} elements`);
});// public/app.js - Version avec support des tracés permanents
const socket = io();
const stage = new Konva.Stage({
  container: 'canvas-container',
  width: window.innerWidth,
  height: window.innerHeight
});
const layer = new Konva.Layer();
stage.add(layer);

// Initialiser le BrushManager unifié
const brushManager = new BrushManager(layer, socket);

let currentTool  = 'brush';
let currentColor = '#FF5252'; // Couleur rouge fixe par défaut pour /index
let currentSize  = parseInt(document.getElementById('size-slider').value, 10);
let isDrawing    = false;
let lastLine;
let currentId;
let lastPanPos = null;

// Fonction globale pour changer la couleur - SUPPRIMÉE pour /index
// Interface /index utilise couleur fixe rouge (#FF5252)

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

// Coordonnées simplifiées pour index (pas de zoom)
function getScenePos(pointer) {
  return {
    x: pointer.x,
    y: pointer.y
  };
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
    updateCursor();
  });
});

// Gestion du curseur
function updateCursor() {
  const container = stage.container();
  switch(currentTool) {
    case 'pan':
      container.style.cursor = 'grab';
      break;
    default:
      container.style.cursor = 'crosshair';
  }
}

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

// Color selection - SUPPRIMÉ pour /index (couleur fixe)
// Interface /index utilise une couleur fixe rouge pour simplicité

// Size slider
document.getElementById('size-slider').addEventListener('input', e => {
  currentSize = parseInt(e.target.value, 10);
});

// === TEST DE CONNECTIVITÉ ===
socket.on('testBroadcastReceived', (data) => {
  console.log(`📡 INDEX received test broadcast:`, data);
});

// Raccourci Ctrl+Z pour undo
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
    stage.container().style.cursor = 'grabbing'; // Feedback visuel
    return;
  }
  
  const scenePos = getScenePos(pointer);
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

  // BRUSH ANIMÉS - Avec tracés permanents via BrushManager
  if (['neon', 'fire', 'sparkles', 'watercolor', 'electric', 'petals'].includes(currentTool)) {
    isDrawing = true;
    currentId = generateId();
    brushManager.createAndEmitEffect(currentTool, scenePos.x, scenePos.y, currentColor, pressureSize);
    return;
  }
  
  // Mode brush normal ou gomme
  isDrawing = true;
  currentId = generateId();
  
  lastLine = new Konva.Line({
    id: currentId,
    points: [scenePos.x, scenePos.y],
    stroke: currentColor,
    strokeWidth: pressureSize,
    globalCompositeOperation: currentTool === 'eraser' ? 'destination-out' : 'source-over',
    lineCap: 'round',
    lineJoin: 'round'
  });
  layer.add(lastLine);
  
  emitDrawingThrottled({
    id: currentId,
    points: [scenePos.x, scenePos.y],
    stroke: currentColor,
    strokeWidth: pressureSize,
    globalCompositeOperation: currentTool === 'eraser' ? 'destination-out' : 'source-over'
  });
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
  
  const scenePos = getScenePos(pointer);
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

  // BRUSH ANIMÉS - Continuer l'effet avec tracés permanents
  if (['neon', 'fire', 'sparkles', 'watercolor', 'electric', 'petals'].includes(currentTool)) {
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
    stage.container().style.cursor = 'grab'; // Retour curseur normal pan
    return;
  }

  if (!isDrawing) return;
  isDrawing = false;
  
  // Les brush animés et texture n'ont pas besoin d'événement final
  if (currentTool === 'texture' || ['neon', 'fire', 'sparkles', 'watercolor', 'electric', 'petals'].includes(currentTool)) {
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

// === EFFET TEXTURE SIMPLIFIÉ ===
function createTextureEffect(x, y, color, size) {
  for (let i = 0; i < 4; i++) {
    const offsetX = (Math.random() - 0.5) * 8;
    const offsetY = (Math.random() - 0.5) * 8;
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

// Initialize existing shapes on load (INCLUDING permanent traces)
socket.on('initShapes', shapes => {
  shapes.forEach(data => {
    if (data.type === 'permanentTrace') {
      // ✅ NOUVEAU : Recréer les tracés permanents depuis les données serveur
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
      // Tracé normal (brush classique)
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
  
  console.log(`✅ Loaded ${shapes.length} shapes (including permanent traces)`);
});

socket.on('brushEffect', (data) => {
  brushManager.createNetworkEffect(data);
});

socket.on('cleanupUserEffects', (data) => {
  brushManager.cleanupUserEffects(data.socketId);
});

socket.on('drawing', data => {
  let shape = layer.findOne('#' + data.id);
  if (shape) {
    shape.points(data.points);
    shape.strokeWidth(data.strokeWidth);
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
    console.log(`🧽 Shape deleted: ${id} (type: ${shape.isPermanentTrace ? 'permanent trace' : 'normal'})`);
  }
});

// MODIFIÉ : Clear canvas avec tracés permanents
socket.on('clearCanvas', () => {
  const childrenCount = layer.getChildren().length;
  layer.destroyChildren(); // ✅ Supprime TOUT (y compris tracés permanents)
  brushManager.clearEverything(); // ✅ Clear complet du BrushManager
  layer.draw();
  
  console.log(`🧼 Canvas cleared: ${childrenCount} elements removed (including permanent traces)`);
});

socket.on('restoreShapes', (shapes) => {
  const childrenCount = layer.getChildren().length;
  layer.destroyChildren(); // Vider d'abord
  brushManager.clearEverything();
  
  shapes.forEach(data => {
    if (data.type === 'permanentTrace') {
      // ✅ Restaurer les tracés permanents
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
      // Restaurer tracé normal
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
  
  console.log(`↶ Restored ${shapes.length} shapes after undo (cleared ${childrenCount} first)`);
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

// Reset des brush effects par admin (garde les tracés permanents)
socket.on('adminResetBrushEffects', () => {
  brushManager.clearAllEffects(); // Ne supprime que les effets temporaires
  showUndoNotification('Effets réinitialisés ✨');
  console.log('🎨 Admin reset: Temporary effects cleared, permanent traces kept');
});

// Initialisation du curseur
updateCursor();

console.log('✅ App.js with permanent traces loaded');