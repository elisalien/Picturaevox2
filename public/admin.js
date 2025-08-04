// public/admin.js
const socket = io();
const stage = new Konva.Stage({
  container: 'canvas-container',
  width: window.innerWidth,
  height: window.innerHeight
});
const layer = new Konva.Layer();
stage.add(layer);

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

// Listen for texture brush events (corrigé)
socket.on('texture', data => {
  createTextureEffect(data.x, data.y, data.color, data.size);
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
  // Recréer la forme selon son type
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
    hideUIBtn.style.display = 'block'; // Garder juste ce bouton visible
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
    
    // Vérifier si c'est une forme (Line ou autre)
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