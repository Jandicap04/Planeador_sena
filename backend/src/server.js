import app from './app.js';
import { env } from './config/env.js';

app.listen(env.port, () => {
  console.log(`API de alertas activa en http://localhost:${env.port}`);
});
