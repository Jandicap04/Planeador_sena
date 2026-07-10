import { obtenerProgramacionesPendientesVencimiento } from '../services/programacion.service.js';
import { enviarCorreoAlertaPendiente, subjectAlertaPendiente } from '../services/correo.service.js';
import { env } from '../config/env.js';

const ejecutar = async () => {
  const programaciones = await obtenerProgramacionesPendientesVencimiento(env.cronDaysBeforeDue);

  for (const programacion of programaciones) {
    const instructor = programacion.instructor || null;
    const programa = programacion.programa || null;

    if (!instructor?.correo_electronico) {
      continue;
    }

    await enviarCorreoAlertaPendiente({
      to: instructor.correo_electronico,
      payload: {
        instructorNombre: instructor.nombre_completo || instructor.nombre || 'Instructor',
        programaNombre: programa?.nombre_programa || 'Programa',
        horasAsignadas: programacion.horas_asignadas,
        fechaLimite: programacion.fecha_limite,
      },
    });
  }

  console.log(`Alertas procesadas: ${programaciones.length}`);
};

ejecutar()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(subjectAlertaPendiente, error);
    process.exit(1);
  });
