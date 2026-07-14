const API_BASE_URL = import.meta.env.VITE_ALERTAS_API_BASE_URL;

const arrayBufferToBase64 = (arrayBuffer) => {
  if (!arrayBuffer) return '';

  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
};

const construirSemana = (eventos) => {
  if (!Array.isArray(eventos) || eventos.length === 0) {
    const hoy = new Date();
    const iso = hoy.toISOString().slice(0, 10);
    return { inicio: iso, fin: iso };
  }

  const fechas = eventos
    .map((ev) => new Date(ev.start))
    .filter((fecha) => !Number.isNaN(fecha.getTime()))
    .sort((a, b) => a - b);

  const inicio = fechas[0];
  const fin = fechas[fechas.length - 1];

  return {
    inicio: inicio.toISOString().slice(0, 10),
    fin: fin.toISOString().slice(0, 10),
  };
};

export const enviarVerificacionAlistamiento = async ({
  instructor,
  destinatario,
  destinatarioNombre,
  programaNombre,
  horasProgramadas,
  horasObjetivo,
  eventos,
  adjuntos,
}) => {
  if (!API_BASE_URL) {
    return { skipped: true, reason: 'api-base-url-missing' };
  }

  const adjuntosSerializados = Array.isArray(adjuntos)
    ? adjuntos
        .filter((adjunto) => adjunto?.fileName && adjunto?.mimeType && adjunto?.arrayBuffer)
        .map((adjunto) => ({
          fileName: adjunto.fileName,
          mimeType: adjunto.mimeType,
          contentBase64: arrayBufferToBase64(adjunto.arrayBuffer),
        }))
    : [];

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/alistamiento/verificar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instructor,
        destinatario,
        destinatarioNombre,
        programa: { nombre: programaNombre || 'Programa' },
        semana: construirSemana(eventos),
        horasProgramadas,
        horasObjetivo,
        eventos,
        adjuntos: adjuntosSerializados,
      }),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('No hay conexion con la API de correos. Verifica que backend este activo en http://localhost:4000.');
    }
    throw error;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || 'No se pudo notificar el alistamiento por correo.');
  }

  return payload;
};

export const enviarAlertaConflictoAmbiente = async ({
  instructor,
  conflicto,
  asunto,
}) => {
  if (!API_BASE_URL) {
    return { skipped: true, reason: 'api-base-url-missing' };
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/alertas/conflicto-ambiente`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instructor,
        conflicto,
        asunto,
      }),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('No hay conexion con la API de correos. Verifica que backend este activo en http://localhost:4000.');
    }
    throw error;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || 'No se pudo enviar la alerta de conflicto de ambiente.');
  }

  return payload;
};
