import 'dotenv/config';
import express from 'express';
import { engine } from 'express-handlebars';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import { conectarDB } from './config/db.js';
import apiRouter from './routes/api.router.js';
import viewsRouter from './routes/views.router.js';
import { manejarError } from './middleware/errores.js';
import { HttpError } from './utils/http.js';
import { crearMonitor } from './middleware/solicitudes.js';
import { crearMapaRouter } from './routes/mapa.router.js';

const carpeta = path.dirname(fileURLToPath(import.meta.url));
const fecha = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Bogota'
});

export function crearApp() {
  const app = express();
  app.disable('x-powered-by');
  app.engine('handlebars', engine({
    defaultLayout: 'main',
    layoutsDir: path.join(carpeta, 'views/layouts'),
    partialsDir: path.join(carpeta, 'views/partials'),
    helpers: {
      fecha: (valor) => Number.isNaN(new Date(valor).getTime()) ? 'Sin fecha' : fecha.format(new Date(valor)),
      claseEstado: (valor) => ({ Vulnerable: 'vulnerable', 'En peligro': 'peligro' }[valor] || 'menor'),
      inicial: (valor) => String(valor || '?').charAt(0).toLocaleUpperCase('es'),
      claseCategoria: (valor) => ({ 'Mamífero': 'mamifero', Ave: 'ave', Reptil: 'reptil', Anfibio: 'anfibio', Flora: 'flora' }[valor] || 'flora')
    }
  }));
  app.set('view engine', 'handlebars');
  app.set('views', path.join(carpeta, 'views'));
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.set('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data: blob: https://tile.openstreetmap.org; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
    next();
  });
  const monitor = crearMonitor();
  app.use(monitor.middleware);
  app.use(express.json({ limit: '3mb' }));
  app.use(express.urlencoded({ extended: false, limit: '3mb' }));
  app.use(express.static(path.join(carpeta, 'public')));
  app.use('/vendor/leaflet', express.static(path.join(carpeta, '../node_modules/leaflet/dist')));
  app.use('/api/avistamientos', apiRouter);
  app.get('/api/solicitudes', monitor.listar);
  app.use('/api', crearMapaRouter());
  app.use('/', viewsRouter);
  app.use((req, res, next) => next(new HttpError(404, 'La página o el recurso que buscas no existe.')));
  app.use(manejarError);
  return app;
}

export async function iniciar() {
  const puerto = Number(process.env.PORT || 3000);
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) throw new Error('PORT debe ser un puerto entre 1 y 65535.');
  await conectarDB();
  console.log('MongoDB conectado. Base: biocaqueta_db / colección: avistamientos');
  const servidor = crearApp().listen(puerto, () => console.log(`BioCaquetá disponible en http://localhost:${puerto}`));
  servidor.on('error', async (error) => {
    console.error(error.code === 'EADDRINUSE' ? 'El puerto está ocupado. Cambia PORT en .env.' : 'No se pudo iniciar el servidor HTTP.');
    await mongoose.disconnect();
    process.exitCode = 1;
  });
  const cerrar = () => servidor.close(async () => { await mongoose.disconnect(); process.exit(0); });
  process.once('SIGINT', cerrar);
  process.once('SIGTERM', cerrar);
  return servidor;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  iniciar().catch(async (error) => {
    console.error(error.message.startsWith('Configura') || error.message.startsWith('PORT')
      ? error.message : 'No se pudo conectar con MongoDB Atlas. Revisa .env, el usuario de base de datos y la lista de IP permitidas.');
    await mongoose.disconnect();
    process.exitCode = 1;
  });
}
