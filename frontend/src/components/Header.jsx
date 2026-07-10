import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Header() {

  const navigate = useNavigate();

  // OBTENER USUARIO LOGUEADO
  const usuario =
    JSON.parse(
      localStorage.getItem('usuarioLogueado')
    );

  return (

    <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm">

      {/* LOGO */}
      <div className="flex items-center gap-4">

        <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">

          <span className="text-white font-bold text-xl">
            S
          </span>

        </div>

        <div>

          <h1 className="text-xl font-bold text-gray-800 tracking-tight">

            COORDINACIÓN DE FORMACIÓN COMPLEMENTARIA

          </h1>

          <p className="text-xs text-gray-500 -mt-1">

            SENA - Planeador Académico

          </p>

        </div>

      </div>

      {/* USUARIO */}
      <div className="flex items-center gap-6">

        <div className="flex items-center gap-3">

          <div className="text-right">

            <p className="text-sm font-medium text-gray-700">

              {usuario?.nombre || 'Usuario'}

            </p>

            <p className="text-xs text-gray-500 capitalize">

              {usuario?.rol || 'Sin Rol'}

            </p>

          </div>

          <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">

            <User size={20} />

          </div>

        </div>

      </div>

    </header>

  );

}

export default Header;