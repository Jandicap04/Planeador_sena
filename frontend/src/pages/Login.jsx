import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import usuarios from '../data/usuarios';
import { supabase, isSupabaseConfigured, supabaseConfigErrorMessage } from '../lib/supabase';

function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    usuario: '',
    password: ''
  });

  const normalizar = (valor) => String(valor || '').trim().toLowerCase();

  const buscarUsuarioLocal = (identificador) => {
    const termino = normalizar(identificador);

    return usuarios.find((u) => {
      const usuario = normalizar(u.usuario);
      const nombre = normalizar(u.nombre);
      const correo = normalizar(u.email);

      return usuario === termino || nombre === termino || correo === termino;
    });
  };

  const resolverInstructorDesdeSupabase = async (identificador) => {
    if (!isSupabaseConfigured) {
      return null;
    }

    const termino = normalizar(identificador);

    const { data: dataRpc, error: errorRpc } = await supabase.rpc('buscar_instructor_acceso', {
      termino
    });

    if (!errorRpc && Array.isArray(dataRpc) && dataRpc.length > 0) {
      return dataRpc[0];
    }

    const { data, error } = await supabase
      .from('instructores')
      .select('nombre_completo, usuario, correo_electronico, activo')
      .eq('activo', true)
      .or(`usuario.ilike.%${termino}%,nombre_completo.ilike.%${termino}%,correo_electronico.ilike.%${termino}%`)
      .limit(5);

    if (error) {
      return null;
    }

    return (data || [])[0] || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const usuarioEncontrado = buscarUsuarioLocal(formData.usuario);

    if (usuarioEncontrado && usuarioEncontrado.password === formData.password) {
      localStorage.setItem('usuarioLogueado', JSON.stringify(usuarioEncontrado));
      setTimeout(() => {
        navigate('/dashboard');
      }, 300);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setError(supabaseConfigErrorMessage);
      setLoading(false);
      return;
    }

    const instructorSupabase = await resolverInstructorDesdeSupabase(formData.usuario);

    if (instructorSupabase) {
      const usuarioRelacionado = buscarUsuarioLocal(instructorSupabase.usuario) || buscarUsuarioLocal(instructorSupabase.nombre_completo);

      if (usuarioRelacionado && usuarioRelacionado.password === formData.password) {
        const usuarioFinal = {
          ...usuarioRelacionado,
          nombre: usuarioRelacionado.nombre || instructorSupabase.nombre_completo,
          email: usuarioRelacionado.email || instructorSupabase.correo_electronico,
        };

        localStorage.setItem('usuarioLogueado', JSON.stringify(usuarioFinal));
        setTimeout(() => {
          navigate('/dashboard');
        }, 300);
      } else {
        setError('Usuario, correo o contraseña incorrectos');
      }
    } else {
      setError('Usuario, correo o contraseña incorrectos');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-10 text-white text-center">
          <div className="mx-auto w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-5">
            <span className="text-5xl font-bold">S</span>
          </div>
          <h1 className="text-3xl font-bold">COORDINACIÓN DE FORMACIÓN COMPLEMENTARIA</h1>
          <p className="mt-2 opacity-90">SENA Planeador Académico</p>
        </div>

        <div className="p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 mb-2 font-medium">Usuario</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 text-gray-400" size={20} />
                <input
                  type="text"
                  name="usuario"
                  value={formData.usuario}
                  onChange={(e) => setFormData({...formData, usuario: e.target.value})}
                  className="w-full pl-11 pr-4 py-4 border border-gray-300 rounded-2xl"
                  placeholder="Usuario, nombre o correo"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-medium">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-gray-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full pl-11 pr-12 py-4 border border-gray-300 rounded-2xl"
                  placeholder="Contraseña"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-gray-400">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-600 text-center font-medium">{error}</p>}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-2xl text-white font-semibold text-lg transition-all disabled:opacity-70"
            >
              {loading ? "Ingresando..." : "Ingresar al Sistema"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;