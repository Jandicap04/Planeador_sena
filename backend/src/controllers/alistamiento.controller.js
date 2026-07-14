import { enviarCorreoAlertaPendiente } from '../services/correo.service.js';

const normalizarAdjuntos = (adjuntos) => {
  if (!Array.isArray(adjuntos)) {
    return [];
  }

  return adjuntos
    .filter((adjunto) => adjunto?.fileName && adjunto?.contentBase64)
    .map((adjunto) => ({
      filename: String(adjunto.fileName),
      contentType: String(adjunto.mimeType || 'application/octet-stream'),
      content: Buffer.from(String(adjunto.contentBase64), 'base64'),
    }));
};

export const enviarAlertaPendiente = async (req, res) => {
  try {
    const instructor = req.body?.instructor;
    const destinatario = req.body?.destinatario || req.body?.receptor || req.body?.correoDestino || instructor?.correoElectronico;
    const destinatarios = Array.isArray(destinatario)
      ? destinatario.filter(Boolean)
      : String(destinatario || '').trim();

    if (!destinatarios || (Array.isArray(destinatarios) && destinatarios.length === 0)) {
      return res.status(400).json({ ok: false, error: 'Debes enviar un destinatario válido para el correo.' });
    }

    const attachments = normalizarAdjuntos(req.body?.adjuntos);

    const result = await enviarCorreoAlertaPendiente({
      to: destinatarios,
      payload: {
        instructorNombre: instructor?.nombreCompleto || 'Instructor',
        destinatarioNombre: req.body?.destinatarioNombre || 'Coordinador',
        programaNombre: req.body?.programa?.nombre || 'Programa',
        horasAsignadas: req.body?.horasProgramadas ?? req.body?.horasObjetivo ?? 'No definido',
        horasObjetivo: req.body?.horasObjetivo ?? req.body?.horasProgramadas ?? 'No definido',
        fechaLimite: req.body?.semana?.fin || 'No definida',
        semana: req.body?.semana,
        eventos: Array.isArray(req.body?.eventos) ? req.body.eventos : [],
        adjuntos: attachments,
      },
      attachments,
    });

    return res.json({
      ok: true,
      messageId: result.messageId,
      to: destinatarios,
      attachments: attachments.length,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'No se pudo enviar el recordatorio.' });
  }
};
