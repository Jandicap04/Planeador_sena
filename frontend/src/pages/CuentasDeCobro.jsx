import { useState, useEffect } from 'react';
import { 
  Upload, FolderOpen, Users, ArrowLeft, AlertCircle, 
  Download, CheckCircle, Trash2, Send, Eye 
} from 'lucide-react';
import { subirArchivo } from '../lib/evidenciasService';

function CuentasDeCobro() {
  const [usuarioLogueado] = useState(JSON.parse(localStorage.getItem('usuarioLogueado')) || {});
  const [datosMacro, setDatosMacro] = useState([]);
  const [instructorSeleccionado, setInstructorSeleccionado] = useState(null);
  const [fichaSeleccionada, setFichaSeleccionada] = useState(null);
  const [plantillas, setPlantillas] = useState({});
  const [evidenciasPorFicha, setEvidenciasPorFicha] = useState({});
  const [fasesEnviadas, setFasesEnviadas] = useState({});
  const [mostrarFelicitacion, setMostrarFelicitacion] = useState(false);
  const [evidenciasAprobadas, setEvidenciasAprobadas] = useState({});

  const rol = usuarioLogueado.rol?.toLowerCase() || '';
  const esAdmin = ['coordinador', 'administrativo', 'admin'].includes(rol);

  useEffect(() => {
    const macro = JSON.parse(localStorage.getItem('datosMacroFichas')) || [];
    setDatosMacro(macro);
    setPlantillas(JSON.parse(localStorage.getItem('plantillasFormatos')) || {});
    setEvidenciasPorFicha(JSON.parse(localStorage.getItem('evidenciasPorFicha')) || {});
    setFasesEnviadas(JSON.parse(localStorage.getItem('fasesEnviadas')) || {});
    setEvidenciasAprobadas(JSON.parse(localStorage.getItem('evidenciasAprobadas')) || {});
  }, []);

  const guardarEvidencias = (nuevas) => {
    setEvidenciasPorFicha(nuevas);
    localStorage.setItem('evidenciasPorFicha', JSON.stringify(nuevas));
  };

  const guardarFases = (nuevas) => {
    setFasesEnviadas(nuevas);
    localStorage.setItem('fasesEnviadas', JSON.stringify(nuevas));
  };

  const guardarAprobaciones = (nuevas) => {
    setEvidenciasAprobadas(nuevas);
    localStorage.setItem('evidenciasAprobadas', JSON.stringify(nuevas));
  };

  const getFichaNumber = (ficha) => ficha['FICHA'] || ficha['FICHA '] || 'Sin número';

  const convertirFecha = (valor) => {
    if (!valor) return null;
    if (typeof valor === 'number') return new Date((valor - 25569) * 86400 * 1000);
    const partes = valor.split('/');
    if (partes.length === 3) return new Date(partes[2], partes[1] - 1, partes[0]);
    return new Date(valor);
  };

  const determinarEtapaFicha = (ficha) => {
    const hoy = new Date();
    const inicio = convertirFecha(ficha['FECHA DE INICIO'] || ficha['FECHA DE INICIO ']);
    const fin = convertirFecha(ficha['FECHA DE TERMINACION DE LA FICHA']);
    if (!inicio || !fin) return 'DESCONOCIDA';
    if (hoy < inicio) return 'ANTES';
    if (hoy >= inicio && hoy <= fin) return 'DURANTE';
    return 'FINALIZADA';
  };

  // ====================== MIS FICHAS (INSTRUCTOR) ======================
  const misFichas = datosMacro
    .filter(f => {
      const nombreExcel = (f['NOMBRE CORREGIDO MACRO'] || '').trim().toUpperCase();
      return nombreExcel === (usuarioLogueado.nombre || '').trim().toUpperCase();
    })
    .sort((a, b) => {
      const fechaA = convertirFecha(a['FECHA DE INICIO'] || a['FECHA DE INICIO ']) || new Date(0);
      const fechaB = convertirFecha(b['FECHA DE INICIO'] || b['FECHA DE INICIO ']) || new Date(0);
      return fechaA - fechaB;
    });

  const getFichaHabilitada = () => {
    for (let ficha of misFichas) {
      const numero = getFichaNumber(ficha);
      const enviadas = fasesEnviadas[numero] || [];
      if (enviadas.length < 3) return ficha;
    }
    return null;
  };

  const fichaHabilitada = getFichaHabilitada();

  const verificarTodasCompletas = () => {
    if (misFichas.length === 0) return false;
    const todasCompletas = misFichas.every(ficha => {
      const numero = getFichaNumber(ficha);
      const enviadas = fasesEnviadas[numero] || [];
      return enviadas.length >= 3;
    });
    if (todasCompletas && !mostrarFelicitacion) setMostrarFelicitacion(true);
    return todasCompletas;
  };

  // ====================== FASES Y DOCUMENTOS ======================
  const obtenerFaseActual = (ficha) => {
    const numero = getFichaNumber(ficha);
    const enviadas = fasesEnviadas[numero] || [];
    const etapa = determinarEtapaFicha(ficha);
    if (enviadas.includes('FINALIZADA')) return null;
    if (enviadas.includes('DURANTE')) return 'FINALIZADA';
    if (enviadas.includes('ANTES')) return 'DURANTE';
    if (etapa === 'FINALIZADA' && enviadas.length === 0) return 'TODAS';
    return 'ANTES';
  };

  const obtenerDocumentosFase = (ficha, fase) => {
    const mostrarActa = ficha.ACTA_MATERIALES === 'SI';
    const mostrarLegal = ficha.LEGALIZACION === 'SI';

    const base = {
      ANTES: [
        { nombre: "Diseño Curricular", permiteBorrar: false },
        { nombre: "Planeación Pedagógica", permiteBorrar: false, esPlantilla: true },
        { nombre: "Guías de Aprendizaje", permiteBorrar: true },
        { nombre: "Instrumentos de Evaluación", permiteBorrar: false },
        { nombre: "Formato de Verificación de Ambientes", permiteBorrar: false, esPlantilla: true },
        { nombre: "Acta de Concertación", permiteBorrar: false, esPlantilla: true },
      ],
      DURANTE: [
        { nombre: "Listados de Asistencia", permiteBorrar: false },
        ...(mostrarActa ? [{ nombre: "Actas de Entrega de Materiales", permiteBorrar: false }] : []),
        { nombre: "Evidencias Fotográficas por Formación", permiteBorrar: false },
      ],
      FINALIZADA: [
        { nombre: "Juicios de Evaluación", permiteBorrar: false },
      ]
    };

    if (fase === 'TODAS') {
      return [...base.ANTES, ...base.DURANTE, ...base.FINALIZADA];
    }
    return base[fase] || [];
  };

  // ====================== ACCIONES INSTRUCTOR ======================
  const subirEvidencia = async (ficha, nombreDoc, archivo) => {
    const numero = getFichaNumber(ficha);
    const actuales = evidenciasPorFicha[numero] || {};
    actuales[nombreDoc] = {
      nombreArchivo: archivo.name,
      fecha: new Date().toISOString(),
      confirmado: false
    };
    const nuevas = { ...evidenciasPorFicha, [numero]: actuales };
    guardarEvidencias(nuevas);

    try {
      await subirArchivo(archivo, numero, nombreDoc, usuarioLogueado.nombre, true);
    } catch (error) {
      console.error('Error al subir:', error);
    }
  };

  const toggleConfirmacion = (ficha, nombreDoc) => {
    const numero = getFichaNumber(ficha);
    const actuales = { ...(evidenciasPorFicha[numero] || {}) };
    if (actuales[nombreDoc]) {
      actuales[nombreDoc].confirmado = !actuales[nombreDoc].confirmado;
      guardarEvidencias({ ...evidenciasPorFicha, [numero]: actuales });
    }
  };

  const borrarEvidencia = (ficha, nombreDoc) => {
    const numero = getFichaNumber(ficha);
    const actuales = { ...(evidenciasPorFicha[numero] || {}) };
    delete actuales[nombreDoc];
    guardarEvidencias({ ...evidenciasPorFicha, [numero]: actuales });
  };

  const enviarFase = (ficha, fase) => {
    const numero = getFichaNumber(ficha);
    const docs = obtenerDocumentosFase(ficha, fase);
    const evidencias = evidenciasPorFicha[numero] || {};

    const faltantes = docs.filter(doc => {
      const ev = evidencias[doc.nombre];
      return !ev || !ev.confirmado;
    });

    if (faltantes.length > 0) {
      alert(`Faltan documentos por confirmar:\n\n${faltantes.map(d => `- ${d.nombre}`).join('\n')}`);
      return;
    }

    const enviadas = fasesEnviadas[numero] || [];
    let nuevasFases = [...enviadas];

    if (fase === 'TODAS') {
      nuevasFases = ['ANTES', 'DURANTE', 'FINALIZADA'];
    } else if (!nuevasFases.includes(fase)) {
      nuevasFases.push(fase);
    }

    const nuevas = { ...fasesEnviadas, [numero]: nuevasFases };
    guardarFases(nuevas);
    setTimeout(() => verificarTodasCompletas(), 300);
    alert('✅ Fase enviada correctamente. Quedará en revisión.');
  };

  // ====================== ACCIONES COORDINADOR ======================
  const aprobarDocumentoCoordinador = (fichaNumero, docNombre) => {
    const actuales = evidenciasAprobadas[fichaNumero] || [];
    if (!actuales.includes(docNombre)) {
      const nuevas = { ...evidenciasAprobadas, [fichaNumero]: [...actuales, docNombre] };
      guardarAprobaciones(nuevas);
    }
  };

  // ====================== RENDER ======================
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <h1 className="text-4xl font-bold tracking-tight">Cuentas de Cobro y Evidencias</h1>

      {/* ==================== COORDINADOR / ADMINISTRATIVO ==================== */}
      {esAdmin && (
        <>
          {/* Cargar Macro */}
          <div className="bg-white border border-gray-200 rounded-3xl p-8">
            <h2 className="text-2xl font-semibold mb-6">Cargar Macro de Fichas</h2>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-[#39A900] rounded-3xl p-14 cursor-pointer transition-all hover:bg-green-50/40">
              <Upload size={48} className="text-[#39A900] mb-4" />
              <span className="text-xl font-semibold">Seleccionar archivo Excel</span>
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={async (e) => {
                const archivo = e.target.files[0];
                if (!archivo) return;
                const XLSX = await import('xlsx');
                const reader = new FileReader();
                reader.onload = (evt) => {
                  const data = evt.target.result;
                  const workbook = XLSX.read(data, { type: 'binary' });
                  const hoja = workbook.Sheets[workbook.SheetNames[0]];
                  const json = XLSX.utils.sheet_to_json(hoja);
                  localStorage.setItem('datosMacroFichas', JSON.stringify(json));
                  setDatosMacro(json);
                  alert(`✅ Macro cargada con ${json.length} registros`);
                };
                reader.readAsBinaryString(archivo);
              }} />
            </label>
          </div>

          {/* Subir Plantillas */}
          <div className="bg-white border border-gray-200 rounded-3xl p-8">
            <h2 className="text-2xl font-semibold mb-6">Formatos para Instructores</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {["Planeación Pedagógica", "Formato de Verificación de Ambientes", "Acta de Concertación"].map(nombre => (
                <div key={nombre} className="border border-gray-200 rounded-2xl p-5">
                  <p className="font-semibold mb-4">{nombre}</p>
                  <label className="inline-flex items-center gap-2 bg-[#39A900] hover:bg-[#2d7a00] text-white text-sm font-medium px-5 py-2.5 rounded-2xl cursor-pointer">
                    <Upload size={16} /> Subir / Actualizar
                    <input type="file" className="hidden" onChange={(e) => {
                      const archivo = e.target.files[0];
                      if (!archivo) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const nuevas = { ...plantillas, [nombre]: { nombre: archivo.name, data: ev.target.result } };
                        setPlantillas(nuevas);
                        localStorage.setItem('plantillasFormatos', JSON.stringify(nuevas));
                        alert(`✅ Plantilla guardada: ${nombre}`);
                      };
                      reader.readAsDataURL(archivo);
                    }} />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Carpetas por Instructor */}
          {!instructorSeleccionado && datosMacro.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <Users className="text-[#39A900]" /> Carpetas por Instructor
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Object.entries(
                  datosMacro.reduce((mapa, ficha) => {
                    const nombre = ficha['NOMBRE CORREGIDO MACRO']?.trim() || 'Sin Nombre';
                    if (!mapa[nombre]) mapa[nombre] = [];
                    mapa[nombre].push(ficha);
                    return mapa;
                  }, {})
                ).map(([nombre, fichas]) => (
                  <div 
                    key={nombre} 
                    onClick={() => setInstructorSeleccionado(nombre)}
                    className="bg-white border border-gray-200 rounded-3xl p-6 hover:border-[#39A900] hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{nombre}</h3>
                        <p className="text-4xl font-bold text-[#39A900] mt-2 tracking-tighter">{fichas.length}</p>
                        <p className="text-sm text-gray-500">fichas</p>
                      </div>
                      <FolderOpen size={36} className="text-[#39A900]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de Fichas del Instructor (ordenadas) */}
          {instructorSeleccionado && !fichaSeleccionada && (
            <div className="bg-white border border-gray-200 rounded-3xl p-8">
              <button onClick={() => setInstructorSeleccionado(null)} className="flex items-center gap-2 mb-6 text-gray-600 hover:text-gray-900">
                <ArrowLeft size={18} /> Volver a instructores
              </button>
              <h2 className="text-2xl font-semibold mb-6">{instructorSeleccionado}</h2>

              <div className="space-y-4">
                {datosMacro
                  .filter(f => (f['NOMBRE CORREGIDO MACRO'] || '').trim() === instructorSeleccionado)
                  .sort((a, b) => {
                    const fechaA = a['FECHA DE INICIO'] || a['FECHA DE INICIO '] || 0;
                    const fechaB = b['FECHA DE INICIO'] || b['FECHA DE INICIO '] || 0;
                    return fechaA - fechaB;
                  })
                  .map((ficha, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setFichaSeleccionada(ficha)}
                      className="border border-gray-200 rounded-2xl p-6 hover:border-[#39A900] cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <p className="text-sm text-gray-500">FICHA</p>
                        <p className="text-2xl font-bold">{getFichaNumber(ficha)}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p>Inicio: {ficha['FECHA DE INICIO'] || ficha['FECHA DE INICIO ']}</p>
                        <p className="text-gray-500">Etapa: {determinarEtapaFicha(ficha)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ==================== VISTA COORDINADOR - SOLO REVISIÓN ==================== */}
          {fichaSeleccionada && (
            <div className="bg-white border border-gray-200 rounded-3xl p-8">
              <button onClick={() => setFichaSeleccionada(null)} className="flex items-center gap-2 mb-6 text-gray-600">
                <ArrowLeft size={18} /> Volver
              </button>

              <h2 className="text-2xl font-semibold mb-6">Ficha {getFichaNumber(fichaSeleccionada)}</h2>

              <div className="space-y-4">
                {obtenerDocumentosFase(fichaSeleccionada, 'TODAS').map((doc, index) => {
                  const fichaNum = getFichaNumber(fichaSeleccionada);
                  const evidencia = evidenciasPorFicha[fichaNum]?.[doc.nombre];
                  const yaAprobado = (evidenciasAprobadas[fichaNum] || []).includes(doc.nombre);

                  return (
                    <div key={index} className="border border-gray-200 rounded-2xl p-6 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-lg">{doc.nombre}</p>
                        {evidencia && <p className="text-sm text-gray-500 mt-1">Archivo: {evidencia.nombreArchivo}</p>}
                        {!evidencia && <p className="text-sm text-amber-600 mt-1">Pendiente de carga por el instructor</p>}
                      </div>

                      <div className="flex items-center gap-3">
                        {evidencia && (
                          <>
                            <button 
                              onClick={() => alert(`Abriendo documento: ${doc.nombre}`)}
                              className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-2xl text-sm hover:bg-gray-50"
                            >
                              <Eye size={16} /> Revisar
                            </button>

                            {!yaAprobado ? (
                              <button 
                                onClick={() => aprobarDocumentoCoordinador(fichaNum, doc.nombre)}
                                className="bg-[#39A900] hover:bg-[#2d7a00] text-white px-6 py-2.5 rounded-2xl text-sm font-semibold flex items-center gap-2"
                              >
                                <CheckCircle size={16} /> Aprobar
                              </button>
                            ) : (
                              <div className="bg-green-100 text-green-700 px-5 py-2.5 rounded-2xl text-sm font-semibold flex items-center gap-2">
                                <CheckCircle size={16} /> Aprobado
                              </div>
                            )}

                            <button className="p-3 border border-gray-300 rounded-2xl hover:bg-gray-50">
                              <Download size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-end">
                <button className="bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-2xl font-semibold flex items-center gap-2">
                  <Download size={18} /> Descargar toda la carpeta de esta ficha
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================== INSTRUCTOR ==================== */}
      {!esAdmin && (
        <div className="bg-white border border-gray-200 rounded-3xl p-8">
          <h2 className="text-3xl font-semibold mb-8">Mis Fichas</h2>

          {misFichas.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle size={48} className="mx-auto text-amber-500 mb-4" />
              <p className="text-xl">No tienes fichas asignadas este mes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {misFichas.map((ficha, index) => {
                const numero = getFichaNumber(ficha);
                const enviadas = fasesEnviadas[numero] || [];
                const completada = enviadas.length >= 3;
                const habilitada = fichaHabilitada && getFichaNumber(fichaHabilitada) === numero;

                return (
                  <div 
                    key={index} 
                    onClick={() => habilitada && setFichaSeleccionada(ficha)}
                    className={`border rounded-3xl p-6 transition-all ${habilitada ? 'hover:border-[#39A900] cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                  >
                    <div className="flex justify-between mb-4">
                      <div>
                        <p className="text-xs text-gray-500">FICHA</p>
                        <p className="text-3xl font-bold tracking-tight">{numero}</p>
                      </div>
                      <FolderOpen size={28} className={habilitada ? "text-[#39A900]" : "text-gray-400"} />
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      Etapa: {determinarEtapaFicha(ficha)}
                    </p>

                    {completada ? (
                      <div className="bg-green-100 text-green-700 px-4 py-2 rounded-2xl text-sm font-semibold text-center">
                        Completada ✓
                      </div>
                    ) : habilitada ? (
                      <button className="w-full bg-[#39A900] hover:bg-[#2d7a00] text-white py-3 rounded-2xl font-semibold text-sm">
                        Gestionar Evidencias
                      </button>
                    ) : (
                      <div className="bg-gray-100 text-gray-500 px-4 py-3 rounded-2xl text-sm text-center">
                        Debes completar la ficha anterior primero
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== MODAL INSTRUCTOR (solo si NO es admin) ==================== */}
      {fichaSeleccionada && !esAdmin && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            
            <div className="px-8 py-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold">Ficha {getFichaNumber(fichaSeleccionada)}</h2>
                <p className="text-sm text-gray-500">Etapa actual: {determinarEtapaFicha(fichaSeleccionada)}</p>
              </div>
              <button onClick={() => setFichaSeleccionada(null)} className="text-3xl">×</button>
            </div>

            <div className="p-8 overflow-auto">
              <div className="mb-8">
                <div className="flex justify-between text-sm mb-2 font-medium">
                  <span>Progreso de la ficha</span>
                  <span className="text-[#39A900] font-bold">
                    {Math.round(((fasesEnviadas[getFichaNumber(fichaSeleccionada)] || []).length / 3) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-[#39A900] h-3 rounded-full transition-all" 
                       style={{ width: `${((fasesEnviadas[getFichaNumber(fichaSeleccionada)] || []).length / 3) * 100}%` }}></div>
                </div>
              </div>

              {(() => {
                const fase = obtenerFaseActual(fichaSeleccionada);
                if (!fase) {
                  return <div className="text-center py-12 text-green-600 font-semibold text-xl">Ficha completada ✓</div>;
                }

                const docs = obtenerDocumentosFase(fichaSeleccionada, fase);
                const numero = getFichaNumber(fichaSeleccionada);
                const evidencias = evidenciasPorFicha[numero] || {};
                const yaEnviada = (fasesEnviadas[numero] || []).includes(fase === 'TODAS' ? 'FINALIZADA' : fase);

                const todosConfirmados = docs.every(doc => {
                  const ev = evidencias[doc.nombre];
                  return ev && ev.confirmado;
                });

                if (yaEnviada) {
                  return (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                      <CheckCircle size={48} className="mx-auto text-green-600 mb-4" />
                      <h3 className="text-2xl font-semibold text-green-700">Fase enviada - En revisión</h3>
                      <p className="text-green-600 mt-2">Tus evidencias están siendo revisadas.</p>
                    </div>
                  );
                }

                return (
                  <>
                    <h3 className="text-xl font-semibold mb-6">
                      {fase === 'ANTES' && 'Antes de iniciar la formación'}
                      {fase === 'DURANTE' && 'Durante la formación'}
                      {fase === 'FINALIZADA' && 'Al finalizar la formación'}
                      {fase === 'TODAS' && 'Todas las evidencias pendientes'}
                    </h3>

                    <div className="space-y-4 mb-8">
                      {docs.map((doc, idx) => {
                        const ev = evidencias[doc.nombre];
                        const cargado = !!ev;

                        return (
                          <div key={idx} className={`border rounded-2xl p-6 ${cargado && ev.confirmado ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <p className="font-semibold text-lg">{doc.nombre}</p>
                                {ev && <p className="text-sm text-gray-500 mt-1">Archivo: {ev.nombreArchivo}</p>}
                              </div>

                              <div className="flex items-center gap-3">
                                {doc.esPlantilla && (
                                  <button onClick={() => { /* lógica de descargar plantilla */ }} className="text-sm text-[#39A900] flex items-center gap-1">
                                    <Download size={16} /> Descargar formato
                                  </button>
                                )}

                                {!cargado ? (
                                  <label className="bg-[#39A900] hover:bg-[#2d7a00] text-white px-6 py-2.5 rounded-2xl text-sm font-semibold cursor-pointer flex items-center gap-2">
                                    <Upload size={16} /> Cargar documento
                                    <input type="file" className="hidden" onChange={(e) => {
                                      if (e.target.files[0]) subirEvidencia(fichaSeleccionada, doc.nombre, e.target.files[0]);
                                    }} />
                                  </label>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    {doc.permiteBorrar && (
                                      <button onClick={() => borrarEvidencia(fichaSeleccionada, doc.nombre)} className="text-red-500 p-2">
                                        <Trash2 size={18} />
                                      </button>
                                    )}
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                      <input 
                                        type="checkbox" 
                                        checked={ev.confirmado} 
                                        onChange={() => toggleConfirmacion(fichaSeleccionada, doc.nombre)}
                                        className="w-4 h-4 accent-[#39A900]"
                                      />
                                      Confirmo que el documento es legible y corresponde a lo solicitado.
                                    </label>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button 
                      onClick={() => enviarFase(fichaSeleccionada, fase)}
                      disabled={!todosConfirmados}
                      className={`w-full py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 ${todosConfirmados ? 'bg-[#39A900] hover:bg-[#2d7a00] text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    >
                      <Send size={20} /> Enviar evidencias de esta fase
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ==================== FELICITACIÓN ==================== */}
      {mostrarFelicitacion && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl p-10 max-w-md text-center">
            <CheckCircle size={64} className="mx-auto text-[#39A900] mb-6" />
            <h2 className="text-3xl font-bold mb-4">¡Felicitaciones!</h2>
            <p className="text-lg text-gray-600">Has cargado todas las evidencias requeridas este mes.</p>
            <button onClick={() => setMostrarFelicitacion(false)} className="mt-8 bg-[#39A900] text-white px-8 py-3 rounded-2xl font-semibold">
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CuentasDeCobro;