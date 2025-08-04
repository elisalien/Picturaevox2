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

  // Broadcast streaming drawing data
  socket.on('drawing', data => {
    socket.broadcast.emit('drawing', data);
  });

  // Broadcast texture brush data
  socket.on('texture', data => {
    socket.broadcast.emit('texture', data);
  });

  // Création de formes prédéfinies
  socket.on('shapeCreate', data => {
    shapes[data.id] = data;
    socket.broadcast.emit('shapeCreate', data);
  });

  // Final draw event, update store and broadcast
  socket.on('draw', data => {
    // Ajouter à l'historique
    addToHistory({
      type: 'draw',
      action: 'add',
      data: data
    });
    
    shapes[data.id] = data;
    socket.broadcast.emit('draw', data);
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