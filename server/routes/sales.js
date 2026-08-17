const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');

// CREATE a sale — any logged-in user (staff or admin) can record a sale
router.post('/', verifyToken, (req, res) => {
  const { items } = req.body; // items = [{ medicine_id, quantity }, ...]
  const userId = req.user.id;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Sale must include at least one item' });
  }

  const medicineIds = items.map(i => i.medicine_id);
  const placeholders = medicineIds.map(() => '?').join(',');

  db.query(`SELECT * FROM medicines WHERE id IN (${placeholders})`, medicineIds, (err, medicines) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }

    for (const item of items) {
      const med = medicines.find(m => m.id === item.medicine_id);
      if (!med) {
        return res.status(404).json({ message: `Medicine id ${item.medicine_id} not found` });
      }
      if (med.quantity < item.quantity) {
        return res.status(400).json({ message: `Not enough stock for ${med.name}` });
      }
    }

    let totalAmount = 0;
    const saleItemsData = items.map(item => {
      const med = medicines.find(m => m.id === item.medicine_id);
      const subtotal = med.unit_price * item.quantity;
      totalAmount += subtotal;
      return { medicine_id: med.id, quantity: item.quantity, price_at_sale: med.unit_price };
    });

    db.query('INSERT INTO sales (user_id, total_amount) VALUES (?, ?)', [userId, totalAmount], (err, saleResult) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
      }

      const saleId = saleResult.insertId;
      let completed = 0;
      let hadError = false;

      saleItemsData.forEach(item => {
        db.query(
          'INSERT INTO sale_items (sale_id, medicine_id, quantity, price_at_sale) VALUES (?, ?, ?, ?)',
          [saleId, item.medicine_id, item.quantity, item.price_at_sale],
          (err) => {
            if (err && !hadError) {
              hadError = true;
              console.error(err);
              return res.status(500).json({ message: 'Server error while saving sale items' });
            }

            db.query(
              'UPDATE medicines SET quantity = quantity - ? WHERE id = ?',
              [item.quantity, item.medicine_id],
              (err) => {
                if (err && !hadError) {
                  hadError = true;
                  console.error(err);
                  return res.status(500).json({ message: 'Server error while updating stock' });
                }

                completed++;
                if (completed === saleItemsData.length && !hadError) {
                  res.status(201).json({
                    message: 'Sale recorded successfully',
                    sale_id: saleId,
                    total_amount: totalAmount
                  });
                }
              }
            );
          }
        );
      });
    });
  });
});

// GET all sales — any logged-in user
router.get('/', verifyToken, (req, res) => {
  db.query('SELECT * FROM sales ORDER BY sale_date DESC', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
    res.json(results);
  });
});

// GET a single sale with its items — any logged-in user
router.get('/:id', verifyToken, (req, res) => {
  db.query('SELECT * FROM sales WHERE id = ?', [req.params.id], (err, saleResults) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (saleResults.length === 0) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    db.query(
      `SELECT si.*, m.name AS medicine_name 
       FROM sale_items si 
       JOIN medicines m ON si.medicine_id = m.id 
       WHERE si.sale_id = ?`,
      [req.params.id],
      (err, itemResults) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Server error' });
        }
        res.json({ ...saleResults[0], items: itemResults });
      }
    );
  });
});

module.exports = router;