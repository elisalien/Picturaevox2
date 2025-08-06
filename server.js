// Ajout dans les socket listeners de server.js - À insérer avant socket.on('disconnect')

  // NOUVEL ÉVÉNEMENT - Admin reset des brush effects globalement
  socket.on('adminResetBrushEffects', () => {
    console.log('👑 Admin command: Reset all brush effects globally');
    
    // Broadcaster la commande à tous les autres clients
    socket.broadcast.emit('adminResetBrushEffects');
  });

  // Undo action - Amélioré avec log admin
  socket.on('undo', () => {
    if (actionHistory.length > 0) {
      const lastAction = actionHistory.pop();
      
      console.log('↶ Undo action performed:', lastAction.type);
      
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

  // Clear canvas - Amélioré avec log admin
  socket.on('clearCanvas', () => {
    console.log('🧼 Clear canvas command - shapes before:', Object.keys(shapes).length);
    
    // Sauvegarder toutes les formes pour undo
    const allShapes = { ...shapes };
    addToHistory({
      type: 'clear',
      action: 'removeAll',
      data: allShapes
    });
    
    for (let id in shapes) delete shapes[id];
    io.emit('clearCanvas');
    
    console.log('🧼 Canvas cleared globally - shapes remaining:', Object.keys(shapes).length);
  });

  // Shape deletion - Amélioré avec log admin
  socket.on('deleteShape', ({ id }) => {
    console.log('🧽 Delete shape command:', id);
    
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