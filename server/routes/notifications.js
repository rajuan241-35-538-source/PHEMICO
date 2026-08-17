const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/authMiddleware');

// GET all notifications for the logged-in user (most recent first)
router.get('/', verifyToken, (req, res) => {
  const userId = req.user.id;

  db.query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
      }
      res.json(results);
    }
  );
});

// GET unread notification count for the logged-in user (for a bell icon badge)
router.get('/unread-count', verifyToken, (req, res) => {
  const userId = req.user.id;

  db.query(
    'SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
      }
      res.json({ unread_count: results[0].unread_count });
    }
  );
});

// PUT mark a single notification as read
router.put('/:id/read', verifyToken, (req, res) => {
  const userId = req.user.id;
  const notificationId = req.params.id;

  db.query(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [notificationId, userId],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      res.json({ message: 'Notification marked as read' });
    }
  );
});

// PUT mark all of the logged-in user's notifications as read
router.put('/read-all', verifyToken, (req, res) => {
  const userId = req.user.id;

  db.query(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
    [userId],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
      }
      res.json({ message: 'All notifications marked as read', updated: result.affectedRows });
    }
  );
});

// DELETE a single notification
router.delete('/:id', verifyToken, (req, res) => {
  const userId = req.user.id;
  const notificationId = req.params.id;

  db.query(
    'DELETE FROM notifications WHERE id = ? AND user_id = ?',
    [notificationId, userId],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      res.json({ message: 'Notification deleted' });
    }
  );
});

module.exports = router;