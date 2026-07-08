import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage     from './pages/HomePage';
import CustomerPage from './pages/CustomerPage';
import StaffPage    from './pages/StaffPage';
import AdminPage    from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<HomePage />} />
        <Route path="/customer" element={<CustomerPage />} />
        <Route path="/staff"          element={<StaffPage />} />
        <Route path="/staff/:token"    element={<StaffPage />} />
        <Route path="/admin"          element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}
