const { v4: uuidv4 } = require('uuid');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: [ "GET", "POST" ]
    }
});
const port = process.env.PORT || 3001;

app.use(cors());

const rooms = new Map();
const users = new Map();

io.on('connection', (socket) => {
  const socketId = socket.id;

  socket.emit("yourID", socket.id);

  socket.on('createRoom', (username) => {
    const roomId = uuidv4();
    rooms.set(roomId, new Set());
    rooms.get(roomId).add(socket.id);
    users.set(socket.id, username);
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
  });

  socket.on('roomStatus', (roomId) => {
    if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        const people = room.size;
        socket.emit('roomStatus', people);
    } else {
        socket.emit('roomStatus', 0);
    }
  });

  socket.on('joinRoom', (data) => {
    roomId = data.roomid;
    text = data.text;
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      if (room.size >= 2) {
        socket.emit('roomfull', roomId);
        return;
      } else {
      room.add(socket.id);
      users.set(socket.id, text);
      const players = room.size;
      socket.join(roomId);
      socket.emit('roomJoined', roomId);
      io.to(roomId).emit('startGame', players);
      }
    } else {
      socket.emit('noroom', roomId);
    }
  });

  socket.on('updateFEN', (fenData) => {
    fenData.currentColor = fenData.currentColor ==='white' ? 'black' : 'white';
    for (const [roomID, users] of rooms) {
        if (users.has(socket.id)) {
            io.to(roomID).emit('updateFEN', fenData);
            break;
        }
    }
  });

  socket.on("getOpp", () => {
    for (const [roomId, user] of rooms) {
      if (user.has(socketId)) {
        const oppId = [...user].find(element => element !== socketId);
        const oppName = users.get(oppId); 
        oppoName = oppName.charAt(0).toUpperCase() + oppName.slice(1);
        socket.emit('gotOpp', oppoName);
        break;
      }
      }
  });

  socket.on('getRemoteId', () => {
    for (const [roomId, user] of rooms) {
      if (user.has(socketId)) {
        const oppId = [...user].find(element => element !== socketId);
        socket.emit('gotRemoteId', oppId);
        break;
      }
      }
  });

  socket.on('gameover', (turn) => {
    const winner = turn === 'w' ? 'Black' : 'White';
    for (const [roomID, users] of rooms) {
      if (users.has(socket.id)) {
          io.to(roomID).emit('gameover', winner);
          break;
      }
    }
  });

  socket.on('draw', () => {
    for (const [roomID, users] of rooms) {
      if (users.has(socket.id)) {
          io.to(roomID).emit('draw');
          break;
      }
    }
  });

  socket.on('disconnect', () => {
    for (const [roomId, users] of rooms) {
        if (users.has(socketId)) {
          users.delete(socketId);
          io.to(roomId).emit('playerLeft', users.size);
          if (users.size === 0) {
            rooms.delete(roomId);
          }
          break;
        }
        }

    });
});

server.listen(port, () => {
  console.log('Server listening on port: ' + port);
});