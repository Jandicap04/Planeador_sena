import { useState, useEffect } from 'react';

import {
  Upload,
  FolderOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  FileText,
  Trash2,
  ArrowLeft
} from 'lucide-react';

function CuentasDeCobro() {

  // =====================================
  // USUARIO
  // =====================================

  const [usuarioLogueado] = useState(
    JSON.parse(
      localStorage.getItem(
        'usuarioLogueado'
      )
    ) || {}
  );

  const rol =
    usuarioLogueado.rol?.toLowerCase() || '';

  const esAdmin =
    rol === 'coordinador' ||
    rol === 'administrativo' ||
    rol === 'admin';

  // =====================================
  // STATES
  // =====================================

  const [datosMacro, setDatosMacro] =
    useState([]);

  const [
    instructorSeleccionado,
    setInstructorSeleccionado
  ] = useState(null);

  const [formatosAdmin, setFormatosAdmin] =
    useState(
      JSON.parse(
        localStorage.getItem(
          'formatosAdmin'
        )
      ) || {}
    );

  // =====================================
  // STORAGE
  // =====================================

  useEffect(() => {

    const guardados = JSON.parse(
      localStorage.getItem(
        'datosMacroFichas'
      )
    ) || [];

    setDatosMacro(guardados);

  }, []);

  // =====================================
  // FECHAS
  // =====================================

  const convertirFecha = (valor) => {

    if (!valor) return null;

    if (typeof valor === 'string') {

      const partes =
        valor.split('/');

      if (partes.length === 3) {

        return new Date(
          partes[2],
          partes[1] - 1,
          partes[0]
        );
      }

      return new Date(valor);
    }

    return new Date(
      (valor - 25569) * 86400 * 1000
    );
  };

  const formatearFecha = (valor) => {

    if (!valor) {
      return 'No registrada';
    }

    const fecha =
      convertirFecha(valor);

    if (
      isNaN(fecha.getTime())
    ) {
      return 'Fecha inválida';
    }

    return fecha.toLocaleDateString(
      'es-CO',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }
    );
  };

  // =====================================
  // ESTADO
  // =====================================

  const calcularEstadoFicha = (
    fechaInicio,
    fechaFin
  ) => {

    const hoy = new Date();

    const inicio =
      convertirFecha(fechaInicio);

    const fin =
      convertirFecha(fechaFin);

    if (!inicio || !fin) {
      return 'PENDIENTE';
    }

    if (hoy > fin) {
      return 'FINALIZADA';
    }

    if (
      hoy >= inicio &&
      hoy <= fin
    ) {
      return 'EN_PROCESO';
    }

    return 'INICIANDO';
  };

  // =====================================
  // DOCUMENTOS
  // =====================================

  const DOCUMENTOS_CONFIG = {

    antes_inicio: [

      {
        nombre: 'Diseño Curricular',
        obligatorio: true,
        descripcion:
          'Documento descargado desde Sofia Plus'
      },

      {
        nombre:
          'Planeación Pedagógica',
        obligatorio: true,
        descripcion:
          'Formato institucional',
        formatoAdmin: true
      },

      {
        nombre:
          'Guías de Aprendizaje',
        obligatorio: true,
        descripcion:
          'Documento elaborado por instructor'
      },

      {
        nombre:
          'Instrumentos de Evaluación',
        obligatorio: true,
        descripcion:
          'Formato Word o PDF'
      },

      {
        nombre:
          'Formato Verificación Ambientes',
        obligatorio: true,
        descripcion:
          'Formato institucional',
        formatoAdmin: true
      },

      {
        nombre:
          'Acta de Concertación',
        obligatorio: true,
        descripcion:
          'Formato institucional',
        formatoAdmin: true
      }
    ],

    durante_formacion: [

      {
        nombre:
          'Listados de Asistencia',
        obligatorio: true,
        descripcion:
          'Adjunte todos los listados'
      },

      {
        nombre:
          'Evidencias Fotográficas',
        obligatorio: true,
        descripcion:
          'Fotografías de la formación'
      },

      {
        nombre:
          'Acta Entrega Materiales',
        obligatorio: false,
        descripcion:
          'Solo Campesena y Full Popular',
        requiereEspecial: true
      }
    ],

    finalizacion: [

      {
        nombre:
          'Juicios de Evaluación',
        obligatorio: true,
        descripcion:
          'Documento descargado desde Sofia Plus',
        soloFinalizada: true
      }
    ]
  };

  // =====================================
  // GENERAR DOCS
  // =====================================

  const generarDocumentosFicha = (
    ficha
  ) => {

    const docsAntes =
      DOCUMENTOS_CONFIG.antes_inicio;

    const docsDurante =
      DOCUMENTOS_CONFIG.durante_formacion;

    const docsFinal =
      DOCUMENTOS_CONFIG.finalizacion;

    if (
      ficha.estado ===
      'FINALIZADA'
    ) {

      return [
        ...docsAntes,
        ...docsDurante,
        ...docsFinal
      ];
    }

    if (
      ficha.estado ===
      'EN_PROCESO'
    ) {

      return [
        ...docsAntes,
        ...docsDurante
      ];
    }

    return docsAntes;
  };

  // =====================================
  // PROGRESO
  // =====================================

  const calcularProgreso = (
    ficha
  ) => {

    const documentos =
      generarDocumentosFicha(
        ficha
      );

    const obligatorios =
      documentos.filter(
        (doc) => {

          if (
            doc.requiereEspecial &&
            !ficha.aplicaMateriales
          ) {
            return false;
          }

          return doc.obligatorio;
        }
      );

    const completos =
      obligatorios.filter(
        (doc) => {

          return ficha.documentos?.find(
            (d) =>
              d.nombre ===
                doc.nombre &&
              d.cargado
          );
        }
      );

    return obligatorios.length > 0

      ? Math.round(
          (
            completos.length /
            obligatorios.length
          ) * 100
        )

      : 0;
  };

  // =====================================
  // DOCUMENTOS FALTANTES
  // =====================================

  const documentosFaltantes = (
    ficha
  ) => {

    const documentos =
      generarDocumentosFicha(
        ficha
      );

    return documentos.filter(
      (doc) => {

        if (
          doc.requiereEspecial &&
          !ficha.aplicaMateriales
        ) {
          return false;
        }

        return !ficha.documentos?.find(
          (d) =>
            d.nombre ===
              doc.nombre &&
            d.cargado
        );
      }
    );
  };

  // =====================================
  // LEER EXCEL
  // =====================================

  const obtenerValor = (
    fila,
    posiblesNombres
  ) => {

    const keys =
      Object.keys(fila);

    const keyReal =
      keys.find((k) => {

        return posiblesNombres.some(
          (nombre) =>

            k
              .trim()
              .toLowerCase() ===
            nombre
              .trim()
              .toLowerCase()
        );
      });

    return keyReal
      ? fila[keyReal]
      : null;
  };

  // =====================================
  // SUBIR MACRO
  // =====================================

  const handleSubirMacro = async (
    e
  ) => {

    const archivo =
      e.target.files[0];

    if (!archivo) return;

    const XLSX =
      await import('xlsx');

    const reader =
      new FileReader();

    reader.onload = (evt) => {

      const data =
        evt.target.result;

      const workbook =
        XLSX.read(data, {
          type: 'binary'
        });

      const hoja =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      const json =
        XLSX.utils.sheet_to_json(
          hoja,
          {
            defval: ''
          }
        );

      let fichasFinales = [];

      json.forEach((fila) => {

        const numeroFicha =
          obtenerValor(
            fila,
            [
              'FICHA',
              'Ficha'
            ]
          ) || 'SIN_FICHA';

        const instructor =
          obtenerValor(
            fila,
            [
              'NOMBRE CORREGIDO MACRO'
            ]
          )?.trim() ||
          'SIN NOMBRE';

        const fechaInicio =
          obtenerValor(
            fila,
            [
              'FECHA DE INICIO'
            ]
          );

        const fechaFin =
          obtenerValor(
            fila,
            [
              'FECHA DE TERMINACION DE LA FICHA'
            ]
          );

        const programa =
          obtenerValor(
            fila,
            [
              'PROGRAMA'
            ]
          ) || '';

        const aplicaMateriales =
          programa
            .toLowerCase()
            .includes(
              'campesena'
            ) ||
          programa
            .toLowerCase()
            .includes(
              'full popular'
            );

        fichasFinales.push({

          ficha:
            String(
              numeroFicha
            ),

          instructor,

          fechaInicio,

          fechaFin,

          aplicaMateriales,

          estado:
            calcularEstadoFicha(
              fechaInicio,
              fechaFin
            ),

          progreso: 0,

          documentos: []
        });
      });

      localStorage.setItem(
        'datosMacroFichas',
        JSON.stringify(
          fichasFinales
        )
      );

      setDatosMacro(
        fichasFinales
      );

      alert(
        '✅ Macro cargada correctamente'
      );
    };

    reader.readAsBinaryString(
      archivo
    );
  };

  // =====================================
  // SUBIR DOCUMENTO
  // =====================================

  const subirDocumento = (
    fichaNumero,
    documentoNombre,
    archivo
  ) => {

    const reader =
      new FileReader();

    reader.onload = () => {

      const nuevasFichas =
        datosMacro.map(
          (ficha) => {

            if (
              ficha.ficha ===
              fichaNumero
            ) {

              const documentos =
                ficha.documentos ||
                [];

              const existe =
                documentos.find(
                  (d) =>
                    d.nombre ===
                    documentoNombre
                );

              const nuevoDoc = {

                nombre:
                  documentoNombre,

                cargado: true,

                archivo:
                  archivo.name,

                base64:
                  reader.result
              };

              if (existe) {

                Object.assign(
                  existe,
                  nuevoDoc
                );

              } else {

                documentos.push(
                  nuevoDoc
                );
              }

              ficha.documentos =
                documentos;

              ficha.progreso =
                calcularProgreso(
                  ficha
                );
            }

            return ficha;
          }
        );

      setDatosMacro(
        nuevasFichas
      );

      localStorage.setItem(
        'datosMacroFichas',
        JSON.stringify(
          nuevasFichas
        )
      );
    };

    reader.readAsDataURL(
      archivo
    );
  };

  // =====================================
  // ELIMINAR DOC
  // =====================================

  const eliminarDocumento = (
    fichaNumero,
    documentoNombre
  ) => {

    const nuevasFichas =
      datosMacro.map(
        (ficha) => {

          if (
            ficha.ficha ===
            fichaNumero
          ) {

            ficha.documentos =
              ficha.documentos.filter(
                (d) =>
                  d.nombre !==
                  documentoNombre
              );

            ficha.progreso =
              calcularProgreso(
                ficha
              );
          }

          return ficha;
        }
      );

    setDatosMacro(
      nuevasFichas
    );

    localStorage.setItem(
      'datosMacroFichas',
      JSON.stringify(
        nuevasFichas
      )
    );
  };

  // =====================================
  // SUBIR FORMATOS ADMIN
  // =====================================

  const subirFormatoAdmin = (
    nombre,
    archivo
  ) => {

    const reader =
      new FileReader();

    reader.onload = () => {

      const nuevos = {

        ...formatosAdmin,

        [nombre]: {

          nombre:
            archivo.name,

          base64:
            reader.result
        }
      };

      setFormatosAdmin(
        nuevos
      );

      localStorage.setItem(
        'formatosAdmin',
        JSON.stringify(
          nuevos
        )
      );
    };

    reader.readAsDataURL(
      archivo
    );
  };

  // =====================================
  // DESCARGAR FORMATO
  // =====================================

  const descargarFormato = (
    formato
  ) => {

    const link =
      document.createElement('a');

    link.href =
      formato.base64;

    link.download =
      formato.nombre;

    link.click();
  };

  // =====================================
  // AGRUPAR
  // =====================================

  const fichasPorInstructor =
    () => {

      const mapa = {};

      datosMacro.forEach(
        (ficha) => {

          const nombre =
            ficha.instructor ||
            'Sin Nombre';

          if (!mapa[nombre]) {
            mapa[nombre] = [];
          }

          mapa[nombre].push(
            ficha
          );
        }
      );

      return mapa;
    };

  // =====================================
  // COLOR
  // =====================================

  const obtenerColorEstado = (
    estado
  ) => {

    switch (estado) {

      case 'FINALIZADA':
        return 'border-green-500 bg-green-50';

      case 'EN_PROCESO':
        return 'border-yellow-500 bg-yellow-50';

      case 'INICIANDO':
        return 'border-blue-500 bg-blue-50';

      default:
        return 'border-gray-300 bg-white';
    }
  };

  // =====================================
  // ICONO
  // =====================================

  const obtenerIconoEstado = (
    estado
  ) => {

    switch (estado) {

      case 'FINALIZADA':
        return (
          <CheckCircle
            className="text-green-600"
            size={24}
          />
        );

      case 'EN_PROCESO':
        return (
          <AlertCircle
            className="text-yellow-600"
            size={24}
          />
        );

      case 'INICIANDO':
        return (
          <Clock
            className="text-blue-600"
            size={24}
          />
        );

      default:
        return null;
    }
  };

  // =====================================
  // DATOS
  // =====================================

  const instructorActual =
    instructorSeleccionado
      ? fichasPorInstructor()[
          instructorSeleccionado
        ] || []
      : [];

  const misFichas =
    datosMacro.filter(
      (ficha) =>
        ficha.instructor
          ?.trim()
          .toLowerCase() ===
        (
          usuarioLogueado.nombre ||
          usuarioLogueado.usuario ||
          ''
        )
          .trim()
          .toLowerCase()
    );

  // =====================================
  // RENDER
  // =====================================

  return (

    <div className="max-w-7xl mx-auto space-y-8">

      {/* ADMIN */}

      {esAdmin && (

        <div className="space-y-8">

          {/* MACRO */}

          <div className="bg-white rounded-3xl p-8 border">

            <h2 className="text-2xl font-bold mb-6">
              Cargar Macro
            </h2>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-violet-300 rounded-3xl p-12 cursor-pointer hover:bg-violet-50">

              <Upload
                size={60}
                className="text-violet-500 mb-4"
              />

              <span className="text-xl font-semibold">
                Seleccionar Excel
              </span>

              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={
                  handleSubirMacro
                }
                className="hidden"
              />

            </label>

          </div>

          {/* FORMATOS */}

          <div className="bg-white rounded-3xl p-8 border">

            <h2 className="text-2xl font-bold mb-6">
              Formatos Institucionales
            </h2>

            <div className="space-y-4">

              {[
                'Planeación Pedagógica',
                'Formato Verificación Ambientes',
                'Acta de Concertación'
              ].map((nombre) => (

                <div
                  key={nombre}
                  className="border rounded-2xl p-4 flex justify-between items-center"
                >

                  <div>

                    <h3 className="font-bold">
                      {nombre}
                    </h3>

                    <p className="text-sm text-gray-500">

                      {formatosAdmin[nombre]
                        ?.nombre ||
                        'Sin archivo'}

                    </p>

                  </div>

                  <label className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl cursor-pointer">

                    Subir Formato

                    <input
                      type="file"
                      className="hidden"

                      onChange={(e) => {

                        const archivo =
                          e.target.files[0];

                        if (!archivo)
                          return;

                        subirFormatoAdmin(
                          nombre,
                          archivo
                        );
                      }}
                    />

                  </label>

                </div>
              ))}

            </div>

          </div>

          {/* CARPETAS */}

          {!instructorSeleccionado && (

            <div>

              <h2 className="text-2xl font-bold mb-6">
                Carpetas por Instructor
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {Object.entries(
                  fichasPorInstructor()
                ).map(
                  ([
                    nombre,
                    fichas
                  ]) => (

                    <div
                      key={nombre}

                      onClick={() =>
                        setInstructorSeleccionado(
                          nombre
                        )
                      }

                      className="bg-white rounded-3xl p-6 border hover:shadow-lg cursor-pointer"
                    >

                      <div className="flex justify-between items-center">

                        <div>

                          <h3 className="font-bold text-lg">
                            {nombre}
                          </h3>

                          <p className="text-gray-500 mt-2">
                            {
                              fichas.length
                            } fichas
                          </p>

                        </div>

                        <FolderOpen
                          size={40}
                          className="text-amber-600"
                        />

                      </div>

                    </div>
                  )
                )}

              </div>

            </div>
          )}

          {/* FICHAS PROFESOR */}

          {instructorSeleccionado && (

            <div>

              <button

                onClick={() =>
                  setInstructorSeleccionado(
                    null
                  )
                }

                className="mb-6 flex items-center gap-2 text-gray-700 font-medium"
              >

                <ArrowLeft size={18} />

                Volver

              </button>

              <h2 className="text-3xl font-bold mb-8">

                Fichas de

                <span className="text-amber-600">
                  {' '}
                  {instructorSeleccionado}
                </span>

              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {instructorActual.map(
                  (
                    ficha,
                    index
                  ) => (

                    <div
                      key={index}
                      className={`rounded-3xl p-6 border-2 ${obtenerColorEstado(
                        ficha.estado
                      )}`}
                    >

                      <div className="flex justify-between">

                        <FolderOpen
                          size={36}
                          className="text-amber-600"
                        />

                        {obtenerIconoEstado(
                          ficha.estado
                        )}

                      </div>

                      <h3 className="text-2xl font-bold mt-4">
                        Ficha {ficha.ficha}
                      </h3>

                      <div className="mt-4 space-y-2 text-sm">

                        <p>
                          <strong>
                            Estado:
                          </strong>{' '}
                          {ficha.estado}
                        </p>

                        <p>
                          <strong>
                            Fecha Inicio:
                          </strong>{' '}
                          {formatearFecha(
                            ficha.fechaInicio
                          )}
                        </p>

                        <p>
                          <strong>
                            Fecha Fin:
                          </strong>{' '}
                          {formatearFecha(
                            ficha.fechaFin
                          )}
                        </p>

                        <p>
                          <strong>
                            Progreso:
                          </strong>{' '}
                          {ficha.progreso || 0}%
                        </p>

                      </div>

                    </div>
                  )
                )}

              </div>

            </div>
          )}

        </div>
      )}

      {/* INSTRUCTOR */}

      {!esAdmin && (

        <div className="space-y-8">

          {misFichas.map(
            (
              ficha,
              index
            ) => {

              const documentos =
                generarDocumentosFicha(
                  ficha
                );

              return (

                <div
                  key={index}
                  className={`rounded-3xl border-2 p-8 ${obtenerColorEstado(
                    ficha.estado
                  )}`}
                >

                  <div className="flex justify-between">

                    <div>

                      <h2 className="text-3xl font-bold">
                        Ficha {ficha.ficha}
                      </h2>

                      <div className="mt-4 space-y-1">

                        <p>
                          <strong>
                            Estado:
                          </strong>{' '}
                          {ficha.estado}
                        </p>

                        <p>
                          <strong>
                            Fecha Inicio:
                          </strong>{' '}
                          {formatearFecha(
                            ficha.fechaInicio
                          )}
                        </p>

                        <p>
                          <strong>
                            Fecha Fin:
                          </strong>{' '}
                          {formatearFecha(
                            ficha.fechaFin
                          )}
                        </p>

                      </div>

                    </div>

                    {obtenerIconoEstado(
                      ficha.estado
                    )}

                  </div>

                  {/* FALTANTES */}

                  {documentosFaltantes(
                    ficha
                  ).length > 0 && (

                    <div className="mt-6 bg-red-100 border border-red-300 text-red-700 rounded-2xl p-4">

                      <strong>
                        Faltan documentos:
                      </strong>

                      <ul className="list-disc ml-5 mt-2">

                        {documentosFaltantes(
                          ficha
                        ).map(
                          (
                            doc
                          ) => (

                            <li
                              key={
                                doc.nombre
                              }
                            >
                              {
                                doc.nombre
                              }
                            </li>
                          )
                        )}

                      </ul>

                    </div>
                  )}

                  {/* PROGRESO */}

                  <div className="mt-6">

                    <div className="flex justify-between mb-2">

                      <span>
                        Progreso
                      </span>

                      <strong>
                        {
                          ficha.progreso ||
                          0
                        }
                        %
                      </strong>

                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-4">

                      <div
                        className="bg-green-600 h-4 rounded-full"
                        style={{
                          width: `${
                            ficha.progreso ||
                            0
                          }%`
                        }}
                      />

                    </div>

                  </div>

                  {/* DOCUMENTOS */}

                  <div className="mt-8 space-y-6">

                    {documentos
                      .filter(Boolean)
                      .map(
                      (
                        doc,
                        docIndex
                      ) => {

                        if (
                          doc.requiereEspecial &&
                          !ficha.aplicaMateriales
                        ) {
                          return null;
                        }

                       const estadoNormalizado =
                       String(ficha.estado)
                       .trim()
                       .toUpperCase();

                       if (
                        doc.soloFinalizada &&
                       estadoNormalizado !==
                       'FINALIZADA'
                       ) {
                       return null;
                       }

                        const bloqueado =
  documentos
    .slice(
      0,
      docIndex
    )
    .some(
      (
        docAnterior
      ) => {

        // SI ES OPCIONAL
        // NO BLOQUEA

        if (
          !docAnterior.obligatorio
        ) {
          return false;
        }

        // SI NO APLICA
        // NO BLOQUEA

        if (
          docAnterior.requiereEspecial &&
          !ficha.aplicaMateriales
        ) {
          return false;
        }

        return !ficha.documentos?.find(
          (
            d
          ) =>
            d.nombre ===
              docAnterior.nombre &&
            d.cargado
        );
      }
    );
                        const cargado =
                          ficha.documentos?.find(
                            (
                              d
                            ) =>
                              d.nombre ===
                                doc.nombre &&
                              d.cargado
                          );

                        return (

                          <div
                            key={
                              docIndex
                            }

                            className={`rounded-3xl border p-6 ${
                              bloqueado
                                ? 'bg-gray-100 opacity-60'
                                : 'bg-white'
                            }`}
                          >

                            <div className="flex justify-between items-start">

                              <div>

                                <div className="flex items-center gap-3">

                                  <FileText
                                    size={24}
                                    className="text-amber-600"
                                  />

                                  <h3 className="text-xl font-bold">
                                    {
                                      doc.nombre
                                    }
                                  </h3>

                                </div>

                                <p className="text-gray-500 mt-2">
                                  {
                                    doc.descripcion
                                  }
                                </p>

                              </div>

                              {cargado ? (

                                <span className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold">
                                  COMPLETO
                                </span>

                              ) : (

                                <span className="bg-red-100 text-red-700 px-4 py-2 rounded-xl font-bold">
                                  FALTA
                                </span>

                              )}

                            </div>

                            {!bloqueado && (

                              <div className="mt-6 flex flex-wrap gap-4">

                                {/* SUBIR */}

                                <label className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-3 rounded-2xl cursor-pointer">

                                  Subir Archivo

                                  <input
                                    type="file"
                                    className="hidden"

                                    onChange={(
                                      e
                                    ) => {

                                      const archivo =
                                        e
                                          .target
                                          .files[0];

                                      if (
                                        !archivo
                                      )
                                        return;

                                      subirDocumento(
                                        ficha.ficha,
                                        doc.nombre,
                                        archivo
                                      );
                                    }}
                                  />

                                </label>

                                {/* DESCARGAR */}

                                {doc.formatoAdmin && (

                                  <button

                                    onClick={() => {

                                      const formato =
                                        formatosAdmin[
                                          doc.nombre
                                        ];

                                      if (
                                        formato
                                      ) {

                                        descargarFormato(
                                          formato
                                        );

                                      } else {

                                        alert(
                                          'El coordinador aún no ha cargado este formato'
                                        );
                                      }
                                    }}

                                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl flex items-center gap-2"
                                  >

                                    <Download size={18} />

                                    Descargar Formato

                                  </button>
                                )}

                                {/* ELIMINAR */}

                                {cargado && (

                                  <button

                                    onClick={() =>
                                      eliminarDocumento(
                                        ficha.ficha,
                                        doc.nombre
                                      )
                                    }

                                    className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-2xl flex items-center gap-2"
                                  >

                                    <Trash2 size={18} />

                                    Eliminar

                                  </button>
                                )}

                              </div>
                            )}

                          </div>
                        );
                      }
                    )}

                  </div>

                </div>
              );
            }
          )}

        </div>
      )}

    </div>
  );
}

export default CuentasDeCobro;