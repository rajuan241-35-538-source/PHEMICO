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

// Test route to confirm server + DB are working
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});