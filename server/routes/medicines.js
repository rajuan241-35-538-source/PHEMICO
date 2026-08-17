const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// GET all medicines — any logged-in user (admin or staff)
router.get('/', verifyToken, (req, res) => {
  const sql = 'SELECT * FROM medicines';
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
    res.json(results);
  });
});

// GET a single medicine by id — any logged-in user
router.get('/:id', verifyToken, (req, res) => {
  const sql = 'SELECT * FROM medicines WHERE id = ?';
  db.query(sql, [req.params.id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Medicine not found' });
    }
    res.json(results[0]);
  });
});

// CREATE a medicine — admin only
router.post('/', verifyToken, requireAdmin, (req, res) => {
  const { name, category, supplier_id, batch_number, quantity, reorder_level, unit_price, expiry_date } = req.body;

  if (!name || !unit_price) {
    return res.status(400).json({ message: 'Name and unit price are required' });
  }

  const sql = `INSERT INTO medicines 
    (name, category, supplier_id, batch_number, quantity, reorder_level, unit_price, expiry_date) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(sql, [name, category, supplier_id, batch_number, quantity || 0, reorder_level || 10, unit_price, expiry_date],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
      }
      res.status(201).json({ message: 'Medicine added', id: result.insertId });
    });
});

// UPDATE a medicine — admin only
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  const { name, category, supplier_id, batch_number, quantity, reorder_level, unit_price, expiry_date } = req.body;

  const sql = `UPDATE medicines SET 
    name = ?, category = ?, supplier_id = ?, batch_number = ?, 
    quantity = ?, reorder_level = ?, unit_price = ?, expiry_date = ? 
    WHERE id = ?`;

  db.query(sql, [name, category, supplier_id, batch_number, quantity, reorder_level, unit_price, expiry_date, req.params.id],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Medicine not found' });
      }
      res.json({ message: 'Medicine updated' });
    });
});

// DELETE a medicine — admin only
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  const sql = 'DELETE FROM medicines WHERE id = ?';
  db.query(sql, [req.params.id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Medicine not found' });
    }
    res.json({ message: 'Medicine deleted' });
  });
});

module.exports = router;