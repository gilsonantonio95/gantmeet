const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, '../dist')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const rooms = {};

io.on('connection', (socket) => {
  socket.on('join', (roomID) => {
    socket.join(roomID);
    if (!rooms[roomID]) rooms[roomID] = [];
    rooms[roomID].push(socket.id);
    const otherUser = rooms[roomID].find(id => id !== socket.id);
    if (otherUser) socket.emit('other user', otherUser);
  });

  socket.on('offer', (payload) => {
    if (payload.target === "broadcast-in-room") {
        const roomID = Array.from(socket.rooms).find(r => r !== socket.id);
        if (roomID) socket.to(roomID).emit('offer', payload);
    } else { io.to(payload.target).emit('offer', payload); }
  });

  socket.on('answer', (payload) => io.to(payload.target).emit('answer', payload));
  socket.on('ice-candidate', (incoming) => io.to(incoming.target).emit('ice-candidate', incoming.candidate));
  
  // Chat
  socket.on('send-chat-message', (message) => {
    const roomID = Array.from(socket.rooms).find(r => r !== socket.id);
    if (roomID) socket.to(roomID).emit('chat-message', message);
  });

  // Whiteboard (Strokes and Images)
  socket.on('stroke-start', (data) => {
    const roomID = Array.from(socket.rooms).find(r => r !== socket.id);
    if (roomID) socket.to(roomID).emit('stroke-start', data);
  });
  socket.on('stroke-update', (data) => {
    const roomID = Array.from(socket.rooms).find(r => r !== socket.id);
    if (roomID) socket.to(roomID).emit('stroke-update', data);
  });
  socket.on('image-add', (data) => {
    const roomID = Array.from(socket.rooms).find(r => r !== socket.id);
    if (roomID) socket.to(roomID).emit('image-add', data);
  });
  socket.on('object-remove', (id) => {
    const roomID = Array.from(socket.rooms).find(r => r !== socket.id);
    if (roomID) socket.to(roomID).emit('object-remove', id);
  });
  socket.on('clear-board', () => {
    const roomID = Array.from(socket.rooms).find(r => r !== socket.id);
    if (roomID) socket.to(roomID).emit('clear-board');
  });

  socket.on('disconnect', () => {
    Object.keys(rooms).forEach(roomID => {
      rooms[roomID] = rooms[roomID].filter(id => id !== socket.id);
    });
  });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
