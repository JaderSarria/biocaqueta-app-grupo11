// Entorno temporal para revisar la app sin credenciales. No reemplaza MongoDB Atlas.
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { conectarDB } from '../src/config/db.js';
import { crearApp } from '../src/app.js';
import Avistamiento from '../src/models/Avistamiento.js';
import { datosEjemplo } from './datos-ejemplo.js';

let mongo;
let servidor;
try {
  mongo = await MongoMemoryServer.create();
  await conectarDB(mongo.getUri());
  await Avistamiento.insertMany(datosEjemplo);
  const puerto = Number(process.env.PORT || 3000);
  servidor = crearApp().listen(puerto);
  servidor.on('error', async () => {
    console.error('No se pudo abrir el puerto de demostración.');
    await mongoose.disconnect();
    await mongo.stop();
    process.exitCode = 1;
  });
  servidor.on('listening', () => {
    console.log(`DEMO TEMPORAL en http://localhost:${puerto}. Usa datos de ejemplo; se borran al cerrar.`);
  });
  const cerrar = () => servidor.close(async () => { await mongoose.disconnect(); await mongo.stop(); process.exit(0); });
  process.once('SIGINT', cerrar);
  process.once('SIGTERM', cerrar);
} catch {
  console.error('No se pudo iniciar la demo. La primera ejecución necesita Internet para descargar MongoDB.');
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  process.exitCode = 1;
}
