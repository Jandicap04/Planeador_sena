import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Planeador from './pages/Planeador';
import CronogramasInstructores from './pages/CronogramasInstructores';
import ModuloBusqueda from './pages/ModuloBusqueda';
import CuentasDeCobro from './pages/CuentasDeCobro';   // ← Nueva importación
import Layout from './components/Layout';
import TestSupabase from './pages/TestSupabase';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/planeador" element={<Planeador />} />
        <Route path="/cronogramas-instructores" element={<CronogramasInstructores />} />
        <Route path="/modulo-busqueda" element={<ModuloBusqueda />} />
        <Route path="/cuentas-de-cobro" element={<CuentasDeCobro />} /> 
        <Route path="/test-supabase" element={<TestSupabase />} />
      </Route>

      {/* Redirección por defecto */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
export default App;