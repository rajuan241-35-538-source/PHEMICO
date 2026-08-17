import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';
import '../styles/layout.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [medRes, supRes, saleRes] = await Promise.all([
          api.get('/medicines'),
          api.get('/suppliers'),
          api.get('/sales'),
        ]);
        setMedicines(medRes.data);
        setSuppliers(supRes.data);
        setSales(saleRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const lowStockItems = medicines.filter(m => m.quantity <= m.reorder_level);
  const todayTotal = sales
    .filter(s => new Date(s.sale_date).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + Number(s.total_amount), 0);
  const recentSales = [...sales].slice(0, 5);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-heading">
          <h2>Pharmacy Overview</h2>
<p>Welcome back, {user?.name?.split(' ')[0]} Your pharmacy, simplified.</p>
        </div>

        {loading ? (
          <p>Loading dashboard...</p>
        ) : (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <div className="stat-label">Total Medicines</div>
                <div className="stat-value">{medicines.length}</div>
              </div>
              <div className={`stat-card ${lowStockItems.length > 0 ? 'warning' : ''}`}>
                <div className="stat-label">Low Stock Alerts</div>
                <div className="stat-value">{lowStockItems.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Suppliers</div>
                <div className="stat-value">{suppliers.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Today's Sales</div>
                <div className="stat-value">{todayTotal.toFixed(2)}</div>
              </div>
            </div>

            <div className="panel-grid">
              <div className="panel">
                <h3>Recent Sales</h3>
                {recentSales.length === 0 ? (
                  <p className="empty-state">No sales recorded yet.</p>
                ) : (
                  <table>
                    <thead>
                      <tr><th>ID</th><th>Total</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {recentSales.map(sale => (
                        <tr key={sale.id}>
                          <td>#{sale.id}</td>
                          <td>{sale.total_amount}</td>
                          <td>{new Date(sale.sale_date).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="panel">
                <h3>Low Stock Items</h3>
                {lowStockItems.length === 0 ? (
                  <p className="empty-state">Everything is well stocked.</p>
                ) : (
                  lowStockItems.map(item => (
                    <div className="notif-item" key={item.id}>
                      ⚠️ {item.name} — only {item.quantity} left (reorder at {item.reorder_level})
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}