// server.js
require('dotenv').config(); // Assure-toi d'avoir dotenv installé

const express = require('express');
const app = express();
const path = require('path');
const http = require('http').Server(app);
const io = require('socket.io')(http, {
  // Configuration pour Railway et autres hébergeurs
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'], // Support fallback
  allowEIO3: true
});

// In-memory store for shapes
const shapes = {};
// Historique des actions (max 2)
const actionHistory = [];
const MAX_HISTORY = 2;

// Optimisations performance
const MAX_SHAPES = 500; // Limite globale de formes
const CLEANUP_INTERVAL = 60000; // Nettoyage toutes les minutes
const SHAPE_TTL = 300000; // TTL des formes : 5 minutes

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
  
  // Si on dépasse la limite, supprimer les plus anciennes
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
  
  // Supprimer les formes trop anciennes
  const expired = shapeIds.filter(id => {
    const shape = shapes[id];
    return shape.timestamp && (now - shape.timestamp) > SHAPE_TTL;
  });
  
  expired.forEach(id => delete shapes[id]);
  
  if (expired.length > 0) {
    console.log(`Removed ${expired.length} expired shapes`);
  }
}

// Lancer le nettoyage périodique
setInterval(cleanupOldShapes, CLEANUP_INTERVAL);

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Route pour l'admin
app.get('/chantilly', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Route pour l'atelier artiste
app.get('/atelier', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'atelier.html'));
});

// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route de santé pour Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

io.on('connection', socket => {
  console.log('a user connected');

  // Send existing shapes to this client
  socket.emit('initShapes', Object.values(shapes));

  // Broadcast streaming drawing data (optimisé)
  socket.on('drawing', data => {
    // Optimisation : ne pas stocker les données de streaming
    socket.broadcast.emit('drawing', data);
  });

  // Broadcast texture brush data (optimisé)
  socket.on('texture', data => {
    // Throttling côté serveur pour réduire la charge réseau
    if (!socket.lastTextureTime || Date.now() - socket.lastTextureTime > 100) {
      socket.broadcast.emit('texture', data);
      socket.lastTextureTime = Date.now();
    }
  });

  // Création de formes prédéfinies
  socket.on('shapeCreate', data => {
    const shapeWithTimestamp = addTimestampToShape(data);
    shapes[data.id] = shapeWithTimestamp;
    socket.broadcast.emit('shapeCreate', data);
  });

  // Final draw event, update store and broadcast
  socket.on('draw', data => {
    // Ajouter timestamp et limiter les points si nécessaire
    const optimizedData = {
      ...data,
      points: data.points.length > 200 ? simplifyPoints(data.points, 100) : data.points
    };
    
    const shapeWithTimestamp = addTimestampToShape(optimizedData);
    
    // Ajouter à l'historique
    addToHistory({
      type: 'draw',
      action: 'add',
      data: shapeWithTimestamp
    });
    
    shapes[data.id] = shapeWithTimestamp;
    socket.broadcast.emit('draw', optimizedData);
  });

  // Shape deletion, update store and broadcast
  socket.on('deleteShape', ({ id }) => {
    // Sauvegarder la forme avant suppression pour undo
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

  // Clear canvas, clear store and broadcast
  socket.on('clearCanvas', () => {
    // Sauvegarder toutes les formes pour undo
    const allShapes = { ...shapes };
    addToHistory({
      type: 'clear',
      action: 'removeAll',
      data: allShapes
    });
    
    for (let id in shapes) delete shapes[id];
    io.emit('clearCanvas');
  });

  // Undo action
  socket.on('undo', () => {
    if (actionHistory.length > 0) {
      const lastAction = actionHistory.pop();
      
      switch (lastAction.type) {
        case 'draw':
          // Supprimer la dernière forme dessinée
          delete shapes[lastAction.data.id];
          io.emit('deleteShape', { id: lastAction.data.id });
          break;
          
        case 'delete':
          // Restaurer la forme supprimée
          shapes[lastAction.data.id] = lastAction.data;
          io.emit('draw', lastAction.data);
          break;
          
        case 'clear':
          // Restaurer toutes les formes
          Object.assign(shapes, lastAction.data);
          io.emit('restoreShapes', Object.values(lastAction.data));
          break;
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// Fonction pour simplifier les points (réduction de données)
function simplifyPoints(points, maxPoints) {
  if (points.length <= maxPoints * 2) return points; // Déjà assez simple
  
  const simplified = [];
  const step = Math.floor(points.length / maxPoints / 2) * 2; // Garder les pairs pour x,y
  
  for (let i = 0; i < points.length; i += step) {
    simplified.push(points[i], points[i + 1]);
  }
  
  // Toujours garder le dernier point
  if (simplified.length < points.length) {
    simplified.push(points[points.length - 2], points[points.length - 1]);
  }
  
  return simplified;
}

// Fonction pour ajouter à l'historique
function addToHistory(action) {
  actionHistory.push(action);
  
  // Garder seulement les 2 dernières actions
  if (actionHistory.length > MAX_HISTORY) {
    actionHistory.shift(); // Supprimer la plus ancienne
  }
}

// Le port DOIT être celui fourni par Railway
const PORT = process.env.PORT || 3000;

http.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});