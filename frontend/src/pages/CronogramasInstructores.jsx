import { useState, useEffect, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Trash2, MailWarning, CalendarSync } from 'lucide-react';
import usuarios from '../data/usuarios';
import { enviarAlertaConflictoAmbiente } from '../lib/alertasService';

function CronogramasInstructores() {
  const [usuarioLogueado] = useState(JSON.parse(localStorage.getItem('usuarioLogueado')));
  const [busqueda, setBusqueda] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [instructorFiltro, setInstructorFiltro] = useState('');
  const [todosEventos, setTodosEventos] = useState([]);
  const [instructorSeleccionado, setInstructorSeleccionado] = useState(null);
  const [filtroFranjaSesion, setFiltroFranjaSesion] = useState('todas');
  const [conflictosPorEvento, setConflictosPorEvento] = useState({});
  const [notificacion, setNotificacion] = useState({ visible: false, tipo: 'info', mensaje: '' });

  const puedeBorrar = 
    usuarioLogueado?.rol === 'Coordinador' || 
    usuarioLogueado?.rol === 'administrativo' ||
    usuarioLogueado?.nombre?.includes("DAVID SANTIAGO") ||
    usuarioLogueado?.nombre?.includes("David Santiago");

  const claveEvento = (evento) => `${evento.instructorId}-${evento.id}`;

  const extraerFecha = (fechaIso) => String(fechaIso || '').split('T')[0];

  const formatearHora = (fechaIso) => {
    const fecha = new Date(fechaIso);
    if (Number.isNaN(fecha.getTime())) return '--';
    return fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const cargarEventos = () => {
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
    return eventosTotales;
  };

  const calcularConflictosAmbiente = (eventos) => {
    const conflictos = {};

    for (let i = 0; i < eventos.length; i += 1) {
      const a = eventos[i];
      const propsA = a.extendedProps || {};

      if (propsA.tipoFormacion !== 'Titulada' || !propsA.ambiente) {
        continue;
      }

      for (let j = i + 1; j < eventos.length; j += 1) {
        const b = eventos[j];
        const propsB = b.extendedProps || {};

        if (propsB.tipoFormacion !== 'Titulada' || !propsB.ambiente) {
          continue;
        }

        const mismoAmbiente = String(propsA.ambiente).trim().toLowerCase() === String(propsB.ambiente).trim().toLowerCase();
        if (!mismoAmbiente) {
          continue;
        }

        const mismaFecha = extraerFecha(a.start) === extraerFecha(b.start);
        if (!mismaFecha) {
          continue;
        }

        const inicioA = new Date(a.start);
        const finA = new Date(a.end);
        const inicioB = new Date(b.start);
        const finB = new Date(b.end);
        const seCruzan = inicioA < finB && inicioB < finA;

        if (!seCruzan) {
          continue;
        }

        const detalleA = {
          ...b,
          conflicto: {
            fecha: extraerFecha(a.start),
            ambiente: propsA.ambiente,
            lugar: propsA.lugar || propsB.lugar || '',
            horaInicio: formatearHora(a.start),
            horaFin: formatearHora(a.end),
          },
        };

        const detalleB = {
          ...a,
          conflicto: {
            fecha: extraerFecha(b.start),
            ambiente: propsB.ambiente,
            lugar: propsB.lugar || propsA.lugar || '',
            horaInicio: formatearHora(b.start),
            horaFin: formatearHora(b.end),
          },
        };

        const keyA = claveEvento(a);
        const keyB = claveEvento(b);

        conflictos[keyA] = [...(conflictos[keyA] || []), detalleA];
        conflictos[keyB] = [...(conflictos[keyB] || []), detalleB];
      }
    }

    setConflictosPorEvento(conflictos);
  };

  useEffect(() => {
    const eventos = cargarEventos();
    calcularConflictosAmbiente(eventos);
  }, []);

  useEffect(() => {
    if (!notificacion.visible) return;

    const timeoutId = setTimeout(() => {
      setNotificacion((prev) => ({ ...prev, visible: false }));
    }, 4500);

    return () => clearTimeout(timeoutId);
  }, [notificacion.visible]);

  // Función para mostrar ubicación según el tipo (Titulada o Complementaria)
  const getUbicacionDisplay = (ev) => {
    const props = ev.extendedProps || {};
    const lugar = props.lugar || '';
    const direccion = props.direccion ? ` - ${props.direccion}` : '';

    if (props.tipoFormacion === 'Titulada') {
      const ambiente = props.ambiente ? ` | Ambiente: ${props.ambiente}` : '';
      return `${lugar}${direccion}${ambiente}`.trim();
    } else {
      const ciudad = props.ciudad || '';
      const municipio = props.municipio ? ` - ${props.municipio}` : '';
      const extra = `${ciudad}${municipio}`.trim();
      return `${lugar}${direccion}${extra ? ' | ' + extra : ''}`.trim();
    }
  };

  // Render de eventos en el calendario (muestra el lugar)
  const renderEventContent = (eventInfo) => {
    const props = eventInfo.event.extendedProps || {};
    const isTitulada = props.tipoFormacion === 'Titulada';

    const lugarInfo = [props.lugar, props.direccion].filter(Boolean).join(' - ');
    
    let ubicacionExtra = '';
    if (isTitulada) {
      ubicacionExtra = props.ambiente ? `Ambiente: ${props.ambiente}` : '';
    } else {
      ubicacionExtra = [props.ciudad, props.municipio].filter(Boolean).join(' - ');
    }

    return (
      <div className="p-1 text-xs overflow-hidden">
        <div className="font-semibold leading-tight">
          {eventInfo.event.title}
        </div>
        {lugarInfo && (
          <div className="text-emerald-700 text-[10px] leading-tight mt-0.5">
            📍 {lugarInfo}
          </div>
        )}
        {ubicacionExtra && (
          <div className="text-gray-600 text-[10px] leading-tight">
            {isTitulada ? '🏫' : '📌'} {ubicacionExtra}
          </div>
        )}
      </div>
    );
  };

  const eventosFiltrados = todosEventos.filter(ev => {
    const texto = busqueda.toLowerCase();
    return (
      (!texto || 
        ev.instructorNombre?.toLowerCase().includes(texto) ||
        ev.title?.toLowerCase().includes(texto) ||
        ev.extendedProps?.lugar?.toLowerCase().includes(texto) ||
        ev.extendedProps?.ciudad?.toLowerCase().includes(texto) ||
        ev.extendedProps?.ambiente?.toLowerCase().includes(texto)
      ) &&
      (!fechaFiltro || ev.start.startsWith(fechaFiltro)) &&
      (!instructorFiltro || ev.instructorNombre === instructorFiltro)
    );
  });

  const docentesRecientes = useMemo(() => {
    const resumen = (usuarios || [])
      .filter((u) => u.rol === 'instructor')
      .map((instructor) => {
        const eventosInstructor = todosEventos
          .filter((ev) => String(ev.instructorId) === String(instructor.id))
          .sort((a, b) => new Date(b.start) - new Date(a.start));

        const ultimoEvento = eventosInstructor[0] || null;
        const conflictos = eventosInstructor.reduce((acc, ev) => {
          const key = claveEvento(ev);
          return acc + ((conflictosPorEvento[key] || []).length > 0 ? 1 : 0);
        }, 0);

        return {
          instructor,
          totalEventos: eventosInstructor.length,
          ultimoEvento,
          conflictos,
        };
      })
      .filter((item) => item.totalEventos > 0)
      .sort((a, b) => new Date(b.ultimoEvento.start) - new Date(a.ultimoEvento.start));

    return resumen;
  }, [todosEventos, conflictosPorEvento]);

  const abrirCalendarioInstructor = (instructorId, instructorNombre) => {
    setFiltroFranjaSesion('todas');
    setInstructorSeleccionado({
      instructorId,
      instructorNombre,
    });
  };

  const obtenerFranja = (fechaIso) => {
    const fecha = new Date(fechaIso);
    if (Number.isNaN(fecha.getTime())) return 'otra';

    const hora = fecha.getHours();
    if (hora >= 6 && hora < 12) return 'manana';
    if (hora >= 12 && hora < 18) return 'tarde';
    if (hora >= 18 && hora <= 23) return 'noche';
    return 'otra';
  };

  const sesionesInstructorSeleccionado = useMemo(() => {
    if (!instructorSeleccionado?.instructorId) return [];

    return todosEventos
      .filter((ev) => String(ev.instructorId) === String(instructorSeleccionado.instructorId))
      .sort((a, b) => new Date(b.start) - new Date(a.start));
  }, [todosEventos, instructorSeleccionado]);

  const sesionesFiltradasPorFranja = useMemo(() => {
    if (filtroFranjaSesion === 'todas') {
      return sesionesInstructorSeleccionado;
    }

    return sesionesInstructorSeleccionado.filter(
      (sesion) => obtenerFranja(sesion.start) === filtroFranjaSesion
    );
  }, [sesionesInstructorSeleccionado, filtroFranjaSesion]);

  const cancelarDesdeCalendario = (clickInfo) => {
    if (!instructorSeleccionado?.instructorId) return;
    borrarEvento(instructorSeleccionado.instructorId, clickInfo.event.id);
  };

  const borrarEvento = (instructorId, eventId) => {
    if (!puedeBorrar) return alert("No tienes permiso");
    if (!confirm("¿Eliminar esta programación?")) return;

    const eventos = JSON.parse(localStorage.getItem(`eventos_${instructorId}`)) || [];
    const nuevos = eventos.filter(e => String(e.id) !== String(eventId));
    localStorage.setItem(`eventos_${instructorId}`, JSON.stringify(nuevos));

    const eventosActualizados = cargarEventos();
    calcularConflictosAmbiente(eventosActualizados);
  };

  const reprogramarEvento = (evento) => {
    if (!puedeBorrar) return alert('No tienes permiso');

    const fechaActual = extraerFecha(evento.start);
    const horaInicioActual = formatearHora(evento.start);
    const horaFinActual = formatearHora(evento.end);

    const nuevaFecha = prompt('Nueva fecha (YYYY-MM-DD)', fechaActual);
    if (!nuevaFecha) return;

    const nuevaHoraInicio = prompt('Nueva hora inicio (HH:MM)', horaInicioActual);
    if (!nuevaHoraInicio) return;

    const nuevaHoraFin = prompt('Nueva hora fin (HH:MM)', horaFinActual);
    if (!nuevaHoraFin) return;

    const nuevoInicio = new Date(`${nuevaFecha}T${nuevaHoraInicio}`);
    const nuevoFin = new Date(`${nuevaFecha}T${nuevaHoraFin}`);

    if (Number.isNaN(nuevoInicio.getTime()) || Number.isNaN(nuevoFin.getTime()) || nuevoFin <= nuevoInicio) {
      setNotificacion({
        visible: true,
        tipo: 'error',
        mensaje: 'Horario invalido. Verifica fecha y horas de reprogramacion.',
      });
      return;
    }

    const eventos = JSON.parse(localStorage.getItem(`eventos_${evento.instructorId}`)) || [];
    const nuevos = eventos.map((item) =>
      String(item.id) === String(evento.id)
        ? {
            ...item,
            start: nuevoInicio.toISOString(),
            end: nuevoFin.toISOString(),
          }
        : item
    );

    localStorage.setItem(`eventos_${evento.instructorId}`, JSON.stringify(nuevos));

    const eventosActualizados = cargarEventos();
    calcularConflictosAmbiente(eventosActualizados);
    setNotificacion({
      visible: true,
      tipo: 'success',
      mensaje: `Programacion reprogramada para ${evento.instructorNombre}.`,
    });
  };

  const notificarConflicto = async (evento) => {
    const conflictos = conflictosPorEvento[claveEvento(evento)] || [];
    const conflictoPrincipal = conflictos[0]?.conflicto;

    if (!conflictoPrincipal) {
      setNotificacion({
        visible: true,
        tipo: 'warning',
        mensaje: 'No hay conflicto activo para este evento.',
      });
      return;
    }

    const instructor = usuarios.find((u) => String(u.id) === String(evento.instructorId));
    const correo = instructor?.email || '';

    if (!correo) {
      setNotificacion({
        visible: true,
        tipo: 'warning',
        mensaje: `No se encontro correo para ${evento.instructorNombre}.`,
      });
      return;
    }

    try {
      const resultado = await enviarAlertaConflictoAmbiente({
        instructor: {
          nombreCompleto: evento.instructorNombre,
          correoElectronico: correo,
        },
        conflicto: conflictoPrincipal,
        asunto:
          'Ambiente ocupado: por favor reprograme su nuevo horario',
      });

      if (resultado?.skipped) {
        setNotificacion({
          visible: true,
          tipo: 'warning',
          mensaje: 'No se envio correo: falta VITE_ALERTAS_API_BASE_URL en frontend/.env.',
        });
      } else {
        setNotificacion({
          visible: true,
          tipo: 'success',
          mensaje: `Correo enviado a ${correo}${resultado?.messageId ? ` (id: ${resultado.messageId})` : ''}.`,
        });
      }
    } catch (error) {
      setNotificacion({
        visible: true,
        tipo: 'error',
        mensaje: `No se pudo enviar correo: ${error.message}`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {notificacion.visible && (
        <div className="fixed top-5 right-5 z-50 max-w-md">
          <div
            className={`rounded-2xl border px-4 py-3 shadow-lg text-sm ${
              notificacion.tipo === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : notificacion.tipo === 'error'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-800'
            }`}
          >
            {notificacion.mensaje}
          </div>
        </div>
      )}

      <h1 className="text-4xl font-bold">Cronogramas de Instructores</h1>

      <div className="bg-white rounded-3xl shadow-sm p-6">
        <h2 className="text-2xl font-semibold mb-4">Instructores Recientes</h2>
        {docentesRecientes.length === 0 ? (
          <p className="text-gray-500">Aun no hay programaciones registradas.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {docentesRecientes.slice(0, 9).map((item) => (
              <button
                key={item.instructor.id}
                type="button"
                onClick={() => abrirCalendarioInstructor(item.instructor.id, item.instructor.nombre)}
                className="text-left border rounded-2xl p-4 hover:bg-gray-50 transition-colors"
              >
                <p className="font-semibold text-gray-900">{item.instructor.nombre}</p>
                <p className="text-sm text-gray-600 mt-1">Programaciones: {item.totalEventos}</p>
                <p className="text-sm text-gray-600">Ultima: {new Date(item.ultimoEvento.start).toLocaleDateString('es-ES')}</p>
                {item.conflictos > 0 && (
                  <p className="text-xs font-semibold text-red-600 mt-1">
                    Conflictos detectados: {item.conflictos}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FILTROS */}
      <div className="bg-white p-6 rounded-3xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Buscar</label>
          <input 
            type="text" 
            placeholder="Nombre, lugar, curso..." 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
            className="w-full px-4 py-3 border rounded-2xl" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Instructor</label>
          <select 
            value={instructorFiltro} 
            onChange={(e) => setInstructorFiltro(e.target.value)} 
            className="w-full px-4 py-3 border rounded-2xl"
          >
            <option value="">Todos los instructores</option>
            {usuarios.filter(u => u.rol === 'instructor').map(u => (
              <option key={u.id} value={u.nombre}>{u.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Fecha</label>
          <input 
            type="date" 
            value={fechaFiltro} 
            onChange={(e) => setFechaFiltro(e.target.value)} 
            className="w-full px-4 py-3 border rounded-2xl" 
          />
        </div>
      </div>

      {/* LISTA */}
      <div className="bg-white rounded-3xl shadow-sm divide-y">
        {eventosFiltrados.length === 0 ? (
          <p className="p-12 text-center text-gray-500">No se encontraron programaciones con los filtros.</p>
        ) : (
          eventosFiltrados.map((ev) => (
            <div key={claveEvento(ev)} className="p-6 hover:bg-gray-50 flex justify-between items-center">
              <div className="flex-1 cursor-pointer" onClick={() => abrirCalendarioInstructor(ev.instructorId, ev.instructorNombre)}>
                <h3 className="font-semibold">{ev.instructorNombre}</h3>
                <p className="font-medium">{ev.title}</p>

                {(conflictosPorEvento[claveEvento(ev)] || []).length > 0 && (
                  <p className="text-xs mt-1 font-semibold text-red-600">
                    Conflicto de ambiente detectado ({(conflictosPorEvento[claveEvento(ev)] || []).length})
                  </p>
                )}
                
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(ev.start).toLocaleDateString('es-ES')} • 
                  {new Date(ev.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - 
                  {new Date(ev.end).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>

                <p className="text-sm text-emerald-700 mt-1 font-medium">
                  {getUbicacionDisplay(ev)}
                </p>
              </div>

              {puedeBorrar && (
                <div className="flex items-center gap-2">
                  {(conflictosPorEvento[claveEvento(ev)] || []).length > 0 && (
                    <button
                      onClick={() => notificarConflicto(ev)}
                      className="text-amber-700 p-3 hover:bg-amber-50 rounded-xl"
                      title="Notificar conflicto por correo"
                    >
                      <MailWarning size={22} />
                    </button>
                  )}

                  <button
                    onClick={() => reprogramarEvento(ev)}
                    className="text-blue-700 p-3 hover:bg-blue-50 rounded-xl"
                    title="Reprogramar horario"
                  >
                    <CalendarSync size={22} />
                  </button>

                  <button onClick={() => borrarEvento(ev.instructorId, ev.id)} className="text-red-600 p-3 hover:bg-red-50 rounded-xl">
                    <Trash2 size={24} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* MODAL */}
      {instructorSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between bg-gray-50">
              <h2 className="text-2xl font-bold">
                Cronograma Completo - {instructorSeleccionado.instructorNombre}
              </h2>
              <button onClick={() => setInstructorSeleccionado(null)} className="text-3xl hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <div className="mb-4 bg-gray-50 border rounded-2xl p-4">
                <h3 className="text-lg font-semibold mb-3">Sesiones del Instructor</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setFiltroFranjaSesion('todas')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                      filtroFranjaSesion === 'todas'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroFranjaSesion('manana')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                      filtroFranjaSesion === 'manana'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Manana
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroFranjaSesion('tarde')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                      filtroFranjaSesion === 'tarde'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Tarde
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroFranjaSesion('noche')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                      filtroFranjaSesion === 'noche'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    Noche
                  </button>
                </div>

                {sesionesFiltradasPorFranja.length === 0 ? (
                  <p className="text-sm text-gray-500">Este instructor no tiene sesiones registradas.</p>
                ) : (
                  <div className="max-h-56 overflow-auto space-y-2">
                    {sesionesFiltradasPorFranja.slice(0, 30).map((sesion) => (
                      <div key={claveEvento(sesion)} className="bg-white border rounded-xl px-3 py-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{sesion.title}</p>
                          <p className="text-xs text-gray-600">
                            {new Date(sesion.start).toLocaleDateString('es-ES')} • {formatearHora(sesion.start)} - {formatearHora(sesion.end)}
                          </p>
                          <p className="text-xs text-gray-500">{getUbicacionDisplay(sesion)}</p>
                        </div>
                        {puedeBorrar && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => reprogramarEvento(sesion)}
                              className="text-blue-700 p-2 hover:bg-blue-50 rounded-lg"
                              title="Reprogramar sesion"
                            >
                              <CalendarSync size={18} />
                            </button>
                            <button
                              onClick={() => borrarEvento(sesion.instructorId, sesion.id)}
                              className="text-red-600 p-2 hover:bg-red-50 rounded-lg"
                              title="Cancelar sesion"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={todosEventos.filter(ev => ev.instructorId === instructorSeleccionado.instructorId)}
                height="70vh"
                locale="es"
                eventClick={cancelarDesdeCalendario}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                eventContent={renderEventContent}
                // Muestra el lugar (Ambiente o Ciudad/Municipio) dentro de cada evento
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CronogramasInstructores;