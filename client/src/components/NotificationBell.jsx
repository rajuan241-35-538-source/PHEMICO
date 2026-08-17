import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const socketRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    socketRef.current = io('http://localhost:5000');
    socketRef.current.emit('join', user.id);

    socketRef.current.on('notification', (data) => {
      setNotifications((prev) => [
        { id: Date.now(), message: data.message, is_read: 0, created_at: new Date() },
        ...prev
      ]);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleOpen = () => {
    setOpen(!open);
    if (!open && unreadCount > 0) markAllRead();
  };

  return (
    <div className="notif-bell-wrapper">
      <button className="notif-bell" onClick={toggleOpen}>
        🔔
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <h4>Notifications</h4>
          {notifications.length === 0 ? (
            <p className="empty-state">No notifications yet.</p>
          ) : (
            notifications.slice(0, 10).map(n => (
              <div key={n.id} className="notif-dropdown-item">
                {n.message}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}