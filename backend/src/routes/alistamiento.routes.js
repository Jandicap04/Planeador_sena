import { Router } from 'express';
import { enviarAlertaPendiente } from '../controllers/alistamiento.controller.js';

const router = Router();

router.post('/verificar', enviarAlertaPendiente);
router.post('/alerta-pendiente', enviarAlertaPendiente);

export default router;
