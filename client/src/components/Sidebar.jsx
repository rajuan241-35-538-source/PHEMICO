import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/image.png';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={logo} alt="PHEMICO" />
        <span>PHEMICO</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" end>🏠 Dashboard</NavLink>
        <NavLink to="/medicines">💊 Inventory</NavLink>
        <NavLink to="/suppliers">🚚 Suppliers</NavLink>
        <NavLink to="/sales">🧾 Point of Sale</NavLink>
      </nav>

      <div className="sidebar-footer">
        <p>{user?.name}</p>
        <p className="role-tag">{user?.role === 'admin' ? 'Administrator' : 'Pharmacist'}</p>
        <button onClick={handleLogout}>Sign Out</button>
      </div>
    </aside>
  );
}