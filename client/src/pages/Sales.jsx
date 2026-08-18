import { useEffect, useState } from 'react';
import api from '../api/axios';
import Sidebar from '../components/Sidebar';
import '../styles/layout.css';

export default function Sales() {
  const [medicines, setMedicines] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState('');
  const [quantity, setQuantity] = useState('');
  const [sales, setSales] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  const fetchMedicines = async () => {
    const res = await api.get('/medicines');
    setMedicines(res.data);
  };

  const fetchSales = async () => {
    const res = await api.get('/sales');
    setSales(res.data);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchMedicines(), fetchSales()]);
    } catch {
      setError('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const addToCart = () => {
    setError('');

    if (!selectedMedicine || !quantity) {
      return setError('Please select a medicine and enter a quantity');
    }
    if (Number(quantity) <= 0) {
      return setError('Quantity must be greater than 0');
    }

    const med = medicines.find(m => m.id === parseInt(selectedMedicine));
    const alreadyInCart = cart
      .filter(item => item.medicine_id === parseInt(selectedMedicine))
      .reduce((sum, item) => sum + item.quantity, 0);

    if (med && (Number(quantity) + alreadyInCart) > med.quantity) {
      return setError(`Only ${med.quantity} in stock for ${med.name}`);
    }

    setCart([...cart, { medicine_id: parseInt(selectedMedicine), quantity: parseInt(quantity) }]);
    setSelectedMedicine('');
    setQuantity('');
  };

  const removeFromCart = (index) => setCart(cart.filter((_, i) => i !== index));

  const handleCheckout = async () => {
    setError(''); setMessage('');
    setCheckingOut(true);
    try {
      const res = await api.post('/sales', { items: cart });
      setMessage(`Sale #${res.data.sale_id} recorded — Total: ${res.data.total_amount}`);
      setCart([]);
      fetchMedicines();
      fetchSales();
    } catch (err) {
      setError(err.response?.data?.message || 'Sale failed');
    } finally {
      setCheckingOut(false);
    }
  };

  const downloadReceipt = (saleId) => {
    window.open(`http://localhost:5000/api/sales/${saleId}/receipt`, '_blank');
  };

  const getMedicineName = (id) => medicines.find(m => m.id === id)?.name || id;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-heading">
          <h2>Point of Sale</h2>
          <p>Record a sale, then download the receipt when you're done.</p>
        </div>

        <div className="form-card">
          <h3>New Sale</h3>
          <div className="form-grid">
            <select value={selectedMedicine} onChange={(e) => setSelectedMedicine(e.target.value)}>
              <option value="">Select Medicine</option>
              {medicines.map(med => (
                <option key={med.id} value={med.id}>{med.name} (Stock: {med.quantity})</option>
              ))}
            </select>
            <input type="number" min="1" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <button onClick={addToCart}>Add to Cart</button>
          </div>

          {cart.length > 0 && (
            <>
              <ul className="cart-list">
                {cart.map((item, i) => (
                  <li key={i}>
                    <span>{getMedicineName(item.medicine_id)} × {item.quantity}</span>
                    <button className="btn-delete" onClick={() => removeFromCart(i)}>Remove</button>
                  </li>
                ))}
              </ul>
              <button className="btn-primary" onClick={handleCheckout} disabled={checkingOut}>
                {checkingOut ? 'Processing...' : 'Complete Sale'}
              </button>
            </>
          )}

          {message && <p className="success-msg">{message}</p>}
          {error && <p className="error-msg">{error}</p>}
        </div>

        {loading ? (
          <p className="empty-state">Loading sales data...</p>
        ) : sales.length === 0 ? (
          <div className="data-panel">
            <p className="empty-state">No sales recorded yet.</p>
          </div>
        ) : (
          <div className="data-panel">
            <table>
              <thead>
                <tr><th>ID</th><th>Total</th><th>Date</th><th>Receipt</th></tr>
              </thead>
              <tbody>
                {sales.map(sale => (
                  <tr key={sale.id}>
                    <td>#{sale.id}</td>
                    <td>{sale.total_amount}</td>
                    <td>{new Date(sale.sale_date).toLocaleString()}</td>
                    <td><button className="btn-outline" onClick={() => downloadReceipt(sale.id)}>Download</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}