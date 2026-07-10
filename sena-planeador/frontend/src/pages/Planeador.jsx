import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useState, useEffect } from 'react';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import {
  Plus,
  Download
} from 'lucide-react';

function Planeador() {

  const [usuario] = useState(
    JSON.parse(localStorage.getItem('usuarioLogueado'))
  );

  // HISTORIAL
  const [eventosHistorial, setEventosHistorial] = useState([]);

  // EVENTOS TEMPORALES
  const [eventosPlaneador, setEventosPlaneador] = useState([]);

  // CONTROL DESCARGA
  const [excelDescargado, setExcelDescargado] = useState(false);

  const [nuevoEvento, setNuevoEvento] = useState({
    programa: '',
    title: '',
    ciudad: '',
    municipio: '',
    lugar: '',
    direccion: '',
    horasPrograma: '',
    startTime: '08:00',
    endTime: '10:00',
  });

  // CARGAR HISTORIAL
  useEffect(() => {

    if (usuario) {

      const guardados =
        JSON.parse(
          localStorage.getItem(`eventos_${usuario.id}`)
        ) || [];

      setEventosHistorial(guardados);

    }

  }, [usuario]);

  // INPUTS
  const handleChange = (e) => {

    if (excelDescargado) {

      alert(
        '❌ Ya descargaste el Excel. Ahora debes agregar al cronograma.'
      );

      return;

    }

    // BLOQUEAR NEGATIVOS
    if (
      e.target.name === 'horasPrograma'
    ) {

      const valor =
        Number(e.target.value);

      if (valor < 0) {

        alert(
          '❌ No puedes ingresar números negativos'
        );

        return;

      }

    }

    setNuevoEvento({
      ...nuevoEvento,
      [e.target.name]: e.target.value
    });

  };

  // CALCULAR HORAS
  const calcularHorasTotales = () => {

    let total = 0;

    eventosPlaneador.forEach((evento) => {

      const inicio =
        new Date(evento.start);

      const fin =
        new Date(evento.end);

      total +=
        (fin - inicio) / (1000 * 60 * 60);

    });

    return total;

  };

  // VALIDAR CRUCES
  const hayCruceHorario = (
    fecha,
    inicio,
    fin
  ) => {

    return eventosHistorial.some((evento) => {

      const fechaEvento =
        new Date(evento.start)
          .toISOString()
          .split('T')[0];

      if (fechaEvento !== fecha)
        return false;

      const inicioExistente =
        new Date(evento.start);

      const finExistente =
        new Date(evento.end);

      return (
        inicio < finExistente &&
        fin > inicioExistente
      );

    });

  };

  // ELIMINAR EVENTO
  const handleEliminarEvento = (info) => {

    if (excelDescargado) {

      alert(
        '❌ No puedes eliminar eventos después de descargar el Excel'
      );

      return;

    }

    const confirmar = window.confirm(
      '¿Deseas eliminar esta programación?'
    );

    if (!confirmar) return;

    const idEvento = String(info.event.id);

    const eventosActualizados =
      eventosPlaneador.filter(
        evento => String(evento.id) !== idEvento
      );

    setEventosPlaneador(eventosActualizados);

  };

  // SELECCIONAR EN CALENDARIO
  const handleSelect = (info) => {

    if (excelDescargado) {

      alert(
        '❌ Ya descargaste el Excel. Ahora debes agregar al cronograma.'
      );

      return;

    }

    // VALIDAR FORMULARIO
    if (
      !nuevoEvento.programa ||
      !nuevoEvento.title ||
      !nuevoEvento.lugar ||
      !nuevoEvento.ciudad ||
      !nuevoEvento.direccion ||
      !nuevoEvento.horasPrograma
    ) {

      alert(
        '❌ Primero completa el formulario'
      );

      return;

    }

    const fecha =
      info.startStr.split('T')[0];

    const hoy = new Date();

    hoy.setHours(0,0,0,0);

    const fechaSeleccionada =
      new Date(fecha);

    // BLOQUEAR FECHAS PASADAS
    if (fechaSeleccionada < hoy) {

      alert(
        '❌ No puedes seleccionar fechas anteriores'
      );

      return;

    }

    let nuevoEventoTemp;

    // =========================
    // MODO MES
    // =========================
    if (info.allDay) {

      const inicio =
        new Date(`${fecha}T${nuevoEvento.startTime}`);

      const fin =
        new Date(`${fecha}T${nuevoEvento.endTime}`);

      // VALIDAR CRUCE
      if (
        hayCruceHorario(
          fecha,
          inicio,
          fin
        )
      ) {

        alert(
          `❌ Ya tienes programación en ese horario`
        );

        return;

      }

      nuevoEventoTemp = {

        id:
          Date.now() + Math.random(),

        title:
          `${nuevoEvento.programa} - ${nuevoEvento.title}`,

        start:
          `${fecha}T${nuevoEvento.startTime}`,

        end:
          `${fecha}T${nuevoEvento.endTime}`,

        backgroundColor: '#D9F99D',

        borderColor: '#65A30D',

        textColor: '#000',

        extendedProps: {
          programa: nuevoEvento.programa,
          ciudad: nuevoEvento.ciudad,
          municipio: nuevoEvento.municipio,
          lugar: nuevoEvento.lugar,
          direccion: nuevoEvento.direccion,
          horasPrograma:
            nuevoEvento.horasPrograma,
        }

      };

    } else {

      // =========================
      // WEEK / DAY
      // =========================

      const inicio =
        new Date(info.start);

      const fin =
        new Date(info.end);

      // VALIDAR CRUCE
      if (
        hayCruceHorario(
          fecha,
          inicio,
          fin
        )
      ) {

        alert(
          `❌ Ya tienes programación en ese horario`
        );

        return;

      }

      nuevoEventoTemp = {

        id:
          Date.now() + Math.random(),

        title:
          `${nuevoEvento.programa} - ${nuevoEvento.title}`,

        start:
          info.start,

        end:
          info.end,

        backgroundColor: '#D9F99D',

        borderColor: '#65A30D',

        textColor: '#000',

        extendedProps: {
          programa: nuevoEvento.programa,
          ciudad: nuevoEvento.ciudad,
          municipio: nuevoEvento.municipio,
          lugar: nuevoEvento.lugar,
          direccion: nuevoEvento.direccion,
          horasPrograma:
            nuevoEvento.horasPrograma,
        }

      };

    }

    // VALIDAR HORAS
    const horasActuales =
      calcularHorasTotales();

    const horasNuevoEvento =
      (
        new Date(nuevoEventoTemp.end)
        -
        new Date(nuevoEventoTemp.start)
      ) / (1000 * 60 * 60);

    const totalNuevo =
      horasActuales + horasNuevoEvento;

    if (
      totalNuevo >
      Number(nuevoEvento.horasPrograma)
    ) {

      alert(
        `❌ Superas las ${nuevoEvento.horasPrograma} horas del programa`
      );

      return;

    }

    setEventosPlaneador([
      ...eventosPlaneador,
      nuevoEventoTemp
    ]);

  };

  // AGREGAR AL HISTORIAL
  const agregarEvento = () => {

    if (!excelDescargado) {

      alert(
        '❌ Primero debes descargar el Excel'
      );

      return;

    }

    const horasProgramadas =
      calcularHorasTotales();

    const horasPrograma =
      Number(nuevoEvento.horasPrograma);

    if (
      horasProgramadas !== horasPrograma
    ) {

      alert(
        `❌ Debes completar exactamente ${horasPrograma} horas`
      );

      return;

    }

    const historialActualizado = [
      ...eventosHistorial,
      ...eventosPlaneador
    ];

    setEventosHistorial(
      historialActualizado
    );

    localStorage.setItem(
      `eventos_${usuario.id}`,
      JSON.stringify(historialActualizado)
    );

    // LIMPIAR
    setEventosPlaneador([]);

    setExcelDescargado(false);

    setNuevoEvento({
      programa: '',
      title: '',
      ciudad: '',
      municipio: '',
      lugar: '',
      direccion: '',
      horasPrograma: '',
      startTime: '08:00',
      endTime: '10:00',
    });

    alert(
      '✅ Programación agregada correctamente'
    );

  };

  // DESCARGAR EXCEL
  const descargarExcel = () => {

    if (eventosPlaneador.length === 0) {

      alert(
        '❌ No hay programación para descargar'
      );

      return;

    }

    const horasProgramadas =
      calcularHorasTotales();

    const horasPrograma =
      Number(nuevoEvento.horasPrograma);

    if (
      horasProgramadas !== horasPrograma
    ) {

      alert(
        `❌ Debes completar exactamente ${horasPrograma} horas`
      );

      return;

    }

    const datosExcel =
      eventosPlaneador.map((evento) => {

        const fechaEvento =
          new Date(evento.start)
            .toISOString()
            .split('T')[0];

        const fechaObj =
          new Date(fechaEvento + 'T00:00:00');

        const diasSemana = [
          'Domingo',
          'Lunes',
          'Martes',
          'Miércoles',
          'Jueves',
          'Viernes',
          'Sábado'
        ];

        const diaSemana =
          diasSemana[fechaObj.getDay()];

        return {

          Programa:
            evento.extendedProps?.programa || '',

          Competencia:
            evento.title,

          Ciudad:
            evento.extendedProps?.ciudad || '',

          Municipio:
            evento.extendedProps?.municipio || '',

          Lugar:
            evento.extendedProps?.lugar || '',

          Direccion:
            evento.extendedProps?.direccion || '',

          Horas_Programa:
            evento.extendedProps?.horasPrograma || '',

          Fecha:
            fechaEvento,

          Dia:
            diaSemana,

          Hora_Inicio:
            new Date(evento.start)
              .toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              }),

          Hora_Fin:
            new Date(evento.end)
              .toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              }),

        };

      });

    const worksheet =
      XLSX.utils.json_to_sheet(datosExcel);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Planeador'
    );

    const excelBuffer =
      XLSX.write(workbook, {

        bookType: 'xlsx',

        type: 'array'

      });

    const data = new Blob(
      [excelBuffer],
      {
        type:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
      }
    );

    saveAs(
      data,
      `Planeador_${usuario?.nombre || 'Instructor'}.xlsx`
    );

    setExcelDescargado(true);

    alert(
      '✅ Excel descargado correctamente'
    );

  };

  return (

    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex justify-between items-center">

        <div>

          <h1 className="text-4xl font-bold">
            Planeador Académico
          </h1>

          <p className="text-gray-600">
            {usuario?.nombre}
          </p>

        </div>

        {eventosPlaneador.length > 0 && (

          <button
            onClick={descargarExcel}
            className="bg-green-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-green-700"
          >

            <Download size={20} />

            Descargar Excel

          </button>

        )}

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* FORMULARIO */}
        <div className="lg:col-span-4">

          <div className="bg-white rounded-3xl p-8 shadow-sm border sticky top-6">

            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">

              <Plus className="text-green-600" />

              Nueva Programación

            </h2>

            {/* TUTORIAL */}
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl mb-4">

              <h3 className="font-bold text-yellow-800 mb-2">
                📘 ¿Cómo usar el planeador?
              </h3>

              <ul className="text-sm text-yellow-700 space-y-1">

                <li>
                  ✅ Completa primero el formulario
                </li>

                <li>
                  ✅ Vista MES:
                  selecciona primero la hora inicio y fin,
                  luego haz click sobre varios días para programar
                  la misma franja horaria
                </li>

                <li>
                  ✅ Vista SEMANA o DÍA:
                  arrastra directamente las horas en el calendario
                </li>

                <li>
                  ✅ Haz click sobre un evento para eliminarlo
                </li>

                <li>
                  ✅ Debes completar exactamente las horas del programa
                </li>

                <li>
                  ✅ Descarga el Excel antes de agregar al cronograma
                </li>

              </ul>

            </div>

            <div className="space-y-5">

              <input
                type="text"
                name="programa"
                value={nuevoEvento.programa}
                onChange={handleChange}
                placeholder="Programa de Formación *"
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
              />

              <input
                type="text"
                name="title"
                value={nuevoEvento.title}
                onChange={handleChange}
                placeholder="Competencia / Curso *"
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
              />

              <input
                type="number"
                min="1"
                name="horasPrograma"
                value={nuevoEvento.horasPrograma}
                onChange={handleChange}
                placeholder="Horas Totales del Programa *"
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
              />

              {/* HORAS */}
              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="text-sm text-gray-600">
                    Hora Inicio
                  </label>

                  <select
                    name="startTime"
                    value={nuevoEvento.startTime}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
                  >

                    {Array.from({ length: 18 }, (_, i) => {

                      const hora = i + 6;

                      return (
                        <option
                          key={hora}
                          value={`${String(hora).padStart(2, '0')}:00`}
                        >
                          {`${String(hora).padStart(2, '0')}:00`}
                        </option>
                      );

                    })}

                  </select>

                </div>

                <div>

                  <label className="text-sm text-gray-600">
                    Hora Fin
                  </label>

                  <select
                    name="endTime"
                    value={nuevoEvento.endTime}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
                  >

                    {Array.from({ length: 18 }, (_, i) => {

                      const hora = i + 6;

                      return (
                        <option
                          key={hora}
                          value={`${String(hora).padStart(2, '0')}:00`}
                        >
                          {`${String(hora).padStart(2, '0')}:00`}
                        </option>
                      );

                    })}

                  </select>

                </div>

              </div>

              <input
                type="text"
                name="lugar"
                value={nuevoEvento.lugar}
                onChange={handleChange}
                placeholder="Lugar / Sede *"
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
              />

              <input
                type="text"
                name="direccion"
                value={nuevoEvento.direccion}
                onChange={handleChange}
                placeholder="Dirección *"
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
              />

              <div className="grid grid-cols-2 gap-4">

                <input
                  type="text"
                  name="ciudad"
                  value={nuevoEvento.ciudad}
                  onChange={handleChange}
                  placeholder="Ciudad *"
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
                />

                <input
                  type="text"
                  name="municipio"
                  value={nuevoEvento.municipio}
                  onChange={handleChange}
                  placeholder="Municipio"
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
                />

              </div>

              {/* RESUMEN */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">

                <p className="font-semibold text-blue-800">
                  ⏰ Resumen de Horas
                </p>

                <div className="mt-2 space-y-1 text-sm">

                  <p>
                    Horas Programadas:
                    <strong>
                      {' '}
                      {calcularHorasTotales()}
                    </strong>
                  </p>

                  <p>
                    Horas del Programa:
                    <strong>
                      {' '}
                      {nuevoEvento.horasPrograma || 0}
                    </strong>
                  </p>

                </div>

              </div>

              {/* BOTON */}
              <button
                onClick={agregarEvento}
                disabled={!excelDescargado}
                className={`w-full text-white py-4 rounded-2xl font-semibold text-lg transition-all ${
                  
                  excelDescargado
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >

                Agregar al Cronograma

              </button>

            </div>

          </div>

        </div>

        {/* CALENDARIO */}
        <div className="lg:col-span-8">

          <div className="bg-white rounded-3xl shadow-sm border p-4">

            <FullCalendar
              plugins={[
                dayGridPlugin,
                timeGridPlugin,
                interactionPlugin
              ]}

              initialView="dayGridMonth"

              locale="es"

              selectable={true}

              selectMirror={true}

              select={handleSelect}

              eventClick={handleEliminarEvento}

              events={eventosPlaneador}

              height="75vh"

              slotMinTime="06:00:00"

              slotMaxTime="23:00:00"

              slotDuration="01:00:00"

              snapDuration="01:00:00"

              nowIndicator={true}

              validRange={{
                start:
                  new Date()
                  .toISOString()
                  .split('T')[0]
              }}

              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right:
                  'dayGridMonth,timeGridWeek,timeGridDay'
              }}
            />

          </div>

        </div>

      </div>

      {/* HISTORIAL */}
      <div>

        <h2 className="text-2xl font-bold mb-4">
          Historial Completo
        </h2>

        <div className="bg-white rounded-3xl shadow-sm border p-4">

          <FullCalendar
            plugins={[
              dayGridPlugin,
              timeGridPlugin,
              interactionPlugin
            ]}

            initialView="dayGridMonth"

            locale="es"

            events={eventosHistorial}

            height="70vh"

            slotMinTime="06:00:00"

            slotMaxTime="23:00:00"

            slotDuration="01:00:00"

            snapDuration="01:00:00"

            nowIndicator={true}

            validRange={{
              start:
                new Date()
                .toISOString()
                .split('T')[0]
            }}

            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right:
                'dayGridMonth,timeGridWeek,timeGridDay'
            }}
          />

        </div>

      </div>

    </div>

  );

}

export default Planeador;