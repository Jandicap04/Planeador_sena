import { useState } from 'react';
import { Upload, File, X } from 'lucide-react';

let tesseractModule = null;

const obtenerTesseract = async () => {
  if (!tesseractModule) {
    tesseractModule = await import('tesseract.js');
  }
  return tesseractModule;
};

function MiniCarguePersonas({ onPersonasChange, isSubmitting = false }) {
  const [personas, setPersonas] = useState([]);
  const [personaValidandoId, setPersonaValidandoId] = useState(null);

  const normalizarDigitos = (valor) => String(valor || '').replace(/\D/g, '');
  const normalizarTexto = (valor) => String(valor || '').trim().replace(/\s+/g, ' ');
  const compactarTexto = (valor) => normalizarTexto(valor).replace(/[.\s]+/g, '').toUpperCase();

  const obtenerCodigoTipoIdentificacion = (valor) => {
    const limpio = compactarTexto(valor);
    const map = {
      CC: 'CC',
      CEDULADECIUDADANIA: 'CC',
      CEDULADECIUDADANÍA: 'CC',
      TI: 'TI',
      TARJETADEIDENTIDAD: 'TI',
      CE: 'CE',
      CEDULADEEXTRANJERIA: 'CE',
      CEDULADEEXTRANJERÍA: 'CE',
      PA: 'PA',
      PASAPORTE: 'PA',
      RC: 'RC',
      REGISTROCIVIL: 'RC',
      PEP: 'PEP',
      'PERMISOESPECIALDEPERMANENCIA(PEP)': 'PEP',
      PERMISOESPECIALDEPERMANENCIAPEP: 'PEP',
    };
    return map[limpio] || limpio;
  };

  const obtenerEtiquetaTipoIdentificacion = (codigo) => {
    const map = {
      CC: 'Cédula de Ciudadanía',
      TI: 'Tarjeta de Identidad',
      CE: 'Cédula de Extranjería',
      PA: 'Pasaporte',
      RC: 'Registro Civil',
      PEP: 'Permiso Especial de Permanencia (PEP)',
    };
    return map[codigo] || codigo;
  };

  const coincideNumeroIdentificacion = (numeroEsperado, textoFuente) => {
    const esperado = normalizarDigitos(numeroEsperado);
    const fuente = normalizarDigitos(textoFuente);
    return Boolean(esperado) && fuente.includes(esperado);
  };

  const leerArchivoComoDataUrl = (archivo) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => resolve(evt.target?.result || '');
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(archivo);
  });

  const extraerTextoImagen = async (imagenFuente) => {
    const { recognize } = await obtenerTesseract();
    const resultado = await recognize(imagenFuente, 'spa+eng');
    return resultado?.data?.text || '';
  };

  const actualizarPersonas = (nuevasPersonas, metadata = null) => {
    setPersonas(nuevasPersonas);
    if (onPersonasChange) {
      onPersonasChange(
        nuevasPersonas.map(({ id, tipoIdentificacion, tipoIdentificacionLabel, numeroIdentificacion, tipoObligatorio, errorDocumento }) => ({
          id,
          tipoIdentificacion,
          tipoIdentificacionLabel,
          numeroIdentificacion,
          tipoObligatorio,
          errorDocumento,
        })),
        null,
        metadata
      );
    }
  };

  const cargarExcel = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();

      reader.onload = (evt) => {
        try {
          const data = evt.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const hoja = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(hoja);

          if (json.length === 0) {
            alert('❌ El Excel está vacío');
            return;
          }

          let datosLimpios = json.filter(fila => {
            const valores = Object.values(fila);
            return valores.some(v => v && String(v).trim().length > 0);
          });

          if (datosLimpios.length === 0) {
            alert('❌ No hay datos válidos en el Excel');
            return;
          }

          const keys = Object.keys(datosLimpios[0]);
          const primeraFila = datosLimpios[0];
          const primeraEsEncabezado = Object.values(primeraFila).some(v => 
            String(v || '').toLowerCase().includes('identificaci')
          );

          let inicio = primeraEsEncabezado ? 1 : 0;
          const filasPlanoOriginal = datosLimpios.slice(inicio).map((fila) => ({ ...fila }));
          let colTipoID = null;
          let colNumID = null;
          let colTipoPoblacion = null;

          if (primeraEsEncabezado) {
            for (const key of keys) {
              const valor = String(primeraFila[key] || '').toLowerCase();
              
              if (valor.includes('tipo') && valor.includes('identificaci')) {
                colTipoID = key;
              } else if ((valor.includes('numero') || valor.includes('numer')) && valor.includes('identificaci')) {
                colNumID = key;
              } else if (valor.includes('tipo') && (valor.includes('poblacion') || valor.includes('población'))) {
                colTipoPoblacion = key;
              }
            }
          }

          if (!colTipoID) colTipoID = keys[1] || keys[0];
          if (!colNumID) colNumID = keys[2] || keys[1];
          if (!colTipoPoblacion) colTipoPoblacion = keys[3] || keys[4];

          const traducirTipoPoblacion = (valor) => {
            if (!valor) return '';
            const map = {
              'MUJER CABEZA DE FAMILIA': 'Jefe(a) de hogar',
              'MUJER CABEZA DE HOGAR': 'Jefe(a) de hogar',
              'JEFE DE HOGAR': 'Jefe(a) de hogar',
              'TERCERA EDAD': 'Mayores de 60 años',
              'JOVENES VULNERABLES': 'En situación de vulnerabilidad',
              'EMPRENDEDORES': 'Emprendedores',
              'VICTIMA DEL CONFLICTO ARMADO': 'Víctima del conflicto armado',
              'DESPLAZADO': 'Desplazado(a)',
              'NINGUNO': 'Ninguno',
              'DISCAPACITADOS': 'Discapacitados',
              'VISUAL': 'Visual',
              'AUDITIVA': 'Auditiva',
              'INTELECTUAL': 'Intelectual',
              'PSICOSOCIAL': 'Psicosocial',
              'MULTIPLE': 'Múltiple',
              'ASACRE': 'ASACRE',
              'DESPOJO FORZADO DE TIERRAS': 'Despojo forzado de tierras',
              'ACTOS TERRORISTA ATENTADOS COMBATES ENFRENTAMIENTOS HOSTIGAMIENTOS': 'Actos terrorista/atentados/combates/enfrentamientos/hostigamientos',
              'ESVINCULADO DE GRUPOS ARMADOS ORGANIZ': 'Esvinculado de grupos armados organiz',
              'EN CONFLICTO CON LA LEY PENAL': 'En conflicto con la ley penal',
              'TRABAJADOR': 'Trabajador',
              'POR FENOMENOS NATURALES CABEZA DE FAMILIA': 'Por fenómenos naturales / cabeza de familia',
              'POR LA VIOLENCIA': 'Por la violencia',
              'POR LA VIOLENCIA CABEZA DE FAMILIA': 'Por la violencia / cabeza de familia',
            };
            const clean = String(valor)
              .trim()
              .replace(/_/g, ' ')
              .replace(/\s+/g, ' ')
              .replace(/[.,;:\-\/]/g, '')
              .toUpperCase();

            return map[clean] || '';
          };

          const limpiarValorPlano = (valor) => String(valor ?? '').trim().replace(/[.,;:]/g, '').replace(/\s+/g, ' ');

          const filasPlanoNormalizadas = filasPlanoOriginal.map((fila) => {
            const filaLimpia = { ...fila };

            if (colTipoID && filaLimpia[colTipoID] !== undefined) {
              filaLimpia[colTipoID] = limpiarValorPlano(filaLimpia[colTipoID]).toUpperCase();
            }

            if (colNumID && filaLimpia[colNumID] !== undefined) {
              filaLimpia[colNumID] = String(filaLimpia[colNumID] || '').replace(/\D/g, '');
            }

            if (colTipoPoblacion && filaLimpia[colTipoPoblacion] !== undefined) {
              filaLimpia[colTipoPoblacion] = limpiarValorPlano(filaLimpia[colTipoPoblacion]);
            }

            return filaLimpia;
          });

          const personasFormato = filasPlanoNormalizadas.map((fila, idx) => {
            const tipoID = fila[colTipoID];
            const numID = fila[colNumID];
            const tipoPob = fila[colTipoPoblacion];
            const tipoPobRaw = String(tipoPob || '').trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
            const tipoPobTraducido = traducirTipoPoblacion(tipoPob);
            const tipoPobValido = Boolean(tipoPobTraducido);

            if (!tipoID && !numID) return null;

            return {
              id: Date.now() + idx,
              tipoIdentificacion: obtenerCodigoTipoIdentificacion(tipoID),
              tipoIdentificacionLabel: obtenerEtiquetaTipoIdentificacion(obtenerCodigoTipoIdentificacion(tipoID)),
              numeroIdentificacion: String(numID || '').replace(/[^0-9]/g, ''),
              tipoObligatorio: tipoPobValido ? tipoPobTraducido : tipoPobRaw,
              tipoObligatorioValido: tipoPobValido,
              tipoObligatorioOriginal: tipoPobRaw,
              errorDocumento: '',
              documento: null,
              documentoNombre: '',
              documentoMimeType: '',
              documentoPreview: '',
              documentoConfirmado: false,
            };
          }).filter(Boolean);

          if (personasFormato.length === 0) {
            alert('❌ No se encontraron datos válidos en el Excel');
            return;
          }

          actualizarPersonas(personasFormato, {
            headers: keys,
            filas: filasPlanoNormalizadas,
            sheetName: workbook.SheetNames[0] || 'Hoja1',
            columnas: {
              tipoIdentificacion: colTipoID,
              numeroIdentificacion: colNumID,
              tipoPoblacion: colTipoPoblacion,
            },
          });
        } catch (err) {
          console.error('Error detallado:', err);
          alert('❌ Error al procesar el Excel: ' + err.message);
        }
      };

      reader.readAsBinaryString(archivo);
    } catch (err) {
      alert('❌ Error al cargar el archivo: ' + err.message);
    }
  };

  const cargarDocumento = async (personaId, archivo) => {
    if (!archivo) return;
    if (personaValidandoId) return;

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(archivo.type)) {
      alert('❌ Solo se permiten imágenes JPG o PNG para el documento de identidad.');
      return;
    }

    const personaObjetivo = personas.find((persona) => persona.id === personaId);
    if (!personaObjetivo) return;

    const numeroEsperado = normalizarDigitos(personaObjetivo.numeroIdentificacion);
    if (!numeroEsperado) {
      alert('❌ No se encontró número de identificación válido para este aprendiz en el archivo plano.');
      return;
    }

    setPersonaValidandoId(personaId);
    try {
      const [documentoPreview, documentoArrayBuffer] = await Promise.all([
        leerArchivoComoDataUrl(archivo),
        archivo.arrayBuffer(),
      ]);

      let coincideDocumento = coincideNumeroIdentificacion(numeroEsperado, archivo.name);

      if (!coincideDocumento) {
        try {
          const textoImagen = await extraerTextoImagen(documentoPreview);
          coincideDocumento = coincideNumeroIdentificacion(numeroEsperado, textoImagen);
        } catch (ocrError) {
          console.warn('OCR no disponible para esta imagen.', ocrError);
        }
      }

      if (!coincideDocumento) {
        const mensajeError = `Documento incorrecto para ${personaObjetivo.numeroIdentificacion}.`;

        actualizarPersonas(personas.map((persona) => (
          persona.id === personaId
            ? {
              ...persona,
              documento: null,
              documentoNombre: '',
              documentoMimeType: '',
              documentoPreview: '',
              documentoConfirmado: false,
              errorDocumento: mensajeError,
            }
            : persona
        )));
        alert('❌ Necesitamos que sea la misma imagen del documento descrito. Carga la correcta para continuar.');
        return;
      }

      actualizarPersonas(personas.map((persona) => (
        persona.id === personaId
          ? {
            ...persona,
            documento: documentoArrayBuffer,
            documentoNombre: archivo.name,
            documentoMimeType: archivo.type,
            documentoPreview,
            documentoConfirmado: false,
            errorDocumento: '',
          }
          : persona
      )));
    } catch (error) {
      console.error('Error validando imagen del documento:', error);
      actualizarPersonas(personas.map((persona) => (
        persona.id === personaId
          ? {
            ...persona,
            documento: null,
            documentoNombre: '',
            documentoMimeType: '',
            documentoPreview: '',
            documentoConfirmado: false,
            errorDocumento: `No se pudo leer el documento de ${personaObjetivo.numeroIdentificacion}.`,
          }
          : persona
      )));
      alert('❌ No fue posible validar la imagen. Verifica que sea legible y vuelve a cargarla.');
    } finally {
      setPersonaValidandoId(null);
    }
  };

  const eliminarExcel = () => {
    actualizarPersonas([]);
  };

  const eliminarPDF = (personaId) => {
    actualizarPersonas(personas.map(persona =>
      persona.id === personaId
        ? {
          ...persona,
          documento: null,
          documentoNombre: '',
          documentoMimeType: '',
          documentoPreview: '',
          documentoConfirmado: false,
          errorDocumento: '',
        }
        : persona
    ));
  };

  const confirmarDocumento = (personaId) => {
    actualizarPersonas(personas.map((persona) => (
      persona.id === personaId
        ? { ...persona, documentoConfirmado: true }
        : persona
    )));
  };

  const handleGuardar = () => {
    if (personas.length === 0) {
      alert('❌ Debes cargar el archivo plano con los aprendices.');
      return;
    }

    const personasSinDocumento = personas.filter(persona => !persona.documento);
    if (personasSinDocumento.length > 0) {
      alert(`❌ Faltan cargar ${personasSinDocumento.length} documento(s) en imagen. Cada aprendiz debe tener su documento.`);
      return;
    }

    const personasSinConfirmacion = personas.filter((persona) => !persona.documentoConfirmado);
    if (personasSinConfirmacion.length > 0) {
      alert('❌ Revisa la previsualización y confirma visualmente cada documento antes de continuar.');
      return;
    }

    const personasConError = personas.filter((persona) => persona.errorDocumento);
    if (personasConError.length > 0) {
      const detalle = personasConError.map((persona) => persona.numeroIdentificacion).join(', ');
      alert(`❌ Hay documentos con error o sin lectura válida: ${detalle}. Corrige esos archivos antes de continuar.`);
      return;
    }

    // Enviar documentos en orden junto con datos de personas
    if (onPersonasChange) {
      const personasNormalizadas = personas.map(({ id, tipoIdentificacion, tipoIdentificacionLabel, numeroIdentificacion, tipoObligatorio, documento, documentoNombre, documentoMimeType, documentoPreview, errorDocumento, documentoConfirmado }) => ({
          id,
          tipoIdentificacion,
          tipoIdentificacionLabel,
          numeroIdentificacion,
          tipoObligatorio,
          documento,
          documentoNombre,
          documentoMimeType,
          documentoPreview,
          errorDocumento,
          documentoConfirmado,
        }));

      onPersonasChange(personasNormalizadas, personasNormalizadas);
    }

    alert('✅ Archivo plano e imágenes de documentos cargadas correctamente');
  };

  const totalEsperado = personas.length;
  const totalConfirmados = personas.filter((persona) => persona.documentoConfirmado).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">📋 Archivo Plano + Documentos de Identidad</h3>
        <p className="text-sm text-gray-600">
          Total cargado desde archivo plano: <strong className="text-blue-600">{totalEsperado} personas</strong>
        </p>
      </div>

      {/* Paso 1: Cargar Excel */}
      <div className="space-y-3">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-blue-800 mb-3">1️⃣ Archivo plano (Excel)</p>
          {personas.length === 0 ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 rounded-xl p-6 cursor-pointer hover:bg-blue-100 transition-colors">
              <Upload className="text-blue-600 mb-2" size={28} />
              <span className="text-sm font-semibold text-blue-700">Súbelo aquí</span>
              <span className="text-xs text-blue-600 mt-1">Formato SENA (Excel con Tipo_Identificación, Número_Identificación, Tipo_Población)</span>
              <input type="file" accept=".xlsx,.xls" onChange={cargarExcel} className="hidden" />
            </label>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-700 font-semibold">✅ {personas.length} personas cargadas</p>
                  <p className="text-xs text-green-600 mt-1">En el orden del archivo</p>
                </div>
                <button
                  type="button"
                  onClick={eliminarExcel}
                  className="text-red-600 hover:text-red-700"
                  title="Cargar otro archivo"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Paso 2: Cargar imágenes en orden */}
        {personas.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-4">2️⃣ Documentos de identidad (en orden del archivo plano)</p>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {personas.map((persona, idx) => (
                <div
                  key={persona.id}
                  className={`rounded-xl p-3 border ${
                    persona.errorDocumento
                      ? 'bg-red-50 border-red-200'
                      : persona.documento
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white border-amber-200'
                  }`}
                >
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-800">{idx + 1}. {persona.numeroIdentificacion} - {persona.tipoIdentificacionLabel || persona.tipoIdentificacion}</p>
                    <p className="text-xs text-gray-600">
                      {persona.tipoObligatorio || 'Tipo de población no reconocido'}
                      {!persona.tipoObligatorioValido && persona.tipoObligatorioOriginal ? (
                        <span className="text-red-600 font-semibold"> (Original: {persona.tipoObligatorioOriginal})</span>
                      ) : null}
                    </p>
                    {persona.documento && !persona.errorDocumento && (
                      <p className="text-xs text-green-700 font-semibold mt-1">
                        {persona.documentoConfirmado ? 'Documento validado y confirmado' : 'Coincidencia detectada, falta confirmación visual'}
                      </p>
                    )}
                    {persona.errorDocumento && (
                      <p className="text-xs text-red-700 font-semibold mt-1">Documento con error</p>
                    )}
                  </div>

                  <label className={`flex items-center gap-3 px-3 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
                    persona.errorDocumento
                      ? 'bg-red-50 border-red-300 hover:bg-red-100'
                      : persona.documento
                        ? 'bg-green-50 border-green-300 hover:bg-green-100'
                        : 'bg-white border-amber-300 hover:bg-amber-50'
                  }`}>
                    <File size={18} className={persona.errorDocumento ? 'text-red-600' : persona.documento ? 'text-green-600' : 'text-amber-600'} />
                    <div className="flex-1 min-w-0">
                      {persona.errorDocumento ? (
                        <div>
                          <p className="text-xs font-semibold text-red-700 truncate">❌ Volver a cargar imagen</p>
                        </div>
                      ) : persona.documento ? (
                        <div>
                          <p className="text-xs font-semibold text-green-700 truncate">✅ {persona.documentoNombre}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-semibold text-amber-700">Subir imagen del documento</p>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      disabled={personaValidandoId === persona.id}
                      onChange={(e) => cargarDocumento(persona.id, e.target.files[0])}
                    />
                  </label>

                  {personaValidandoId === persona.id && (
                    <p className="text-xs text-blue-700 mt-2">Validando imagen del documento...</p>
                  )}

                  {persona.errorDocumento && (
                    <p className="text-xs text-red-600 mt-2">{persona.errorDocumento}</p>
                  )}

                  {persona.documentoPreview && !persona.errorDocumento && (
                    <div className="mt-3 space-y-3">
                      <VistaPreviaDocumentoImagen previewSrc={persona.documentoPreview} numeroIdentificacion={persona.numeroIdentificacion} />

                      {persona.documentoConfirmado ? (
                        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                          <p className="text-xs font-semibold text-green-700">
                            Confirmaste que la vista previa coincide con la cédula {persona.numeroIdentificacion}.
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 space-y-2">
                          <p className="text-xs font-semibold text-blue-800">
                            Se encontró coincidencia con la cédula {persona.numeroIdentificacion}. ¿Estás seguro de que son iguales?
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => confirmarDocumento(persona.id)}
                              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              Sí, confirmar documento
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarPDF(persona.id)}
                              className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              No, volver a cargar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {persona.documento && (
                    <button
                      type="button"
                      onClick={() => eliminarPDF(persona.id)}
                      className="w-full mt-2 text-red-600 hover:text-red-700 text-xs font-semibold py-1"
                    >
                      ✕ Eliminar documento
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Resumen */}
      {personas.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-slate-800 font-semibold text-sm">Progreso:</p>
            <span className="text-blue-600 font-bold">
              {totalConfirmados}/{personas.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${(totalConfirmados / personas.length) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Botón Final */}
      <button
        onClick={handleGuardar}
        disabled={isSubmitting || personas.length === 0 || personas.some((persona) => !persona.documento || !persona.documentoConfirmado)}
        className={`w-full py-3 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 ${
          isSubmitting || personas.length === 0 || personas.some((persona) => !persona.documento || !persona.documentoConfirmado)
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {personas.some((persona) => !persona.documento)
          ? '⏳ Falta cargar imágenes'
          : personas.some((persona) => !persona.documentoConfirmado)
            ? '👀 Falta confirmar documentos'
            : '✓ Validar y Continuar'}
      </button>
    </div>
  );
}

function VistaPreviaDocumentoImagen({ previewSrc, numeroIdentificacion }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-700">
          Vista previa del documento {numeroIdentificacion}
        </p>
        <span className="text-[11px] text-slate-500">Imagen cargada</span>
      </div>

      <div className="rounded-lg border border-slate-300 bg-white p-2 min-h-40 overflow-auto">
        <img
          src={previewSrc}
          alt={`Documento ${numeroIdentificacion}`}
          className="block h-auto max-h-[32rem] w-auto max-w-full mx-auto rounded shadow-sm object-contain"
        />

        <p className="mt-3 text-[11px] text-slate-500 text-center">
          Revisa que la foto y el número del documento correspondan a la persona antes de confirmar.
        </p>
      </div>
    </div>
  );
}

export default MiniCarguePersonas;
