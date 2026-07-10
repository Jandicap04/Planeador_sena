import { Router } from 'express';
import { finalizarAlistamiento, enviarAlertaPendiente } from '../controllers/alistamiento.controller.js';

const router = Router();

router.post('/verificar', finalizarAlistamiento);
router.post('/finalizar', finalizarAlistamiento);
router.post('/alerta-pendiente', enviarAlertaPendiente);

export default router;
