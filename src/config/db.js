import mongoose from 'mongoose';

export async function conectarDB(uri = process.env.MONGODB_URI) {
  if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri)) {
    throw new Error('Configura MONGODB_URI en el archivo .env con tu conexión de MongoDB Atlas.');
  }
  await mongoose.connect(uri, {
    dbName: 'biocaqueta_db',
    serverSelectionTimeoutMS: 10000
  });
  return mongoose.connection;
}
