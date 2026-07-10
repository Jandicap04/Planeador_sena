import { useNavigate } from 'react-router-dom';
import { Calendar, FileText, Search, Users, ArrowRight } from 'lucide-react';

function Dashboard() {

  const navigate = useNavigate();

  const usuarioString = localStorage.getItem('usuarioLogueado');
  const usuarioLogueado = usuarioString ? JSON.parse(usuarioString) : {};

  const esAdminOCoordinador =
    usuarioLogueado.rol === 'Coordinador' ||
    usuarioLogueado.rol === 'coordinador' ||
    usuarioLogueado.rol === 'administrativo' ||
    usuarioLogueado.rol === 'Admin';

  return (
    <div className="max-w-7xl mx-auto">

      <div className="mb-12">
        <h1 className="text-5xl font-bold text-gray-900">Panel Principal</h1>
        <p className="text-xl text-gray-600 mt-3">
          Coordinación de Formación Complementaria • SENA
        </p>
      </div>

      <div>
        <h2 className="text-3xl font-semibold mb-8">Accesos Rápidos</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* Planeador Académico - Solo Instructores */}
          {!esAdminOCoordinador && (
            <div
              onClick={() => navigate('/planeador')}
              className="bg-white border-2 border-green-500 hover:border-green-600 rounded-3xl p-12 cursor-pointer hover:shadow-2xl transition-all group flex flex-col"
            >
              <div className="mb-8">
                <Calendar size={64} className="text-green-600 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-4xl font-bold text-gray-800 mb-3">Planeador Académico</h3>
              <p className="text-gray-600 text-lg">Gestión de programación, competencias y horarios</p>
              <div className="mt-auto pt-8">
                <ArrowRight className="text-green-600 group-hover:translate-x-3 transition-transform" size={32} />
              </div>
            </div>
          )}

          {/* Cuentas de Cobro - Ahora Funcional */}
          <div
            onClick={() => navigate('/cuentas-de-cobro')}
            className="bg-white border-2 border-amber-500 hover:border-amber-600 rounded-3xl p-12 cursor-pointer hover:shadow-2xl transition-all group flex flex-col"
          >
            <div className="mb-8">
              <FileText size={64} className="text-amber-600 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-4xl font-bold text-gray-800 mb-3">Evidencias cuentas de Cobro</h3>
            <p className="text-gray-600 text-lg">Cargue de documentos y gestión de pagos</p>
            <div className="mt-auto pt-8">
              <ArrowRight className="text-amber-600 group-hover:translate-x-3 transition-transform" size={32} />
            </div>
          </div>

          {/* Módulo de Búsqueda */}
          <div
            onClick={() => navigate('/modulo-busqueda')}
            className="bg-white border-2 border-violet-500 hover:border-violet-600 rounded-3xl p-12 cursor-pointer hover:shadow-2xl transition-all group flex flex-col"
          >
            <div className="mb-8">
              <Search size={64} className="text-violet-600 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-4xl font-bold text-gray-800 mb-3">Módulo de Búsqueda</h3>
            <p className="text-gray-600 text-lg">
              {esAdminOCoordinador ? 'Carga y gestión masiva de reportes' : 'Consulta de fichas, estados y alertas'}
            </p>
            <div className="mt-auto pt-8">
              <ArrowRight className="text-violet-600 group-hover:translate-x-3 transition-transform" size={32} />
            </div>
          </div>

          {/* Cronogramas de Instructores - Solo Admin / Coordinador */}
          {esAdminOCoordinador && (
            <div
              onClick={() => navigate('/cronogramas-instructores')}
              className="bg-white border-2 border-purple-500 hover:border-purple-600 rounded-3xl p-12 cursor-pointer hover:shadow-2xl transition-all group flex flex-col"
            >
              <div className="mb-8">
                <Users size={64} className="text-purple-600 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-4xl font-bold text-gray-800 mb-3">Cronogramas de Instructores</h3>
              <p className="text-gray-600 text-lg">Ver y gestionar programaciones de todos los instructores</p>
              <div className="mt-auto pt-8">
                <ArrowRight className="text-purple-600 group-hover:translate-x-3 transition-transform" size={32} />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Dashboard;