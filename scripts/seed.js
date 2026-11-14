import 'dotenv/config';
import mongoose from 'mongoose';
import { conectarDB } from '../src/config/db.js';
import Avistamiento from '../src/models/Avistamiento.js';
import { datosEjemplo } from './datos-ejemplo.js';

try {
  await conectarDB();
  if (await Avistamiento.countDocuments() > 0) {
    console.log('La colección ya tiene datos. No se insertaron ejemplos ni se modificó ningún registro.');
  } else {
    await Avistamiento.insertMany(datosEjemplo);
    console.log('Se crearon 3 registros de ejemplo en biocaqueta_db.avistamientos.');
  }
} catch {
  console.error('No se pudieron insertar los ejemplos. Revisa la configuración de MongoDB Atlas.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
