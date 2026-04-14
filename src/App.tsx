import { Outlet } from 'react-router-dom';
import Nav from './components/layout/Nav';
import Footer from './components/layout/Footer';

export default function App() {
  return (
    <div className="bg-[#050505] text-[#E0E0E0] font-sans antialiased selection:bg-white selection:text-black overflow-x-hidden min-h-screen">
      <Nav />
      <Outlet />
      <Footer />
    </div>
  );
}
