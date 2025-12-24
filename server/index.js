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
    if (otherUser) {
      socket.emit('other user', otherUser);
    }
  });

  socket.on('offer', (payload) => {
    if (payload.target === "broadcast-in-room") {
        // Enviar para todos os outros na mesma sala
        const roomID = Array.from(socket.rooms).find(r => r !== socket.id);
        if (roomID) {
            socket.to(roomID).emit('offer', payload);
        }
    } else {
        io.to(payload.target).emit('offer', payload);
    }
  });

  socket.on('answer', (payload) => {
    io.to(payload.target).emit('answer', payload);
  });

  socket.on('ice-candidate', (incoming) => {
    io.to(incoming.target).emit('ice-candidate', incoming.candidate);
  });

  socket.on('send-chat-message', (message) => {
    socket.broadcast.emit('chat-message', message);
  });

  socket.on('disconnect', () => {
    Object.keys(rooms).forEach(roomID => {
      rooms[roomID] = rooms[roomID].filter(id => id !== socket.id);
    });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
