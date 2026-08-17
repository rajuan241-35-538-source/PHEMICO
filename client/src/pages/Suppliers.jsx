import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import '../styles/layout.css';

export default function Suppliers() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', email: '', address: '' });
  const [error, setError] = useState('');

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data);
    } catch {
      setError('Failed to load suppliers');
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/suppliers', form);
      setForm({ name: '', contact_person: '', phone: '', email: '', address: '' });
      fetchSuppliers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add supplier');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      fetchSuppliers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-heading">
          <h2>Suppliers</h2>
          <p>Manage the vendors who keep your shelves stocked.</p>
        </div>

        {user?.role === 'admin' && (
          <div className="form-card">
            <h3>Add New Supplier</h3>
            <form onSubmit={handleAdd} className="form-grid">
              <input name="name" placeholder="Supplier Name" value={form.name} onChange={handleChange} required />
              <input name="contact_person" placeholder="Contact Person" value={form.contact_person} onChange={handleChange} />
              <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} />
              <input name="email" placeholder="Email" value={form.email} onChange={handleChange} />
              <input name="address" placeholder="Address" value={form.address} onChange={handleChange} />
              <button type="submit">Add Supplier</button>
            </form>
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}

        <div className="data-panel">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>Address</th>
                {user?.role === 'admin' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {suppliers.map(sup => (
                <tr key={sup.id}>
                  <td>{sup.name}</td>
                  <td>{sup.contact_person}</td>
                  <td>{sup.phone}</td>
                  <td>{sup.email}</td>
                  <td>{sup.address}</td>
                  {user?.role === 'admin' && (
                    <td><button className="btn-delete" onClick={() => handleDelete(sup.id)}>Delete</button></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}