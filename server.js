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

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Route pour l'admin
app.get('/chantilly', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
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

  // Final draw event, update store and broadcast
  socket.on('draw', data => {
    shapes[data.id] = data;
    socket.broadcast.emit('draw', data);
  });

  // Shape deletion, update store and broadcast
  socket.on('deleteShape', ({ id }) => {
    delete shapes[id];
    io.emit('deleteShape', { id });
  });

  // Clear canvas, clear store and broadcast
  socket.on('clearCanvas', () => {
    for (let id in shapes) delete shapes[id];
    io.emit('clearCanvas');
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// Le port DOIT être celui fourni par Railway
const PORT = process.env.PORT || 3000;

http.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});