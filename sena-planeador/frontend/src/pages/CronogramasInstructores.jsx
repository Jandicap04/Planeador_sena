import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Search, Trash2, User } from 'lucide-react';
import usuarios from '../data/usuarios';

function CronogramasInstructores() {
  const [usuarioLogueado] = useState(JSON.parse(localStorage.getItem('usuarioLogueado')));
  const [busqueda, setBusqueda] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [instructorFiltro, setInstructorFiltro] = useState('');
  const [todosEventos, setTodosEventos] = useState([]);
  const [instructorSeleccionado, setInstructorSeleccionado] = useState(null);

  // Permisos para borrar (Coordinador + Administrativos + David)
  const puedeBorrar = 
    usuarioLogueado?.rol === 'Coordinador' || 
    usuarioLogueado?.rol === 'administrativo' ||
    usuarioLogueado?.nombre?.includes("DAVID SANTIAGO") ||
    usuarioLogueado?.nombre?.includes("David Santiago");

  useEffect(() => {
    let eventosTotales = [];
    usuarios.forEach(user => {
      if (user.rol === 'instructor') {
        const eventos = JSON.parse(localStorage.getItem(`eventos_${user.id}`)) || [];
        eventos.forEach(ev => {
          eventosTotales.push({
            ...ev,
            instructorNombre: user.nombre,
            instructorId: user.id
          });
        });
      }
    });
    setTodosEventos(eventosTotales);
  }, []);

  const eventosFiltrados = todosEventos.filter(ev => {
    const texto = busqueda.toLowerCase();
    return (
      (!texto || 
        ev.instructorNombre?.toLowerCase().includes(texto) ||
        ev.title?.toLowerCase().includes(texto) ||
        ev.extendedProps?.lugar?.toLowerCase().includes(texto) ||
        ev.extendedProps?.ciudad?.toLowerCase().includes(texto)
      ) &&
      (!fechaFiltro || ev.start.startsWith(fechaFiltro)) &&
      (!instructorFiltro || ev.instructorNombre === instructorFiltro)
    );
  });

  const borrarEvento = (instructorId, eventId) => {
    if (!puedeBorrar) return alert("No tienes permiso");
    if (!confirm("¿Eliminar esta programación?")) return;

    const eventos = JSON.parse(localStorage.getItem(`eventos_${instructorId}`)) || [];
    const nuevos = eventos.filter(e => e.id !== eventId);
    localStorage.setItem(`eventos_${instructorId}`, JSON.stringify(nuevos));
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">Cronogramas de Instructores</h1>

      <div className="bg-white p-6 rounded-3xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Buscar</label>
          <input type="text" placeholder="Nombre, lugar, curso..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full px-4 py-3 border rounded-2xl" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Instructor</label>
          <select value={instructorFiltro} onChange={(e) => setInstructorFiltro(e.target.value)} className="w-full px-4 py-3 border rounded-2xl">
            <option value="">Todos los instructores</option>
            {usuarios.filter(u => u.rol === 'instructor').map(u => (
              <option key={u.id} value={u.nombre}>{u.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Fecha</label>
          <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} className="w-full px-4 py-3 border rounded-2xl" />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm divide-y">
        {eventosFiltrados.length === 0 ? (
          <p className="p-12 text-center text-gray-500">No se encontraron programaciones con los filtros.</p>
        ) : (
          eventosFiltrados.map((ev) => (
            <div key={ev.id} className="p-6 hover:bg-gray-50 flex justify-between items-center">
              <div className="flex-1 cursor-pointer" onClick={() => setInstructorSeleccionado(ev)}>
                <h3 className="font-semibold">{ev.instructorNombre}</h3>
                <p className="font-medium">{ev.title}</p>
                <p className="text-sm text-gray-600">
                  {new Date(ev.start).toLocaleDateString('es-ES')} • 
                  {new Date(ev.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - 
                  {new Date(ev.end).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-sm text-gray-500">{ev.extendedProps?.lugar} • {ev.extendedProps?.ciudad}</p>
              </div>

              {puedeBorrar && (
                <button onClick={() => borrarEvento(ev.instructorId, ev.id)} className="text-red-600 p-3 hover:bg-red-50 rounded-xl">
                  <Trash2 size={24} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {instructorSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between bg-gray-50">
              <h2 className="text-2xl font-bold">Cronograma Completo - {instructorSeleccionado.instructorNombre}</h2>
              <button onClick={() => setInstructorSeleccionado(null)} className="text-3xl">✕</button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={todosEventos.filter(ev => ev.instructorId === instructorSeleccionado.instructorId)}
                height="70vh"
                locale="es"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CronogramasInstructores;