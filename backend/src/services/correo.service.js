import { enviarCorreo } from '../lib/mailer.js';

export const subjectAlertaPendiente = 'Recordatorio de cronograma';

const construirDetalleEventos = (eventos = []) => {
  if (!Array.isArray(eventos) || eventos.length === 0) {
    return '<li>No se registraron eventos en esta programación.</li>';
  }

  return eventos.map((evento, index) => {
    const props = evento?.extendedProps || {};
    const fecha = evento?.start ? new Date(evento.start).toISOString().split('T')[0] : 'Sin fecha';
    const inicio = evento?.start ? new Date(evento.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
    const fin = evento?.end ? new Date(evento.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
    const detalle = props.programa || props.competencia || evento?.title || 'Programación';
    const horas = props.horasPrograma || 'N/A';

    return `<li><strong>${index + 1}.</strong> ${detalle} — ${fecha} ${inicio} a ${fin} (${horas} horas)</li>`;
  }).join('');
};

export const construirHtmlAlertaPendiente = ({
  instructorNombre,
  destinatarioNombre,
  programaNombre,
  horasAsignadas,
  horasObjetivo,
  fechaLimite,
  eventos = [],
  adjuntos = [],
}) => `
  <h2>Hola, ${instructorNombre}</h2>
  <p>Este es un recordatorio de la programación registrada para el planeador.</p>
  <p><strong>Destinatario:</strong> ${destinatarioNombre || 'Coordinador'}</p>
  <p><strong>Programa:</strong> ${programaNombre}</p>
  <p><strong>Horas programadas:</strong> ${horasAsignadas}</p>
  <p><strong>Horas objetivo:</strong> ${horasObjetivo ?? 'No definida'}</p>
  <p><strong>Fecha final:</strong> ${fechaLimite}</p>
  <p><strong>Detalle de la programación:</strong></p>
  <ul>${construirDetalleEventos(eventos)}</ul>
  <p><strong>Archivos adjuntos:</strong></p>
  <ul>${adjuntos.length > 0 ? adjuntos.map((adjunto) => `<li>${adjunto.filename || adjunto.fileName || 'Archivo adjunto'}</li>`).join('') : '<li>No se adjuntaron archivos.</li>'}</ul>
  <p>Adjunto encontraras los archivos del planeador.</p>
`;

export const enviarCorreoAlertaPendiente = async ({ to, payload, attachments = [] }) => {
  return enviarCorreo({
    to,
    subject: subjectAlertaPendiente,
    html: construirHtmlAlertaPendiente(payload),
    attachments,
  });
};
