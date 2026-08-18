import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import '../styles/layout.css';

export default function Medicines() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [form, setForm] = useState({
    name: '', category: '', supplier_id: '', batch_number: '',
    quantity: '', reorder_level: '', unit_price: '', expiry_date: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchMedicines = async () => {
    try {
      const res = await api.get('/medicines');
      setMedicines(res.data);
    } catch {
      setError('Failed to load medicines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMedicines(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      return setError('Medicine name is required');
    }
    if (!form.unit_price || Number(form.unit_price) <= 0) {
      return setError('Unit price must be greater than 0');
    }
    if (form.quantity && Number(form.quantity) < 0) {
      return setError('Quantity cannot be negative');
    }
    if (form.reorder_level && Number(form.reorder_level) < 0) {
      return setError('Reorder level cannot be negative');
    }

    setSubmitting(true);
    try {
      await api.post('/medicines', form);
      setForm({ name: '', category: '', supplier_id: '', batch_number: '', quantity: '', reorder_level: '', unit_price: '', expiry_date: '' });
      fetchMedicines();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add medicine');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this medicine?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/medicines/${id}`);
      fetchMedicines();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-heading">
          <h2>Inventory</h2>
          <p>Track stock levels, pricing, and expiry across every medicine.</p>
        </div>

        {user?.role === 'admin' && (
          <div className="form-card">
            <h3>Add New Medicine</h3>
            <form onSubmit={handleAdd} className="form-grid">
              <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required />
              <input name="category" placeholder="Category" value={form.category} onChange={handleChange} />
              <input name="supplier_id" placeholder="Supplier ID" value={form.supplier_id} onChange={handleChange} />
              <input name="batch_number" placeholder="Batch Number" value={form.batch_number} onChange={handleChange} />
              <input name="quantity" placeholder="Quantity" type="number" min="0" value={form.quantity} onChange={handleChange} />
              <input name="reorder_level" placeholder="Reorder Level" type="number" min="0" value={form.reorder_level} onChange={handleChange} />
              <input name="unit_price" placeholder="Unit Price" type="number" step="0.01" min="0.01" value={form.unit_price} onChange={handleChange} required />
              <input name="expiry_date" type="date" value={form.expiry_date} onChange={handleChange} />
              <button type="submit" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Medicine'}
              </button>
            </form>
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}

        {loading ? (
          <p className="empty-state">Loading inventory...</p>
        ) : medicines.length === 0 ? (
          <div className="data-panel">
            <p className="empty-state">No medicines added yet.</p>
          </div>
        ) : (
          <div className="data-panel">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Category</th><th>Qty</th><th>Reorder Lvl</th><th>Price</th><th>Expiry</th>
                  {user?.role === 'admin' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {medicines.map(med => {
                  const low = med.quantity <= med.reorder_level;
                  return (
                    <tr key={med.id}>
                      <td>{med.name}</td>
                      <td>{med.category}</td>
                      <td className={low ? 'badge-low' : ''}>{med.quantity}</td>
                      <td>{med.reorder_level}</td>
                      <td>{med.unit_price}</td>
                      <td>{med.expiry_date?.split('T')[0]}</td>
                      {user?.role === 'admin' && (
                        <td>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(med.id)}
                            disabled={deletingId === med.id}
                          >
                            {deletingId === med.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}