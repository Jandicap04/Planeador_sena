import { enviarCorreo } from '../lib/mailer.js';

export const subjectFinalizacion = 'Alistamiento Total de Verificacion de Horas';
export const subjectAlertaPendiente = 'Estimado Instructor, recuerde realizar el alistamiento total de verificacion de horas antes de la fecha limite establecida';

export const construirHtmlFinalizacion = ({ instructorNombre, programaNombre, horasAsignadas, fechaLimite }) => `
  <h2>Hola, ${instructorNombre}</h2>
  <p>Se ha confirmado el <strong>Alistamiento Total de Verificacion de Horas</strong>.</p>
  <p><strong>Programa:</strong> ${programaNombre}</p>
  <p><strong>Horas asignadas:</strong> ${horasAsignadas}</p>
  <p><strong>Fecha limite de alistamiento:</strong> ${fechaLimite}</p>
  <p>Este correo fue generado automaticamente por la Coordinacion de Formacion Complementaria - SENA.</p>
`;

export const construirHtmlAlertaPendiente = ({ instructorNombre, programaNombre, horasAsignadas, fechaLimite }) => `
  <h2>Hola, ${instructorNombre}</h2>
  <p>Estimado Instructor, recuerde realizar el alistamiento total de verificacion de horas antes de la fecha limite establecida.</p>
  <p><strong>Programa:</strong> ${programaNombre}</p>
  <p><strong>Horas asignadas:</strong> ${horasAsignadas}</p>
  <p><strong>Fecha limite:</strong> ${fechaLimite}</p>
`;

export const enviarCorreoFinalizacion = async ({ to, payload }) => {
  return enviarCorreo({
    to,
    subject: subjectFinalizacion,
    html: construirHtmlFinalizacion(payload),
  });
};

export const enviarCorreoAlertaPendiente = async ({ to, payload }) => {
  return enviarCorreo({
    to,
    subject: subjectAlertaPendiente,
    html: construirHtmlAlertaPendiente(payload),
  });
};
