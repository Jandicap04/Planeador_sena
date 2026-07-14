import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { PDFDocument } from 'pdf-lib';
import { useState, useEffect } from 'react';
import usuarios from '../data/usuarios';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import { Plus, Download } from 'lucide-react';
import MiniCarguePersonas from '../components/MiniCarguePersonas';
import { supabase, isSupabaseConfigured, supabaseConfigErrorMessage } from '../lib/supabase';
import { enviarVerificacionAlistamiento } from '../lib/alertasService';

const PROGRAMAS_TABLE = import.meta.env.VITE_SUPABASE_PROGRAMAS_TABLE || 'programa';

function Planeador() {
  const [usuario] = useState(JSON.parse(localStorage.getItem('usuarioLogueado')));

  const [eventosHistorial, setEventosHistorial] = useState([]);
  const [eventosPlaneador, setEventosPlaneador] = useState([]);
  const [excelDescargado, setExcelDescargado] = useState(false);
  const [personasInscritas, setPersonasInscritas] = useState([]);
  const [planoAprendicesData, setPlanoAprendicesData] = useState(null);
  const [pdfDocumentosIdentidad, setPdfDocumentosIdentidad] = useState(null);
  const [pdfNombreDocumentos, setPdfNombreDocumentos] = useState('');
  const [adjuntosCorreo, setAdjuntosCorreo] = useState([]);
  const [programaQuery, setProgramaQuery] = useState('');
  const [programas, setProgramas] = useState([]);
  const [programasAbierto, setProgramasAbierto] = useState(false);
  const [cargandoProgramas, setCargandoProgramas] = useState(false);
  const [errorProgramas, setErrorProgramas] = useState('');
  const [competenciaQuery, setCompetenciaQuery] = useState('');
  const [competencias, setCompetencias] = useState([]);
  const [competenciasAbierto, setCompetenciasAbierto] = useState(false);
  const [cargandoCompetencias, setCargandoCompetencias] = useState(false);
  const [errorCompetencias, setErrorCompetencias] = useState('');
  const [notificacionCorreo, setNotificacionCorreo] = useState({
    visible: false,
    tipo: 'info',
    mensaje: '',
  });

  const [nuevoEvento, setNuevoEvento] = useState({
    tipoFormacion: '',
    codigoPrograma: '',
    programa: '',
    programaNombre: '',
    codigoCompetencia: '',
    title: '',
    competenciaNombre: '',
    ciudad: '',
    municipio: '',
    lugar: '',
    direccion: '',
    ambiente: '',
    horasPrograma: '',
    startTime: '08:00',
    endTime: '10:00',
  });

  useEffect(() => {
    if (usuario) {
      const guardados = JSON.parse(localStorage.getItem(`eventos_${usuario.id}`)) || [];
      setEventosHistorial(guardados);
    }
  }, [usuario]);

  useEffect(() => {
    if (!notificacionCorreo.visible) return;

    const timeoutId = setTimeout(() => {
      setNotificacionCorreo((prev) => ({ ...prev, visible: false }));
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [notificacionCorreo.visible]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setProgramas([]);
      setCargandoProgramas(false);
      setErrorProgramas(supabaseConfigErrorMessage);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const termino = programaQuery.trim();

      setCargandoProgramas(true);
      setErrorProgramas('');

      try {
        const [porNombre, listadoBase] = await Promise.all([
          termino
            ? supabase
                .from(PROGRAMAS_TABLE)
                .select('codigo_programa, nombre_programa')
                .ilike('nombre_programa', `%${termino}%`)
            : Promise.resolve({ data: [], error: null }),
          supabase
            .from(PROGRAMAS_TABLE)
            .select('codigo_programa, nombre_programa')
            .order('nombre_programa', { ascending: true })
            .limit(200)
        ]);

        if (porNombre.error) throw porNombre.error;
        if (listadoBase.error) throw listadoBase.error;

        const filtradosPorCodigo = termino
          ? (listadoBase.data || []).filter((item) =>
              normalizarTexto(item.codigo_programa).includes(normalizarTexto(termino))
            )
          : listadoBase.data || [];

        const combinados = unirUnicos(
          [...(porNombre.data || []), ...filtradosPorCodigo],
          'codigo_programa'
        ).slice(0, 10);

        setProgramas(combinados);
      } catch (error) {
        setProgramas([]);
        setErrorProgramas(error.message || 'No fue posible cargar los programas.');
      } finally {
        setCargandoProgramas(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [programaQuery]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCompetencias([]);
      setCargandoCompetencias(false);
      setErrorCompetencias(supabaseConfigErrorMessage);
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (!nuevoEvento.codigoPrograma) {
        setCompetencias([]);
        setErrorCompetencias('');
        setCargandoCompetencias(false);
        return;
      }

      const termino = competenciaQuery.trim();

      setCargandoCompetencias(true);
      setErrorCompetencias('');

      try {
        const codigoPrograma = Number(nuevoEvento.codigoPrograma);

        const [porNombre, listadoBase] = await Promise.all([
          termino
            ? supabase
                .from('programa_competencia')
                .select('duracion_horas, codigo_programa, codigo_competencia, competencia!inner(codigo_competencia, denominacion_competencia)')
                .eq('codigo_programa', codigoPrograma)
                .ilike('competencia.denominacion_competencia', `%${termino}%`)
            : Promise.resolve({ data: [], error: null }),
          supabase
            .from('programa_competencia')
            .select('duracion_horas, codigo_programa, codigo_competencia, competencia!inner(codigo_competencia, denominacion_competencia)')
            .eq('codigo_programa', codigoPrograma)
            .order('codigo_competencia', { ascending: true })
            .limit(200)
        ]);

        if (porNombre.error) throw porNombre.error;
        if (listadoBase.error) throw listadoBase.error;

        const baseNormalizada = (listadoBase.data || []).map((item) => ({
          codigo_competencia: item.codigo_competencia,
          denominacion_competencia: item.competencia?.denominacion_competencia || '',
          duracion_horas: item.duracion_horas,
        }));

        const filtradosPorCodigo = termino
          ? baseNormalizada.filter((item) =>
              normalizarTexto(item.codigo_competencia).includes(normalizarTexto(termino))
            )
          : baseNormalizada;

        const filtradosPorNombre = (porNombre.data || []).map((item) => ({
          codigo_competencia: item.codigo_competencia,
          denominacion_competencia: item.competencia?.denominacion_competencia || '',
          duracion_horas: item.duracion_horas,
        }));

        const combinados = unirUnicos(
          [...filtradosPorNombre, ...filtradosPorCodigo],
          'codigo_competencia'
        ).slice(0, 10);

        setCompetencias(combinados);
      } catch (error) {
        setCompetencias([]);
        setErrorCompetencias(error.message || 'No fue posible cargar las competencias.');
      } finally {
        setCargandoCompetencias(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [competenciaQuery, nuevoEvento.codigoPrograma]);

  // === FUNCIÓN SEGURA PARA OBTENER EVENTOS DE TODOS LOS INSTRUCTORES ===
  const obtenerTodosLosEventosGlobales = () => {
    const listaUsuarios = usuarios || [];
    let todosLosEventos = [];

    listaUsuarios.forEach(user => {
      if (user.rol === 'instructor') {
        const eventos = JSON.parse(localStorage.getItem(`eventos_${user.id}`)) || [];
        eventos.forEach(ev => {
          todosLosEventos.push(ev);
        });
      }
    });

    return todosLosEventos;
  };

  // === VALIDACIÓN DE AMBIENTE A NIVEL GLOBAL ===
  const hayConflictoAmbiente = (fecha, inicio, fin, ambiente) => {
    if (!ambiente) return false;

    const todosLosEventos = obtenerTodosLosEventosGlobales();

    return todosLosEventos.some((evento) => {
      const props = evento.extendedProps || {};
      if (props.tipoFormacion !== 'Titulada' || props.ambiente !== ambiente) return false;

      const fechaEvento = new Date(evento.start).toISOString().split('T')[0];
      if (fechaEvento !== fecha) return false;

      const inicioExistente = new Date(evento.start);
      const finExistente = new Date(evento.end);
      return (inicio < finExistente && fin > inicioExistente);
    });
  };

  const hayCruceHorario = (fecha, inicio, fin) => {
    return eventosHistorial.some((evento) => {
      const fechaEvento = new Date(evento.start).toISOString().split('T')[0];
      if (fechaEvento !== fecha) return false;
      const inicioExistente = new Date(evento.start);
      const finExistente = new Date(evento.end);
      return (inicio < finExistente && fin > inicioExistente);
    });
  };

  const calcularHorasTotales = () => {
    let total = 0;
    eventosPlaneador.forEach(ev => {
      total += (new Date(ev.end) - new Date(ev.start)) / (1000 * 60 * 60);
    });
    return total;
  };

  const cambiarTipoFormacion = (tipo) => {
    setNuevoEvento(prev => ({
      ...prev,
      tipoFormacion: tipo,
      ciudad: tipo === 'Titulada' ? '' : prev.ciudad,
      municipio: tipo === 'Titulada' ? '' : prev.municipio,
      ambiente: tipo === 'Area Complementaria' ? '' : prev.ambiente,
    }));
  };

  const normalizarTexto = (valor) => String(valor ?? '').toLowerCase().trim();

  const unirUnicos = (items, llave) => {
    const mapa = new Map();
    items.forEach((item) => {
      const key = String(item?.[llave] ?? '');
      if (key) mapa.set(key, item);
    });
    return Array.from(mapa.values());
  };

  const formatearPrograma = (programa) => `${programa.codigo_programa} - ${programa.nombre_programa}`;

  const formatearCompetencia = (competencia) => `${competencia.codigo_competencia} - ${competencia.denominacion_competencia}`;

  const resolverDestinatarioCorreo = (usuarioLogueado = usuario, usuarioCatalogo = null) => {
    const rol = String(usuarioLogueado?.rol || usuarioCatalogo?.rol || '').trim().toLowerCase();
    const correoUsuario = usuarioLogueado?.email || usuarioLogueado?.correo_electronico || usuarioCatalogo?.email || '';

    if (correoUsuario) {
      return correoUsuario;
    }

    if (rol === 'coordinador') {
      return 'coordinacion@sena.edu.co';
    }

    if (rol === 'administrativo') {
      return 'administrativos@sena.edu.co';
    }

    return 'coordinacion@sena.edu.co';
  };

  const generarArchivosPlaneador = () => {
    const datosExcel = eventosPlaneador.map(ev => {
      const fecha = new Date(ev.start).toISOString().split('T')[0];
      const props = ev.extendedProps || {};
      return {
        Tipo_Formacion: props.tipoFormacion || '',
        Programa: props.programa || '',
        Codigo_Programa: props.codigoPrograma || '',
        Competencia: props.competencia || '',
        Codigo_Competencia: props.codigoCompetencia || '',
        Lugar: props.lugar || '',
        Direccion: props.direccion || '',
        Ambiente: props.ambiente || '',
        Ciudad: props.ciudad || '',
        Municipio: props.municipio || '',
        Horas_Programa: props.horasPrograma || '',
        Fecha: fecha,
        Hora_Inicio: new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        Hora_Fin: new Date(ev.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    });

    const wsPlaneador = XLSX.utils.json_to_sheet(datosExcel);
    const wbPlaneador = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbPlaneador, wsPlaneador, 'Planeador');
    const bufferPlaneador = XLSX.write(wbPlaneador, { bookType: 'xlsx', type: 'array' });

    const normalizarValorPlano = (valor) => String(valor ?? '').trim().replace(/[.,;:]/g, '').replace(/\s+/g, ' ');
    const normalizarIdentificacionPlano = (valor) => String(valor ?? '').replace(/[.\s]+/g, '').toUpperCase();
    const normalizarNumeroIdentificacionPlano = (valor) => String(valor ?? '').replace(/\D/g, '');
    const normalizarPoblacionPlano = (valor) => String(valor ?? '').trim().replace(/[.,;:]/g, '').replace(/\s+/g, ' ');

    let datosAprendices = [];
    let headersPlano = [];
    let sheetNameAprendices = 'Aprendices';

    if (planoAprendicesData?.filas?.length > 0 && Array.isArray(planoAprendicesData.headers)) {
      headersPlano = planoAprendicesData.headers;
      sheetNameAprendices = planoAprendicesData.sheetName || 'Aprendices';

      datosAprendices = planoAprendicesData.filas.map((fila) => {
        const filaLimpia = { ...fila };
        const colTipoIdentificacion = planoAprendicesData.columnas?.tipoIdentificacion;
        const colNumeroIdentificacion = planoAprendicesData.columnas?.numeroIdentificacion;
        const colTipoPoblacion = planoAprendicesData.columnas?.tipoPoblacion;

        if (colTipoIdentificacion && filaLimpia[colTipoIdentificacion] !== undefined) {
          filaLimpia[colTipoIdentificacion] = normalizarIdentificacionPlano(filaLimpia[colTipoIdentificacion]);
        }

        if (colNumeroIdentificacion && filaLimpia[colNumeroIdentificacion] !== undefined) {
          filaLimpia[colNumeroIdentificacion] = normalizarNumeroIdentificacionPlano(filaLimpia[colNumeroIdentificacion]);
        }

        if (colTipoPoblacion && filaLimpia[colTipoPoblacion] !== undefined) {
          filaLimpia[colTipoPoblacion] = normalizarPoblacionPlano(filaLimpia[colTipoPoblacion]);
        }

        return filaLimpia;
      });
    } else if (personasInscritas && personasInscritas.length > 0) {
      datosAprendices = personasInscritas.map(persona => ({
        'Resultado del Registro (Reservado para el sistema)': '',
        'Tipo de Identificación': normalizarIdentificacionPlano(persona.tipoIdentificacion),
        'Numero de Identificación': normalizarNumeroIdentificacionPlano(persona.numeroIdentificacion),
        'Código de la ficha': '',
        'Tipo Población Aspirante': normalizarValorPlano(persona.tipoObligatorio),
        'Tipo de Organización': '',
        'Codigo Empresa (Solo si la ficha es cerrada)': '',
      }));

      headersPlano = [
        'Resultado del Registro (Reservado para el sistema)',
        'Tipo de Identificación',
        'Numero de Identificación',
        'Código de la ficha',
        'Tipo Población Aspirante',
        'Tipo de Organización',
        'Codigo Empresa (Solo si la ficha es cerrada)',
      ];
    } else {
      datosAprendices = Array.from({ length: 1 }, () => ({
        'Resultado del Registro (Reservado para el sistema)': '',
        'Tipo de Identificación': '',
        'Numero de Identificación': '',
        'Código de la ficha': '',
        'Tipo Población Aspirante': '',
        'Tipo de Organización': '',
        'Codigo Empresa (Solo si la ficha es cerrada)': '',
      }));

      headersPlano = [
        'Resultado del Registro (Reservado para el sistema)',
        'Tipo de Identificación',
        'Numero de Identificación',
        'Código de la ficha',
        'Tipo Población Aspirante',
        'Tipo de Organización',
        'Codigo Empresa (Solo si la ficha es cerrada)',
      ];
    }

    const wsAprendices = XLSX.utils.aoa_to_sheet(
      headersPlano.length > 0
        ? [headersPlano, ...datosAprendices.map((fila) => headersPlano.map((header) => fila[header] ?? ''))]
        : []
    );

    wsAprendices['!cols'] = headersPlano.map(() => ({ wch: 24 }));

    const wbAprendices = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wbAprendices, wsAprendices, sheetNameAprendices || 'Aprendices');
    const bufferAprendices = XLSX.write(wbAprendices, { bookType: 'xlsx', type: 'array' });

    const nombreInstructor = usuario?.nombre || 'Instructor';
    return {
      bufferPlaneador,
      bufferAprendices,
      bufferDocumentos: pdfDocumentosIdentidad,
      nombrePlaneador: `Planeador_${nombreInstructor}.xlsx`,
      nombreAprendices: `Plano_Aprendices_${nombreInstructor}.xlsx`,
      nombreDocumentos: `Documentos_Identidad_${nombreInstructor}.pdf`,
    };
  };

  const seleccionarPrograma = (programa) => {
    const etiqueta = formatearPrograma(programa);
    const codigoPrograma = String(programa.codigo_programa ?? '');

    setNuevoEvento(prev => ({
      ...prev,
      codigoPrograma,
      programa: codigoPrograma,
      programaNombre: etiqueta,
      codigoCompetencia: '',
      title: '',
      competenciaNombre: '',
      horasPrograma: '',
    }));

    setProgramaQuery(etiqueta);
    setCompetenciaQuery('');
    setCompetencias([]);
    setCompetenciasAbierto(false);
    setProgramasAbierto(false);
    setErrorCompetencias('');
  };

  const seleccionarCompetencia = (competencia) => {
    const etiqueta = formatearCompetencia(competencia);
    const codigoCompetencia = String(competencia.codigo_competencia ?? '');

    setNuevoEvento(prev => ({
      ...prev,
      codigoCompetencia,
      title: codigoCompetencia,
      competenciaNombre: etiqueta,
      horasPrograma: competencia.duracion_horas || '',
    }));

    setCompetenciaQuery(etiqueta);
    setCompetenciasAbierto(false);
  };

  const handleProgramaInput = (e) => {
    const valor = e.target.value;

    setProgramaQuery(valor);
    setProgramasAbierto(true);

    if (valor !== programaQuery) {
      setNuevoEvento(prev => ({
        ...prev,
        codigoPrograma: '',
        programa: '',
        programaNombre: '',
        codigoCompetencia: '',
        title: '',
        competenciaNombre: '',
        horasPrograma: '',
      }));
      setCompetenciaQuery('');
      setCompetencias([]);
      setCompetenciasAbierto(false);
      setErrorCompetencias('');
    }
  };

  const handleCompetenciaInput = (e) => {
    const valor = e.target.value;

    setCompetenciaQuery(valor);
    setCompetenciasAbierto(true);

    if (valor !== competenciaQuery) {
      setNuevoEvento(prev => ({
        ...prev,
        codigoCompetencia: '',
        title: '',
        competenciaNombre: '',
        horasPrograma: '',
      }));
    }
  };

  const handleChange = (e) => {
    if (excelDescargado) {
      alert('❌ Ya descargaste el Excel. Ahora debes agregar al cronograma.');
      return;
    }
    if (e.target.name === 'horasPrograma' && Number(e.target.value) < 0) {
      alert('❌ No puedes ingresar números negativos');
      return;
    }
    setNuevoEvento({ ...nuevoEvento, [e.target.name]: e.target.value });
  };

  const handleSelect = (info) => {
    if (excelDescargado) {
      alert('❌ Ya descargaste el Excel. Ahora debes agregar al cronograma.');
      return;
    }

    if (!nuevoEvento.tipoFormacion) {
      alert('❌ Primero debes seleccionar el tipo de formación (Titulada o Área Complementaria)');
      return;
    }

    const requiereAmbiente = nuevoEvento.tipoFormacion === 'Titulada' && !nuevoEvento.ambiente;
    const requiereCiudad = nuevoEvento.tipoFormacion === 'Area Complementaria' && !nuevoEvento.ciudad;

    if (!nuevoEvento.codigoPrograma || !nuevoEvento.codigoCompetencia || !nuevoEvento.lugar || !nuevoEvento.direccion || !nuevoEvento.horasPrograma || requiereAmbiente || requiereCiudad) {
      alert('❌ Por favor completa todos los campos obligatorios');
      return;
    }

    const fecha = info.startStr.split('T')[0];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (new Date(fecha) < hoy) {
      alert('❌ No puedes seleccionar fechas anteriores');
      return;
    }

    const inicio = info.allDay ? new Date(`${fecha}T${nuevoEvento.startTime}`) : new Date(info.start);
    const fin = info.allDay ? new Date(`${fecha}T${nuevoEvento.endTime}`) : new Date(info.end);

    // VALIDACIÓN GLOBAL DE AMBIENTE
    if (nuevoEvento.tipoFormacion === 'Titulada' && nuevoEvento.ambiente) {
      if (hayConflictoAmbiente(fecha, inicio, fin, nuevoEvento.ambiente)) {
        alert(`❌ El ambiente "${nuevoEvento.ambiente}" ya está ocupado en ese horario.\n\nOtro instructor ya tiene formación programada en el mismo ambiente y horario.`);
        return;
      }
    }

    if (hayCruceHorario(fecha, inicio, fin)) {
      alert('❌ Ya tienes programación en ese horario');
      return;
    }

    const nuevoEventoTemp = {
      id: Date.now() + Math.random(),
      title: `${nuevoEvento.programaNombre || nuevoEvento.programa} - ${nuevoEvento.competenciaNombre || nuevoEvento.title}`,
      start: info.allDay ? `${fecha}T${nuevoEvento.startTime}` : info.start,
      end: info.allDay ? `${fecha}T${nuevoEvento.endTime}` : info.end,
      backgroundColor: '#D9F99D',
      borderColor: '#65A30D',
      textColor: '#000',
      extendedProps: {
        tipoFormacion: nuevoEvento.tipoFormacion,
        codigoPrograma: nuevoEvento.codigoPrograma,
        programa: nuevoEvento.programaNombre || nuevoEvento.programa,
        codigoCompetencia: nuevoEvento.codigoCompetencia,
        competencia: nuevoEvento.competenciaNombre || nuevoEvento.title,
        lugar: nuevoEvento.lugar,
        direccion: nuevoEvento.direccion,
        horasPrograma: nuevoEvento.horasPrograma,
        ciudad: nuevoEvento.ciudad || '',
        municipio: nuevoEvento.municipio || '',
        ambiente: nuevoEvento.ambiente || '',
        numeroAprendices: personasInscritas.length || '',
        personas: personasInscritas,
      }
    };

    const horasActuales = calcularHorasTotales();
    const horasNuevo = (new Date(nuevoEventoTemp.end) - new Date(nuevoEventoTemp.start)) / (1000 * 60 * 60);

    if (horasActuales + horasNuevo > Number(nuevoEvento.horasPrograma)) {
      alert(`❌ Superas las ${nuevoEvento.horasPrograma} horas del programa`);
      return;
    }

    setEventosPlaneador([...eventosPlaneador, nuevoEventoTemp]);
  };

  const handleEliminarEvento = (info) => {
    if (excelDescargado) {
      alert('❌ No puedes eliminar eventos después de descargar el Excel');
      return;
    }
    if (!confirm('¿Deseas eliminar esta programación?')) return;
    setEventosPlaneador(eventosPlaneador.filter(e => String(e.id) !== String(info.event.id)));
  };

  const agregarEvento = async () => {
    if (!excelDescargado) {
      alert('❌ Primero debes descargar el Excel');
      return;
    }
    const horasProgramadas = calcularHorasTotales();
    if (horasProgramadas !== Number(nuevoEvento.horasPrograma)) {
      alert(`❌ Debes completar exactamente ${nuevoEvento.horasPrograma} horas`);
      return;
    }

    let estadoCorreo = '';

    const usuarioRelacionado = (usuarios || []).find(
      (u) => String(u?.id ?? '') === String(usuario?.id ?? '')
    );

    const correoDestino = resolverDestinatarioCorreo(usuario, usuarioRelacionado);
    const nombreDestinatario = usuario?.nombre || usuario?.usuario || 'Coordinador';

    if (correoDestino && !usuario?.email) {
      localStorage.setItem(
        'usuarioLogueado',
        JSON.stringify({
          ...usuario,
          email: correoDestino,
        })
      );
    }

    if (correoDestino) {
      try {
        if (adjuntosCorreo.length === 0) {
          throw new Error('Debes descargar primero los archivos del planeador para adjuntarlos al correo.');
        }

        const resultadoCorreo = await enviarVerificacionAlistamiento({
          instructor: {
            nombreCompleto: usuario.nombre || usuario.usuario || 'Instructor',
            correoElectronico: correoDestino,
          },
          destinatario: correoDestino,
          destinatarioNombre: nombreDestinatario,
          programaNombre: nuevoEvento.programaNombre || nuevoEvento.programa,
          horasProgramadas,
          horasObjetivo: Number(nuevoEvento.horasPrograma || 0),
          eventos: eventosPlaneador,
          adjuntos: adjuntosCorreo,
        });

        if (resultadoCorreo?.skipped) {
          estadoCorreo = '⚠️ Correo no enviado: falta VITE_ALERTAS_API_BASE_URL en frontend/.env.';
          setNotificacionCorreo({
            visible: true,
            tipo: 'warning',
            mensaje: estadoCorreo,
          });
        } else {
          estadoCorreo = `📧 Correo enviado a ${correoDestino}${resultadoCorreo?.messageId ? ` (id: ${resultadoCorreo.messageId})` : ''}.`;
          setNotificacionCorreo({
            visible: true,
            tipo: 'success',
            mensaje: estadoCorreo,
          });
        }
      } catch (error) {
        console.error(error);
        estadoCorreo = `⚠️ Correo no enviado: ${error.message}`;
        setNotificacionCorreo({
          visible: true,
          tipo: 'error',
          mensaje: estadoCorreo,
        });
      }
    } else {
      estadoCorreo = '⚠️ Correo no enviado: el usuario actual no tiene email registrado.';
      setNotificacionCorreo({
        visible: true,
        tipo: 'warning',
        mensaje: estadoCorreo,
      });
    }

    const historialActualizado = [...eventosHistorial, ...eventosPlaneador];
    setEventosHistorial(historialActualizado);
    localStorage.setItem(`eventos_${usuario.id}`, JSON.stringify(historialActualizado));

    setEventosPlaneador([]);
    setExcelDescargado(false);
    setPersonasInscritas([]);
    setPlanoAprendicesData(null);
    setPdfDocumentosIdentidad(null);
    setPdfNombreDocumentos('');
    setAdjuntosCorreo([]);
    setNuevoEvento({
      tipoFormacion: '', codigoPrograma: '', programa: '', programaNombre: '', codigoCompetencia: '', title: '', competenciaNombre: '',
      ciudad: '', municipio: '', lugar: '', direccion: '', ambiente: '',
      horasPrograma: '', startTime: '08:00', endTime: '10:00',
    });
    setProgramaQuery('');
    setCompetenciaQuery('');
    setProgramas([]);
    setCompetencias([]);
    setProgramasAbierto(false);
    setCompetenciasAbierto(false);

    alert(`✅ Programación agregada correctamente${estadoCorreo ? `\n${estadoCorreo}` : ''}`);
  };

  const handlePersonasChange = async (personas, personasConPDF = null, planoMetadata = null) => {
    setPersonasInscritas(personas);
    setPlanoAprendicesData(planoMetadata || null);
    
    // Si vienen con documentos, convertirlos/concatenarlos en orden al PDF final
    if (personasConPDF && personasConPDF.length > 0) {
      const personasConDocumentos = personasConPDF.filter((p) => p.documento || p.pdf);
      
      if (personasConDocumentos.length > 0) {
        try {
          const pdfFinal = await PDFDocument.create();
          
          for (const persona of personasConDocumentos) {
            if (persona.documento) {
              const imagenBytes = new Uint8Array(persona.documento);
              const mimeType = String(persona.documentoMimeType || '').toLowerCase();
              const imagenEmbebida = mimeType === 'image/png'
                ? await pdfFinal.embedPng(imagenBytes)
                : await pdfFinal.embedJpg(imagenBytes);

              const { width, height } = imagenEmbebida.scale(1);
              const pagina = pdfFinal.addPage([width, height]);
              pagina.drawImage(imagenEmbebida, {
                x: 0,
                y: 0,
                width,
                height,
              });
            } else if (persona.pdf) {
              const pdfBytes = new Uint8Array(persona.pdf);
              const pdfCargado = await PDFDocument.load(pdfBytes);
              const indicesPaginas = pdfCargado.getPageIndices();
              const paginasCopiadas = await pdfFinal.copyPages(pdfCargado, indicesPaginas);
              paginasCopiadas.forEach((pagina) => pdfFinal.addPage(pagina));
            }
          }
          
          const pdfConcatenado = await pdfFinal.save();
          setPdfDocumentosIdentidad(pdfConcatenado.buffer);
          setPdfNombreDocumentos(`Documentos_Identidad_${personasConDocumentos.length}_aprendices`);
        } catch (error) {
          console.error('Error generando PDF de documentos:', error);
          alert('❌ Error al procesar las imágenes de los documentos');
        }
      }
    }
  };

  const descargarArchivos = () => {
    if (eventosPlaneador.length === 0) return alert('❌ No hay programación para descargar');

    const horasProgramadas = calcularHorasTotales();
    if (horasProgramadas !== Number(nuevoEvento.horasPrograma)) {
      return alert(`❌ Debes completar exactamente ${nuevoEvento.horasPrograma} horas`);
    }

    if (!pdfDocumentosIdentidad) {
      return alert('❌ Debes cargar las imágenes de los documentos de identidad antes de descargar');
    }

    const archivos = generarArchivosPlaneador();

    setAdjuntosCorreo([
      {
        fileName: archivos.nombrePlaneador,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        arrayBuffer: archivos.bufferPlaneador,
      },
      {
        fileName: archivos.nombreAprendices,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        arrayBuffer: archivos.bufferAprendices,
      },
      {
        fileName: archivos.nombreDocumentos,
        mimeType: 'application/pdf',
        arrayBuffer: archivos.bufferDocumentos,
      },
    ]);

    // Descargar 3 archivos: Planeador, Plano de Aprendices, y PDF de Documentos
    saveAs(new Blob([archivos.bufferPlaneador], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), archivos.nombrePlaneador);
    saveAs(new Blob([archivos.bufferAprendices], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), archivos.nombreAprendices);
    saveAs(new Blob([archivos.bufferDocumentos], { type: 'application/pdf' }), archivos.nombreDocumentos);

    setExcelDescargado(true);
    alert('✅ Archivos descargados correctamente');
  };

  const renderEventContent = (eventInfo) => {
    const props = eventInfo.event.extendedProps || {};
    const isTitulada = props.tipoFormacion === 'Titulada';
    const lugarInfo = [props.lugar, props.direccion].filter(Boolean).join(' - ');
    const extra = isTitulada 
      ? (props.ambiente ? `Ambiente: ${props.ambiente}` : '')
      : [props.ciudad, props.municipio].filter(Boolean).join(' - ');

    return (
      <div className="p-1 text-xs overflow-hidden">
        <div className="font-semibold leading-tight">{eventInfo.event.title}</div>
        {lugarInfo && <div className="text-emerald-700 text-[10px] mt-0.5">📍 {lugarInfo}</div>}
        {extra && <div className="text-gray-600 text-[10px]">{isTitulada ? '🏫' : '📌'} {extra}</div>}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {notificacionCorreo.visible && (
        <div className="fixed top-5 right-5 z-50 max-w-md">
          <div
            className={`rounded-2xl border px-4 py-3 shadow-lg text-sm ${
              notificacionCorreo.tipo === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : notificacionCorreo.tipo === 'error'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-800'
            }`}
          >
            {notificacionCorreo.mensaje}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Planeador Académico</h1>
          <p className="text-gray-600">{usuario?.nombre}</p>
          {!isSupabaseConfigured && (
            <p className="text-red-600 text-sm mt-2">
              {supabaseConfigErrorMessage}
            </p>
          )}
        </div>
        {eventosPlaneador.length > 0 && (
          <button onClick={descargarArchivos} className="bg-green-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-green-700">
            <Download size={20} /> Descargar planeador y plano
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* FORMULARIO */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-3xl p-8 shadow-sm border sticky top-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Plus className="text-green-600" /> Nueva Programación
            </h2>

            {/* SELECTOR DE TIPO */}
            <div className="mb-6">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Tipo de Formación <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cambiarTipoFormacion('Area Complementaria')}
                  className={`px-4 py-3 rounded-2xl border text-sm font-semibold transition-all ${nuevoEvento.tipoFormacion === 'Area Complementaria' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                >
                  Área Complementaria
                </button>
                <button
                  type="button"
                  onClick={() => cambiarTipoFormacion('Titulada')}
                  className={`px-4 py-3 rounded-2xl border text-sm font-semibold transition-all ${nuevoEvento.tipoFormacion === 'Titulada' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                >
                  Titulada
                </button>
              </div>
              {!nuevoEvento.tipoFormacion && (
                <p className="text-red-500 text-xs mt-2">⚠️ Debes seleccionar el tipo de formación para continuar</p>
              )}
            </div>

            <div className="space-y-5">
              <div className="relative">
                <input
                  type="text"
                  value={programaQuery}
                  onChange={handleProgramaInput}
                  onFocus={() => setProgramasAbierto(true)}
                  onBlur={() => setTimeout(() => setProgramasAbierto(false), 150)}
                  placeholder="Programa de Formación *"
                  className="w-full px-4 py-3 border rounded-2xl"
                  autoComplete="off"
                />
                {programasAbierto && (
                  <div className="absolute z-20 mt-2 w-full rounded-2xl border bg-white shadow-lg max-h-64 overflow-auto">
                    {cargandoProgramas && (
                      <div className="px-4 py-3 text-sm text-gray-500">Buscando programas...</div>
                    )}
                    {!cargandoProgramas && errorProgramas && (
                      <div className="px-4 py-3 text-sm text-red-600">{errorProgramas}</div>
                    )}
                    {!cargandoProgramas && !errorProgramas && programas.length === 0 && programaQuery.trim() && (
                      <div className="px-4 py-3 text-sm text-gray-500">Sin resultados</div>
                    )}
                    {!cargandoProgramas && !errorProgramas && programas.map((programa) => (
                      <button
                        key={programa.codigo_programa}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => seleccionarPrograma(programa)}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-green-50 transition-colors"
                      >
                        {formatearPrograma(programa)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={competenciaQuery}
                  onChange={handleCompetenciaInput}
                  onFocus={() => nuevoEvento.codigoPrograma && setCompetenciasAbierto(true)}
                  onBlur={() => setTimeout(() => setCompetenciasAbierto(false), 150)}
                  placeholder={nuevoEvento.codigoPrograma ? 'Competencia / Curso *' : 'Selecciona primero un programa'}
                  className="w-full px-4 py-3 border rounded-2xl disabled:bg-gray-100 disabled:cursor-not-allowed"
                  autoComplete="off"
                  disabled={!nuevoEvento.codigoPrograma}
                />
                {competenciasAbierto && nuevoEvento.codigoPrograma && (
                  <div className="absolute z-20 mt-2 w-full rounded-2xl border bg-white shadow-lg max-h-64 overflow-auto">
                    {cargandoCompetencias && (
                      <div className="px-4 py-3 text-sm text-gray-500">Buscando competencias...</div>
                    )}
                    {!cargandoCompetencias && errorCompetencias && (
                      <div className="px-4 py-3 text-sm text-red-600">{errorCompetencias}</div>
                    )}
                    {!cargandoCompetencias && !errorCompetencias && competencias.length === 0 && competenciaQuery.trim() && (
                      <div className="px-4 py-3 text-sm text-gray-500">Sin resultados</div>
                    )}
                    {!cargandoCompetencias && !errorCompetencias && competencias.map((competencia) => (
                      <button
                        key={competencia.codigo_competencia}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => seleccionarCompetencia(competencia)}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-green-50 transition-colors"
                      >
                        {formatearCompetencia(competencia)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="number"
                name="horasPrograma"
                value={nuevoEvento.horasPrograma}
                readOnly
                placeholder="Horas Totales del Programa *"
                className="w-full px-4 py-3 border rounded-2xl bg-gray-50"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Hora Inicio</label>
                  <select name="startTime" value={nuevoEvento.startTime} onChange={handleChange} className="w-full px-4 py-3 border rounded-2xl">
                    {Array.from({ length: 18 }, (_, i) => <option key={i} value={`${String(i+6).padStart(2,'0')}:00`}>{`${String(i+6).padStart(2,'0')}:00`}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Hora Fin</label>
                  <select name="endTime" value={nuevoEvento.endTime} onChange={handleChange} className="w-full px-4 py-3 border rounded-2xl">
                    {Array.from({ length: 18 }, (_, i) => <option key={i} value={`${String(i+6).padStart(2,'0')}:00`}>{`${String(i+6).padStart(2,'0')}:00`}</option>)}
                  </select>
                </div>
              </div>

              <input type="text" name="lugar" value={nuevoEvento.lugar} onChange={handleChange} placeholder="Lugar / Sede *" className="w-full px-4 py-3 border rounded-2xl" />
              <input type="text" name="direccion" value={nuevoEvento.direccion} onChange={handleChange} placeholder="Dirección *" className="w-full px-4 py-3 border rounded-2xl" />

              {/* CAMPOS DINÁMICOS */}
              {nuevoEvento.tipoFormacion === 'Titulada' && (
                <input type="text" name="ambiente" value={nuevoEvento.ambiente} onChange={handleChange} placeholder="Ambiente *" className="w-full px-4 py-3 border rounded-2xl" />
              )}
              {nuevoEvento.tipoFormacion === 'Area Complementaria' && (
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" name="ciudad" value={nuevoEvento.ciudad} onChange={handleChange} placeholder="Ciudad *" className="w-full px-4 py-3 border rounded-2xl" />
                  <input type="text" name="municipio" value={nuevoEvento.municipio} onChange={handleChange} placeholder="Municipio" className="w-full px-4 py-3 border rounded-2xl" />
                </div>
              )}

              {/* MINI CARGUE DE PERSONAS */}
              <MiniCarguePersonas 
                onPersonasChange={handlePersonasChange}
                isSubmitting={excelDescargado}
              />

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="font-semibold text-blue-800">⏰ Resumen de Horas</p>
                <p>Horas Programadas: <strong>{calcularHorasTotales()}</strong></p>
                <p>Horas del Programa: <strong>{nuevoEvento.horasPrograma || 0}</strong></p>
              </div>

              <button onClick={agregarEvento} disabled={!excelDescargado} className={`w-full py-4 rounded-2xl font-semibold text-lg text-white ${excelDescargado ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}>
                Agregar al Cronograma
              </button>
            </div>
          </div>
        </div>

        {/* CALENDARIO PRINCIPAL */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl shadow-sm border p-4">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale="es"
              selectable={true}
              selectMirror={true}
              select={handleSelect}
              eventClick={handleEliminarEvento}
              events={eventosPlaneador}
              height="75vh"
              eventContent={renderEventContent}
              headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
            />
          </div>
        </div>
      </div>

      {/* HISTORIAL COMPLETO */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Historial Completo</h2>
        <div className="bg-white rounded-3xl shadow-sm border p-4">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="es"
            events={eventosHistorial}
            height="70vh"
            eventContent={renderEventContent}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          />
        </div>
      </div>
    </div>
  );
}

export default Planeador;