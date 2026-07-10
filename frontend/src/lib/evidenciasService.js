import { supabase } from './supabase';

export const subirArchivo = async (
  archivo,
  ficha,
  documento,
  instructor,
  confirmado = false
) => {

  if (!confirmado) {
    throw new Error('Debe confirmar que el documento aportado es el solicitado');
  }

  const nombreLimpio = archivo.name
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '') // quita tildes
  .replace(/ñ/gi, 'n')             // cambia ñ por n
  .replace(/[^a-zA-Z0-9._-]/g, '_'); // reemplaza espacios y símbolos

const nombreArchivo = `${Date.now()}_${nombreLimpio}`;

  const ruta = `${ficha}/${nombreArchivo}`;

  // SUBIR A STORAGE
  const { error: errorStorage } = await supabase
    .storage
    .from('evidencias')
    .upload(ruta, archivo);

  if (errorStorage) {
    throw errorStorage;
  }

  // OBTENER URL
  const { data } = supabase
    .storage
    .from('evidencias')
    .getPublicUrl(ruta);

  // GUARDAR EN BD
  const { error: errorBD } = await supabase
    .from('evidencias')
    .insert([
      {
        ficha,
        instructor,
        documento,
        archivo_nombre: archivo.name,
        archivo_url: data.publicUrl,
        estado: 'Pendiente',
        confirmado: true,
        fecha_carga: new Date().toISOString()
      }
    ]);

  if (errorBD) {
    throw errorBD;
  }

  return true;
};

export const obtenerDocumentosRequeridos = async () => {
  const { data, error } = await supabase
    .from('documentos_requeridos')
    .select('*')
    .order('id');

  if (error) {
    throw error;
  }

  return data;
};

export const obtenerEvidenciasFicha = async (ficha) => {
  const { data, error } = await supabase
    .from('evidencias')
    .select('*')
    .eq('ficha', ficha);

  if (error) {
    throw error;
  }

  return data;
};

export const obtenerEvidenciasInstructor = async (instructor) => {
  const { data, error } = await supabase
    .from('evidencias')
    .select('*')
    .eq('instructor', instructor);

  if (error) {
    throw error;
  }

  return data;
};

export const obtenerEvidenciasPendientes = async () => {
  const { data, error } = await supabase
    .from('evidencias')
    .select('*')
    .eq('estado', 'Pendiente');

  if (error) {
    throw error;
  }

  return data;
};

export const aprobarEvidencia = async (
  id,
  observaciones = ''
) => {

  const { error } = await supabase
    .from('evidencias')
    .update({
      estado: 'Aprobado',
      aprobado: true,
      observaciones,
      fecha_revision: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    throw error;
  }

  return true;
};

export const rechazarEvidencia = async (
  id,
  observaciones
) => {

  const { error } = await supabase
    .from('evidencias')
    .update({
      estado: 'Rechazado',
      aprobado: false,
      observaciones,
      fecha_revision: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    throw error;
  }

  return true;
};