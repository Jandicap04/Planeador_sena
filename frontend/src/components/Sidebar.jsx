import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  FileText, 
  Search, 
  Users, 
  Settings, 
  LogOut 
} from 'lucide-react';

function Sidebar() {
  const usuarioLogueado = JSON.parse(localStorage.getItem('usuarioLogueado')) || {};

  const esInstructor = usuarioLogueado.rol === 'instructor';
  const esCoordinadorOAdmin = 
    usuarioLogueado.rol === 'Coordinador' || 
    usuarioLogueado.rol === 'administrativo' || 
    usuarioLogueado.rol === 'Admin';

  return (
    <div className="w-72 bg-white border-r border-gray-200 h-full flex flex-col shadow-sm">
      
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-2xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <div>
            <p className="font-bold text-xl text-gray-800">SENA</p>
            <p className="text-xs text-gray-500 -mt-1">Formación Complementaria</p>
          </div>
        </div>
      </div>

      {/* Menú */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          <NavLink to="/dashboard" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'text-gray-600 hover:bg-gray-100'}`}>
            <LayoutDashboard size={22} />
            Panel Principal
          </NavLink>

          {/* SOLO PARA INSTRUCTORES */}
          {esInstructor && (
            <NavLink to="/planeador" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Calendar size={22} />
              Mi Planeador Académico
            </NavLink>
          )}

          {/* CUENTAS DE COBRO - PARA TODOS */}
          <NavLink 
            to="/cuentas-de-cobro" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all 
              ${isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'text-gray-600 hover:bg-gray-100'}`
            }
          >
            <FileText size={22} />
            Cuentas de Cobro
          </NavLink>

          <NavLink to="/modulo-busqueda" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Search size={22} />
            Módulo de Búsqueda
          </NavLink>

          {/* SOLO PARA COORDINADORES Y ADMINISTRATIVOS */}
          {esCoordinadorOAdmin && (
            <NavLink to="/cronogramas-instructores" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Users size={22} />
              Cronogramas de Instructores
            </NavLink>
          )}
        </div>
      </nav>

      {/* Cerrar Sesión */}
      <div className="p-4 border-t border-gray-100 mt-auto">
        <button 
          onClick={() => {
            localStorage.removeItem('usuarioLogueado');
            window.location.href = '/';
          }}
          className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 py-3 rounded-2xl font-medium transition-all"
        >
          <LogOut size={20} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

export default Sidebar;