const db = require('../db');

function checkExpiringMedicines(io) {
  const sql = `
    SELECT * FROM medicines 
    WHERE expiry_date IS NOT NULL 
    AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    AND expiry_date >= CURDATE()
  `;

  db.query(sql, (err, expiringMeds) => {
    if (err) {
      console.error('Expiry check failed:', err);
      return;
    }

    if (expiringMeds.length === 0) return;

    db.query("SELECT id FROM users WHERE role = 'admin'", (err, admins) => {
      if (err || admins.length === 0) return;

      expiringMeds.forEach(med => {
        const daysLeft = Math.ceil((new Date(med.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
        const message = `Expiry alert: ${med.name} expires in ${daysLeft} day(s) (${med.expiry_date.toISOString().split('T')[0]})`;

        // Avoid duplicate spam: only insert if this exact message doesn't already exist for this user
        admins.forEach(admin => {
          const checkSql = 'SELECT id FROM notifications WHERE user_id = ? AND message = ? LIMIT 1';
          db.query(checkSql, [admin.id, message], (err, existing) => {
            if (err) return;
            if (existing.length > 0) return; // already notified, skip

            db.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [admin.id, message]);
            if (io) io.to(`user_${admin.id}`).emit('notification', { message });
          });
        });
      });
    });
  });
}

module.exports = checkExpiringMedicines;