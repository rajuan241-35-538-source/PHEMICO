const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// GET all suppliers — any logged-in user
router.get('/', verifyToken, (req, res) => {
  const sql = 'SELECT * FROM suppliers';
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
    res.json(results);
  });
});

// GET a single supplier by id — any logged-in user
router.get('/:id', verifyToken, (req, res) => {
  const sql = 'SELECT * FROM suppliers WHERE id = ?';
  db.query(sql, [req.params.id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json(results[0]);
  });
});

// CREATE a supplier — admin only
router.post('/', verifyToken, requireAdmin, (req, res) => {
  const { name, contact_person, phone, email, address } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Supplier name is required' });
  }

  const sql = `INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)`;
  db.query(sql, [name, contact_person, phone, email, address], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
    res.status(201).json({ message: 'Supplier added', id: result.insertId });
  });
});

// UPDATE a supplier — admin only 
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  const fields = req.body;
  const allowedFields = ['name', 'contact_person', 'phone', 'email', 'address'];

  const updates = [];
  const values = [];

  for (const key of allowedFields) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(fields[key]);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'No valid fields provided to update' });
  }

  values.push(req.params.id);
  const sql = `UPDATE suppliers SET ${updates.join(', ')} WHERE id = ?`;

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json({ message: 'Supplier updated' });
  });
});

// DELETE a supplier — admin only
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  const sql = 'DELETE FROM suppliers WHERE id = ?';
  db.query(sql, [req.params.id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json({ message: 'Supplier deleted' });
  });
});

module.exports = router;