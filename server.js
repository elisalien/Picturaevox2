// server.js - Version avec historique limité et clear admin corrigé
require('dotenv').config();

const express = require('express');
const app = express();
const path = require('path');
const http = require('http').Server(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// In-memory store for shapes
const shapes = {};
// Historique des actions (RÉDUIT À 2 pour optimisation)
const actionHistory = [];
const MAX_HISTORY = 2; // ✅ LIMITÉ À 2 ACTIONS

// Optimisations performance
const MAX_SHAPES = 500;
const CLEANUP_INTERVAL = 60000;
const SHAPE_TTL = 300000;

// Ajouter timestamp aux formes
function addTimestampToShape(shapeData) {
  return {
    ...shapeData,
    timestamp: Date.now()
  };
}

// Nettoyage automatique des anciennes formes
function cleanupOldShapes() {
  const now = Date.now();
  const shapeIds = Object.keys(shapes);
  
  if (shapeIds.length > MAX_SHAPES) {
    const sortedShapes = shapeIds
      .map(id => ({ id, timestamp: shapes[id].timestamp || 0 }))
      .sort((a, b) => a.timestamp - b.timestamp);
    
    const toDelete = sortedShapes.slice(0, shapeIds.length - MAX_SHAPES);
    toDelete.forEach(({ id }) => {
      delete shapes[id];
    });
    
    console.log(`Cleaned up ${toDelete.length} old shapes`);
  }
  
  const expired = shapeIds.filter(id => {
    const shape = shapes[id];
    return shape.timestamp && (now - shape.timestamp) > SHAPE_TTL;
  });
  
  expired.forEach(id => delete shapes[id]);
  
  if (expired.length > 0) {
    console.log(`Removed ${expired.length} expired shapes`);
  }
}

setInterval(cleanupOldShapes, CLEANUP_INTERVAL);

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/chantilly', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/atelier', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'atelier.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

io.on('connection', socket => {
  console.log('a user connected');

  // Send existing shapes to this client (INCLUDING permanent traces)
  socket.emit('initShapes', Object.values(shapes));

  // Broadcast streaming drawing data
  socket.on('drawing', data => {
    socket.broadcast.emit('drawing', data);
  });

  // Broadcast texture brush data
  socket.on('texture', data => {
    if (!socket.lastTextureTime || Date.now() - socket.lastTextureTime > 100) {
      socket.broadcast.emit('texture', data);
      socket.lastTextureTime = Date.now();
    }
  });

  // Gestion des brush effects avec sauvegarde des tracés permanents
  socket.on('brushEffect', data => {
    const now = Date.now();
    const throttleTime = data.interface === 'admin' ? 100 : 
                        data.interface === 'atelier' ? 150 : 250;
    
    if (!socket.lastBrushEffect || (now - socket.lastBrushEffect) >= throttleTime) {
      // ✅ NOUVEAU : Sauvegarder les tracés permanents
      if (data.permanentTraces && data.permanentTraces.length > 0) {
        data.permanentTraces.forEach(trace => {
          const traceWithTimestamp = addTimestampToShape({
            ...trace,
            id: trace.id || generateTraceId(),
            type: 'permanentTrace'
          });
          shapes[traceWithTimestamp.id] = traceWithTimestamp;
        });
        
        console.log(`💾 Saved ${data.permanentTraces.length} permanent traces from ${data.type} brush`);
      }
      
      socket.broadcast.emit('brushEffect', {
        ...data,
        socketId: socket.id,
        serverTimestamp: now
      });
      socket.lastBrushEffect = now;
    }
  });

  socket.on('cleanupUserEffects', ({ userId }) => {
    socket.broadcast.emit('cleanupUserEffects', { 
      socketId: socket.id, 
      userId 
    });
  });

  // Création de formes prédéfinies
  socket.on('shapeCreate', data => {
    const shapeWithTimestamp = addTimestampToShape(data);
    shapes[data.id] = shapeWithTimestamp;
    socket.broadcast.emit('shapeCreate', data);
  });

  // Final draw event
  socket.on('draw', data => {
    const optimizedData = {
      ...data,
      points: data.points.length > 200 ? simplifyPoints(data.points, 100) : data.points
    };
    
    const shapeWithTimestamp = addTimestampToShape(optimizedData);
    
    // Ajouter à l'historique (LIMITÉ À 2)
    addToHistory({
      type: 'draw',
      action: 'add',
      data: shapeWithTimestamp
    });
    
    shapes[data.id] = shapeWithTimestamp;
    socket.broadcast.emit('draw', optimizedData);
  });

  // Shape deletion
  socket.on('deleteShape', ({ id }) => {
    console.log('🧽 Delete shape command:', id);
    
    const deletedShape = shapes[id];
    if (deletedShape) {
      addToHistory({
        type: 'delete',
        action: 'remove',
        data: deletedShape
      });
    }
    
    delete shapes[id];
    io.emit('deleteShape', { id });
  });

  // Clear canvas - ✅ CORRIGÉ POUR ADMIN
  socket.on('clearCanvas', () => {
    console.log('🧼 Clear canvas command - shapes before:', Object.keys(shapes).length);
    
    // Sauvegarder toutes les formes pour undo
    const allShapes = { ...shapes };
    addToHistory({
      type: 'clear',
      action: 'removeAll',
      data: allShapes
    });
    
    // ✅ CORRECTION MAJEURE : Vider le store shapes
    for (let id in shapes) {
      delete shapes[id];
    }
    
    // ✅ CORRECTION : Envoyer à TOUS les clients (y compris admin)
    io.emit('clearCanvas');
    
    console.log('🧼 Canvas cleared globally - shapes remaining:', Object.keys(shapes).length);
  });

  // Undo action - Limité à 2 actions
  socket.on('undo', () => {
    if (actionHistory.length > 0) {
      const lastAction = actionHistory.pop();
      
      console.log(`↶ Undo action performed: ${lastAction.type} (${actionHistory.length} actions remaining)`);
      
      switch (lastAction.type) {
        case 'draw':
          delete shapes[lastAction.data.id];
          io.emit('deleteShape', { id: lastAction.data.id });
          break;
          
        case 'delete':
          shapes[lastAction.data.id] = lastAction.data;
          io.emit('draw', lastAction.data);
          break;
          
        case 'clear':
          Object.assign(shapes, lastAction.data);
          io.emit('restoreShapes', Object.values(lastAction.data));
          break;
      }
    } else {
      console.log('↶ Undo requested but no actions in history');
    }
  });

  // ✅ Reset des brush effects globalement - CORRIGÉ
  socket.on('adminResetBrushEffects', () => {
    console.log('👑 Admin command: Reset all brush effects globally');
    
    // ✅ CORRECTION : Broadcaster à TOUS (y compris admin)
    io.emit('adminResetBrushEffects');
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
    socket.broadcast.emit('cleanupUserEffects', { socketId: socket.id });
  });
});

// Fonction pour générer un ID de tracé permanent
function generateTraceId() {
  return 'trace_' + Date.now() + '_' + Math.round(Math.random() * 100000);
}

// Fonction pour simplifier les points
function simplifyPoints(points, maxPoints) {
  if (points.length <= maxPoints * 2) return points;
  
  const simplified = [];
  const step = Math.floor(points.length / maxPoints / 2) * 2;
  
  for (let i = 0; i < points.length; i += step) {
    simplified.push(points[i], points[i + 1]);
  }
  
  if (simplified.length < points.length) {
    simplified.push(points[points.length - 2], points[points.length - 1]);
  }
  
  return simplified;
}

// ✅ Fonction d'historique LIMITÉE À 2 ACTIONS
function addToHistory(action) {
  actionHistory.push(action);
  
  // ✅ OPTIMISATION : Garder seulement les 2 dernières actions
  if (actionHistory.length > MAX_HISTORY) {
    actionHistory.shift(); // Supprimer la plus ancienne
  }
  
  console.log(`📝 Action added to history: ${action.type} (${actionHistory.length}/${MAX_HISTORY})`);
}

const PORT = process.env.PORT || 3000;

http.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Undo history limited to ${MAX_HISTORY} actions for better performance`);
});