import { enviarCorreoAlertaPendiente, enviarCorreoFinalizacion } from '../services/correo.service.js';
import { obtenerProgramacionFinalizarPorId } from '../services/programacion.service.js';

export const finalizarAlistamiento = async (req, res) => {
  const idProgramacion = Number(req.body?.id_programacion);

  if (!idProgramacion) {
    return res.status(400).json({ ok: false, error: 'Debes enviar id_programacion.' });
  }

  try {
    const programacion = await obtenerProgramacionFinalizarPorId(idProgramacion);
    const instructor = programacion.instructor || null;
    const programa = programacion.programa || null;

    if (!instructor?.correo_electronico) {
      return res.status(404).json({ ok: false, error: 'No se encontro correo del instructor.' });
    }

    const result = await enviarCorreoFinalizacion({
      to: instructor.correo_electronico,
      payload: {
        instructorNombre: instructor.nombre_completo || instructor.nombre || 'Instructor',
        programaNombre: programa?.nombre_programa || 'Programa',
        horasAsignadas: programacion.horas_asignadas,
        fechaLimite: programacion.fecha_limite,
      },
    });

    return res.json({ ok: true, messageId: result.messageId, id_programacion: idProgramacion });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'No se pudo finalizar el alistamiento.' });
  }
};

export const enviarAlertaPendiente = async (req, res) => {
  const idProgramacion = Number(req.body?.id_programacion);

  if (!idProgramacion) {
    return res.status(400).json({ ok: false, error: 'Debes enviar id_programacion.' });
  }

  try {
    const programacion = await obtenerProgramacionFinalizarPorId(idProgramacion);
    const instructor = programacion.instructor || null;
    const programa = programacion.programa || null;

    if (!instructor?.correo_electronico) {
      return res.status(404).json({ ok: false, error: 'No se encontro correo del instructor.' });
    }

    const result = await enviarCorreoAlertaPendiente({
      to: instructor.correo_electronico,
      payload: {
        instructorNombre: instructor.nombre_completo || instructor.nombre || 'Instructor',
        programaNombre: programa?.nombre_programa || 'Programa',
        horasAsignadas: programacion.horas_asignadas,
        fechaLimite: programacion.fecha_limite,
      },
    });

    return res.json({ ok: true, messageId: result.messageId, id_programacion: idProgramacion });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'No se pudo enviar la alerta.' });
  }
};
