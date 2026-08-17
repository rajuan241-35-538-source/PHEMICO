import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Medicines from './pages/Medicines';
import Suppliers from './pages/Suppliers';
import Sales from './pages/Sales';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/medicines" element={<Medicines />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/sales" element={<Sales />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;