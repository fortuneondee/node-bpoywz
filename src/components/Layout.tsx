import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';

export default function Layout() {
  const { user } = useAuth();

  return (
    <div>
      {user && <Navbar />}
      <Outlet />
    </div>
  );
}