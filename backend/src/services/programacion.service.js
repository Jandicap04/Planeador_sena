import { supabase } from '../lib/supabase.js';

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase no configurado. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en backend/.env');
  }
};

export const obtenerProgramacionFinalizarPorId = async (idProgramacion) => {
  requireSupabase();

  const { data: programacion, error } = await supabase
    .from('programacion')
    .select(`
      id_programacion,
      instructor_id,
      codigo_programa,
      horas_asignadas,
      fecha_limite,
      estado
    `)
    .eq('id_programacion', idProgramacion)
    .single();

  if (error) {
    throw new Error(error.message || 'No fue posible consultar la programacion.');
  }

  const [{ data: instructor, error: errorInstructor }, { data: programa, error: errorPrograma }] = await Promise.all([
    supabase
      .from('instructores')
      .select('id, nombre_completo, usuario, correo_electronico')
      .eq('id', programacion.instructor_id)
      .maybeSingle(),
    supabase
      .from('programa')
      .select('codigo_programa, nombre_programa')
      .eq('codigo_programa', programacion.codigo_programa)
      .maybeSingle(),
  ]);

  if (errorInstructor) {
    throw new Error(errorInstructor.message || 'No fue posible consultar el instructor.');
  }

  if (errorPrograma) {
    throw new Error(errorPrograma.message || 'No fue posible consultar el programa.');
  }

  return {
    ...programacion,
    instructor,
    programa,
  };
};

export const obtenerProgramacionesPendientesVencimiento = async (diasAntesDeVencer = 3) => {
  requireSupabase();

  const hoy = new Date();
  const limite = new Date(hoy);
  limite.setDate(hoy.getDate() + Number(diasAntesDeVencer || 3));

  const isoHoy = hoy.toISOString().slice(0, 10);
  const isoLimite = limite.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('programacion')
    .select(`
      id_programacion,
      instructor_id,
      codigo_programa,
      horas_asignadas,
      fecha_limite,
      estado
    `)
    .eq('estado', 'Pendiente')
    .gte('fecha_limite', isoHoy)
    .lte('fecha_limite', isoLimite)
    .order('fecha_limite', { ascending: true });

  if (error) {
    throw new Error(error.message || 'No fue posible consultar las programaciones pendientes.');
  }

  const programaciones = data || [];

  const programacionesConDetalles = await Promise.all(
    programaciones.map(async (programacion) => {
      const [{ data: instructor }, { data: programa }] = await Promise.all([
        supabase
          .from('instructores')
          .select('id, nombre_completo, usuario, correo_electronico')
          .eq('id', programacion.instructor_id)
          .maybeSingle(),
        supabase
          .from('programa')
          .select('codigo_programa, nombre_programa')
          .eq('codigo_programa', programacion.codigo_programa)
          .maybeSingle(),
      ]);

      return {
        ...programacion,
        instructor,
        programa,
      };
    })
  );

  return programacionesConDetalles;
};
