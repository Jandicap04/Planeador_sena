import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import alistamientoRoutes from './routes/alistamiento.routes.js';
import { enviarCorreo } from './lib/mailer.js';

const app = express();

app.use(cors({ origin: env.frontendOrigin }));
app.use(express.json({ limit: '25mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'planeador-alertas-api' });
});

app.use('/api/alistamiento', alistamientoRoutes);

app.get('/api/correo/prueba', async (req, res) => {
  const to = String(req.query.to || '').trim();

  if (!to) {
    return res.status(400).json({
      ok: false,
      error: 'Debes enviar query param to. Ejemplo: /api/correo/prueba?to=correo@dominio.com',
    });
  }

  try {
    const result = await enviarCorreo({
      to,
      subject: 'Prueba de correo Planeador',
      html: '<h2>Prueba exitosa</h2><p>La API de correo del Planeador esta funcionando correctamente.</p>',
    });

    return res.json({ ok: true, messageId: result.messageId, to });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'No se pudo enviar el correo de prueba.',
    });
  }
});

app.post('/api/correo/prueba', async (req, res) => {
  const to = String(req.body?.to || '').trim();

  if (!to) {
    return res.status(400).json({
      ok: false,
      error: 'Debes enviar { "to": "correo@dominio.com" } en el body.',
    });
  }

  try {
    const result = await enviarCorreo({
      to,
      subject: 'Prueba de correo Planeador',
      html: '<h2>Prueba exitosa</h2><p>La API de correo del Planeador esta funcionando correctamente.</p>',
    });

    return res.json({ ok: true, messageId: result.messageId, to });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'No se pudo enviar el correo de prueba.',
    });
  }
});

app.post('/api/alertas/conflicto-ambiente', async (req, res) => {
  const instructor = req.body?.instructor;
  const conflicto = req.body?.conflicto;

  if (!instructor?.nombreCompleto || !instructor?.correoElectronico) {
    return res.status(400).json({
      ok: false,
      error: 'Debes enviar instructor.nombreCompleto e instructor.correoElectronico.',
    });
  }

  if (!conflicto?.fecha || !conflicto?.ambiente) {
    return res.status(400).json({
      ok: false,
      error: 'Debes enviar conflicto.fecha y conflicto.ambiente.',
    });
  }

  const subject = req.body?.asunto || 'Ambiente ocupado: por favor reprograme su horario';
  const html = `
    <h2>Hola, ${instructor.nombreCompleto}</h2>
    <p>Se detecto una coincidencia de ambiente en tu cronograma.</p>
    <p><strong>Fecha:</strong> ${conflicto.fecha}</p>
    <p><strong>Ambiente:</strong> ${conflicto.ambiente}</p>
    <p><strong>Lugar:</strong> ${conflicto.lugar || 'No especificado'}</p>
    <p><strong>Horario:</strong> ${conflicto.horaInicio || '--'} a ${conflicto.horaFin || '--'}</p>
    <p>Este ambiente esta ocupado por otra programacion. Por favor reprograme su nuevo horario.</p>
  `;

  try {
    const result = await enviarCorreo({
      to: instructor.correoElectronico,
      subject,
      html,
    });

    return res.json({ ok: true, messageId: result.messageId });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'No se pudo enviar la alerta de conflicto de ambiente.',
    });
  }
});

export default app;
