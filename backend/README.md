# Backend de Alertas Planeador

Backend Node.js/Express para envio de correos de alistamiento, alertas de vencimiento y conflicto de ambiente.

## Arquitectura

- `src/config/env.js`: carga y centraliza variables de entorno.
- `src/lib/supabase.js`: cliente Supabase para consultas de datos.
- `src/lib/mailer.js`: transporte SMTP (Gmail App Password recomendado).
- `src/services/programacion.service.js`: consultas de programacion/instructor/programa.
- `src/services/correo.service.js`: plantillas HTML y subjects.
- `src/controllers/alistamiento.controller.js`: flujo HTTP de finalizar y alerta pendiente.
- `src/routes/alistamiento.routes.js`: rutas `/verificar`, `/finalizar`, `/alerta-pendiente`.
- `src/scripts/enviar-alertas-pendientes.js`: ejecucion por cron diario.
- `src/app.js`: compose de middlewares y rutas.
- `src/server.js`: bootstrap del servidor.

## Configuracion

1. Copia `.env.example` a `.env`.
2. Completa variables de Supabase y SMTP.
3. Instala dependencias:

```bash
npm install
```

4. Ejecuta API en desarrollo:

```bash
npm run dev
```

5. Ejecuta script cron manualmente:

```bash
npm run cron:alertas
```

La API corre en `http://localhost:4000` por defecto.

## Variables de Entorno

```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_correo@gmail.com
SMTP_PASS=tu_app_password_de_16_caracteres
SMTP_FROM="Planeador SENA <tu_correo@gmail.com>"

CRON_DAYS_BEFORE_DUE=3
```

Nota: `SMTP_PASS` debe ser App Password de Gmail, no tu clave normal.

## Endpoints

### Health

- `GET /health`

### Alistamiento

- `POST /api/alistamiento/verificar` (alias de compatibilidad)
- `POST /api/alistamiento/finalizar`
- `POST /api/alistamiento/alerta-pendiente`

Body para `verificar` y `finalizar`:

```json
{
  "id_programacion": 123
}
```

Body para `alerta-pendiente`:

```json
{
  "id_programacion": 123
}
```

### Correo de Prueba

- `GET /api/correo/prueba?to=correo@dominio.com`
- `POST /api/correo/prueba`

Body del POST:

```json
{
  "to": "correo@dominio.com"
}
```

### Conflicto de Ambiente

- `POST /api/alertas/conflicto-ambiente`

```json
{
  "instructor": {
    "nombreCompleto": "Ana Perez",
    "correoElectronico": "ana@dominio.com"
  },
  "conflicto": {
    "fecha": "2026-07-10",
    "ambiente": "Aula 101",
    "lugar": "Sede Central",
    "horaInicio": "07:00",
    "horaFin": "10:00"
  },
  "asunto": "Ambiente ocupado: por favor reprograme su horario"
}
```

## SQL de Referencia

Consulta de finalizacion por evento directo:

```sql
select
  p.id_programacion,
  p.horas_asignadas,
  p.fecha_limite,
  p.estado,
  i.id as instructor_id,
  i.nombre_completo,
  i.usuario,
  i.correo_electronico,
  pr.codigo_programa,
  pr.nombre_programa
from programacion p
join instructores i on i.id = p.instructor_id
join programa pr on pr.codigo_programa = p.codigo_programa
where p.id_programacion = :id_programacion;
```

Consulta de pendientes a vencer (proximo 3 dias):

```sql
select
  p.id_programacion,
  p.horas_asignadas,
  p.fecha_limite,
  p.estado,
  i.nombre_completo,
  i.correo_electronico,
  pr.nombre_programa
from programacion p
join instructores i on i.id = p.instructor_id
join programa pr on pr.codigo_programa = p.codigo_programa
where p.estado = 'Pendiente'
  and p.fecha_limite between current_date and current_date + interval '3 days'
order by p.fecha_limite asc;
```
