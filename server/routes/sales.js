const express = require('express');
const router = express.Router();
const db = require('../db');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { verifyToken } = require('../middleware/authMiddleware');

// CREATE a sale — any logged-in user (staff or admin) can record a sale
router.post('/', verifyToken, (req, res) => {
  const io = req.app.get('io');
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

                db.query('SELECT * FROM medicines WHERE id = ?', [item.medicine_id], (err, updatedMed) => {
                  if (!err && updatedMed.length > 0) {
                    const med = updatedMed[0];
                    if (med.quantity <= med.reorder_level) {
                      const lowStockMessage = `Low stock alert: ${med.name} has only ${med.quantity} left`;

                      db.query("SELECT id FROM users WHERE role = 'admin'", (err, admins) => {
                        if (!err) {
                          admins.forEach(admin => {
                            db.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [admin.id, lowStockMessage]);
                            io.to(`user_${admin.id}`).emit('notification', { message: lowStockMessage });
                          });
                        }
                      });
                    }
                  }
                });

                completed++;
                if (completed === saleItemsData.length && !hadError) {

                  const saleMessage = `Sale #${saleId} recorded successfully (Total: ${totalAmount})`;
                  db.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [userId, saleMessage]);
                  io.to(`user_${userId}`).emit('notification', { message: saleMessage });

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


// GET a sale's PDF receipt — generates on first request, serves from disk after
router.get('/:id/receipt', verifyToken, (req, res) => {
  const saleId = req.params.id;

  db.query('SELECT * FROM sales WHERE id = ?', [saleId], (err, saleResults) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
    if (saleResults.length === 0) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    const sale = saleResults[0];

    const receiptsDir = path.join(__dirname, '..', 'receipts');
    if (!fs.existsSync(receiptsDir)) {
      fs.mkdirSync(receiptsDir, { recursive: true });
    }

    // Already generated — just serve the existing file
    if (sale.receipt_path && fs.existsSync(path.join(receiptsDir, sale.receipt_path))) {
      return res.download(path.join(receiptsDir, sale.receipt_path));
    }

    db.query(
      `SELECT si.quantity, si.price_at_sale, m.name AS medicine_name
       FROM sale_items si
       JOIN medicines m ON si.medicine_id = m.id
       WHERE si.sale_id = ?`,
      [saleId],
      (err, items) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Server error' });
        }

        const fileName = `receipt_${saleId}.pdf`;
        const filePath = path.join(receiptsDir, fileName);
        const doc = new PDFDocument({ margin: 50 });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        doc.fontSize(18).text('PHEMICO — Sale Receipt', { align: 'center' });
        doc.moveDown();
        doc.fontSize(11).text(`Sale ID: ${sale.id}`);
        doc.text(`Date: ${new Date(sale.sale_date).toLocaleString()}`);
        doc.moveDown();

        doc.fontSize(12).text('Items', { underline: true });
        doc.moveDown(0.5);
        items.forEach(item => {
          const subtotal = item.quantity * item.price_at_sale;
          doc.fontSize(11).text(
            `${item.medicine_name}  x${item.quantity}  —  ${item.price_at_sale} each  =  ${subtotal.toFixed(2)}`
          );
        });

        doc.moveDown();
        doc.fontSize(13).text(`Total: ${sale.total_amount}`, { align: 'right' });
        doc.end();

        writeStream.on('finish', () => {
          db.query('UPDATE sales SET receipt_path = ? WHERE id = ?', [fileName, saleId], (err) => {
            if (err) console.error(err);
            res.download(filePath);
          });
        });

        writeStream.on('error', (err) => {
          console.error(err);
          res.status(500).json({ message: 'Failed to write receipt file' });
        });
      }
    );
  });
});


module.exports = router;