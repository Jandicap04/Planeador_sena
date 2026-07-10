import { useEffect, useState } from 'react';

import {
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';

function ModuloBusqueda() {

  // =========================================
  // STATES
  // =========================================
  const [datos, setDatos] = useState([]);
  const [confirmacion, setConfirmacion] = useState(false);

  const usuarioString = localStorage.getItem('usuarioLogueado');

  const usuario = usuarioString
    ? JSON.parse(usuarioString)
    : {};

  const esAdmin =
    usuario.rol === 'Coordinador' ||
    usuario.rol === 'coordinador' ||
    usuario.rol === 'administrativo' ||
    usuario.rol === 'Admin';

  // =========================================
  // CARGAR DATOS
  // =========================================
  useEffect(() => {

    const datosGuardados =
      JSON.parse(localStorage.getItem('reporteMacro')) || [];

    if (esAdmin) {

      setDatos(datosGuardados);

    } else {

      const usuarioCodigo = String(
        usuario.password || usuario.codigo || ''
      )
        .trim()
        .replace(/\s+/g, '');

      const filtrados = datosGuardados.filter((item) => {

        const codigo = String(
          item['CODIGO DE INSTRUCTOR'] || ''
        )
          .trim()
          .replace(/\s+/g, '');

        return codigo === usuarioCodigo;
      });

      setDatos(filtrados);
    }

  }, [esAdmin]);

  // =========================================
  // FORMATEAR FECHA
  // =========================================
  const formatearFecha = (valor) => {

    if (!valor) return 'N/A';

    if (typeof valor === 'string') {
      return valor.trim();
    }

    if (typeof valor === 'number') {

      try {

        const fecha = new Date(
          (valor - 25569) * 86400 * 1000
        );

        fecha.setDate(fecha.getDate() + 1);

        if (!isNaN(fecha.getTime())) {

          return fecha.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }

      } catch (e) {}
    }

    return String(valor).trim();
  };

  // =========================================
  // ALERTAS
  // =========================================
  const obtenerAlerta = (estado, fechaFin) => {

    if (!estado) {

      return {
        texto: 'SIN INFORMACIÓN',
        color: 'bg-gray-100 text-gray-700',
        icono: <Clock3 size={18} />
      };
    }

    const estadoTexto = estado.toLowerCase();

    // TERMINADA
    if (estadoTexto.includes('terminada')) {

      return {
        texto: 'PROCESO EXITOSO',
        color: 'bg-green-100 text-green-700',
        icono: <CheckCircle2 size={18} />
      };
    }

    // INSCRIPCIÓN
    if (estadoTexto.includes('inscripción')) {

      return {
        texto: 'FICHA EN CREACIÓN',
        color: 'bg-blue-100 text-blue-700',
        icono: <Clock3 size={18} />
      };
    }

    // EJECUCIÓN
    if (estadoTexto.includes('ejecución')) {

      const hoy = new Date();

      let fecha = null;

      if (typeof fechaFin === 'number') {

        fecha = new Date(
          (fechaFin - 25569) * 86400 * 1000
        );

        fecha.setDate(fecha.getDate() + 1);
      }

      if (fecha && fecha < hoy) {

        return {
          texto: 'RETRASO EN EVALUAR',
          color: 'bg-red-100 text-red-700',
          icono: <XCircle size={18} />
        };
      }

      return {
        texto: 'A TIEMPO DE EVALUAR',
        color: 'bg-yellow-100 text-yellow-700',
        icono: <AlertTriangle size={18} />
      };
    }

    return {
      texto: estado,
      color: 'bg-gray-100 text-gray-700',
      icono: <Clock3 size={18} />
    };
  };

  // =========================================
  // CARGAR ARCHIVO
  // =========================================
  const cargarArchivo = async (e) => {

    if (!confirmacion) {

      alert(
        '⚠️ Debe confirmar que el documento corresponde a la evidencia solicitada antes de continuar.'
      );

      return;
    }

    const archivo = e.target.files[0];

    if (!archivo) return;

    const XLSX = await import('xlsx');

    const reader = new FileReader();

    reader.onload = (evt) => {

      const data = evt.target.result;

      const workbook = XLSX.read(data, {
        type: 'binary'
      });

      const hoja =
        workbook.Sheets[workbook.SheetNames[0]];

      const json = XLSX.utils.sheet_to_json(hoja);

      localStorage.setItem(
        'reporteMacro',
        JSON.stringify(json)
      );

      alert('✅ Reporte cargado correctamente');

      window.location.reload();
    };

    reader.readAsBinaryString(archivo);
  };

  // =========================================
  // RENDER
  // =========================================
  return (

    <div className="max-w-7xl mx-auto">

      {/* HEADER */}
      <div className="mb-10">

        <h1 className="text-5xl font-bold text-gray-900">
          Módulo de Búsqueda
        </h1>

        <p className="text-xl text-gray-600 mt-3">

          {esAdmin
            ? 'Carga y gestión del reporte generado por la macro'
            : 'Consulta de fichas, estados y alertas'}
        </p>
      </div>

      {/* CARGA DE ARCHIVO */}
      {esAdmin && (

        <div className="bg-white rounded-3xl border border-gray-200 p-8 mb-10 shadow-sm">

          <div className="flex items-center gap-4 mb-6">

            <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center">

              <Upload
                size={32}
                className="text-violet-700"
              />
            </div>

            <div>

              <h2 className="text-2xl font-bold text-gray-800">
                Cargar Reporte de Macro
              </h2>

              <p className="text-gray-500">
                Suba el archivo Excel generado automáticamente
              </p>
            </div>
          </div>

          {/* CONFIRMACIÓN */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mb-6">

            <div className="flex items-start gap-4">

              <input
                type="checkbox"
                checked={confirmacion}
                onChange={(e) =>
                  setConfirmacion(e.target.checked)
                }
                className="mt-1 w-5 h-5 accent-violet-600 cursor-pointer"
              />

              <div>

                <h3 className="font-bold text-gray-800 mb-1">
                  Confirmación de Evidencia
                </h3>

                <p className="text-sm text-gray-700 leading-relaxed">

                  Confirmo que el documento cargado
                  corresponde a la evidencia solicitada
                  y que cumple con los lineamientos,
                  formatos y requisitos establecidos
                  por la institución.

                  Asimismo, entiendo que la información
                  suministrada será utilizada para
                  validaciones administrativas,
                  seguimiento académico y control
                  institucional.
                </p>
              </div>
            </div>
          </div>

          {/* INPUT ARCHIVO */}
          <label
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-12 transition-all ${
              confirmacion
                ? 'border-violet-300 cursor-pointer hover:bg-violet-50'
                : 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-70'
            }`}
          >

            <FileSpreadsheet
              size={70}
              className="text-violet-600 mb-5"
            />

            <span className="text-xl font-semibold text-gray-700">
              Cargar archivo Excel
            </span>

            <span className="text-gray-500 mt-2">
              .xlsx generado por la macro
            </span>

            {!confirmacion && (
              <span className="text-sm text-red-500 mt-4 font-semibold">
                Debe aceptar la confirmación para habilitar la carga
              </span>
            )}

            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={cargarArchivo}
              className="hidden"
              disabled={!confirmacion}
            />
          </label>
        </div>
      )}

      {/* TABLA */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">

        <div className="overflow-x-auto">

          <table className="min-w-full">

            <thead className="bg-gray-50">

              <tr>

                <th className="px-6 py-5 text-left text-sm font-bold text-gray-700">
                  Nombre del Instructor
                </th>

                <th className="px-6 py-5 text-left text-sm font-bold text-gray-700">
                  Número de Ficha
                </th>

                <th className="px-6 py-5 text-left text-sm font-bold text-gray-700">
                  Reporte DF_53
                </th>

                <th className="px-6 py-5 text-left text-sm font-bold text-gray-700">
                  Reporte PE_04
                </th>

                <th className="px-6 py-5 text-left text-sm font-bold text-gray-700">
                  Aprendices por Enrutar
                </th>

                <th className="px-6 py-5 text-left text-sm font-bold text-gray-700">
                  Fecha Inicio
                </th>

                <th className="px-6 py-5 text-left text-sm font-bold text-gray-700">
                  Fecha Fin
                </th>

                <th className="px-6 py-5 text-left text-sm font-bold text-gray-700">
                  Horas Ejecutadas
                </th>

                <th className="px-6 py-5 text-left text-sm font-bold text-gray-700">
                  Alertas
                </th>

              </tr>
            </thead>

            <tbody>

              {datos.map((item, index) => {

                const alerta = obtenerAlerta(

                  item['REPORTE DF_53'] ||
                  item['ESTADO DE FICHA DF_53'] ||
                  '',

                  item['FECHA FIN'] ||
                  item['FECHA DE TERMINACION DE LA FICHA']
                );

                return (

                  <tr
                    key={index}
                    className="border-t border-gray-100 hover:bg-gray-50 transition-all"
                  >

                    <td className="px-6 py-5 font-semibold text-gray-800">

                      {
                        item['NOMBRE CORREGIDO MACRO'] ||
                        item['NOMBRE DEL INSTRUCTOR'] ||
                        item['Nombre Instructor'] ||
                        'N/A'
                      }
                    </td>

                    <td className="px-6 py-5 font-semibold text-gray-800">

                      {
                        item['Ficha'] ||
                        item['NUMERO DE FICHA'] ||
                        'N/A'
                      }
                    </td>

                    <td className="px-6 py-5 text-gray-700">

                      {
                        item['REPORTE DF_53'] ||
                        item['ESTADO DE FICHA DF_53'] ||
                        'N/A'
                      }
                    </td>

                    <td className="px-6 py-5 text-gray-700">

                      {
                        item['REPORTE PE_04'] ||
                        item['ESTADO DE FICHA PE_04'] ||
                        'N/A'
                      }
                    </td>

                    <td className="px-6 py-5 text-gray-700">

                      {
                        item['APRENDICES ACTIVOS SIN RUTA'] ||
                        item['APRENDICES SIN ENRUTAR'] ||
                        '0'
                      }
                    </td>

                    <td className="px-6 py-5 text-gray-700 font-medium">

                      {
                        formatearFecha(
                          item['FECHA INICIO'] ||
                          item['Fecha Inicio']
                        )
                      }
                    </td>

                    <td className="px-6 py-5 text-gray-700 font-medium">

                      {
                        formatearFecha(

                          item['FECHA FIN'] ||
                          item['FECHA DE TERMINACION DE LA FICHA']
                        )
                      }
                    </td>

                    <td className="px-6 py-5">

                      <div className="flex flex-col gap-1">

                        <span className="font-bold text-violet-700">

                          {
                            item['HORAS DE INSTRUCTOR'] ||
                            item['HORAS EJECUTADAS'] ||
                            0
                          } Horas
                        </span>

                        <span className="text-xs text-gray-500">
                          Ejecutadas de 160 Horas
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-5">

                      <div
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${alerta.color}`}
                      >

                        {alerta.icono}

                        {alerta.texto}
                      </div>
                    </td>
                  </tr>
                );
              })}

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ModuloBusqueda;