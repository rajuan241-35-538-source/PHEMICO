const express = require('express');
const cors = require('cors');

require('dotenv').config();

const db = require('./db'); // ensures connection runs on startup

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const medicineRoutes = require('./routes/medicines');
app.use('/api/medicines', medicineRoutes);

const supplierRoutes = require('./routes/suppliers');
app.use('/api/suppliers', supplierRoutes);

const salesRoutes = require('./routes/sales');
app.use('/api/sales', salesRoutes);

const notificationRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationRoutes);

// Test route to confirm server + DB are working
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Track connected users by their user ID
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their notification room`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible in your routes
app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});