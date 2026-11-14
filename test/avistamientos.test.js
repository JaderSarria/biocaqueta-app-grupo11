import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { crearApp } from '../src/app.js';
import { conectarDB } from '../src/config/db.js';
import Avistamiento from '../src/models/Avistamiento.js';

const app = crearApp();
const valido = { nombreComun: 'Danta amazónica', nombreCientifico: 'Tapirus terrestris', categoria: 'Mamífero', zona: 'El Caraño', investigador: 'Investigador de prueba' };
let mongo;

before(async () => { mongo = await MongoMemoryServer.create(); await conectarDB(mongo.getUri()); }, { timeout: 180000 });
after(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });
beforeEach(async () => { await Avistamiento.deleteMany({}); });

test('GET devuelve un arreglo vacío y la vista invita a crear el primer registro', async () => {
  const lista = await request(app).get('/api/avistamientos').expect(200);
  assert.deepEqual(lista.body, []);
  const vista = await request(app).get('/').expect(200);
  assert.match(vista.text, /El cuaderno está por comenzar/);
});

test('POST JSON persiste en la base y colección exigidas, aplica defaults y responde 201', async () => {
  const respuesta = await request(app).post('/api/avistamientos').send(valido).expect(201);
  assert.equal(respuesta.body.estadoConservacion, 'Preocupación menor');
  assert.ok(!Number.isNaN(Date.parse(respuesta.body.fechaRegistro)));
  assert.equal(mongoose.connection.name, 'biocaqueta_db');
  assert.equal(Avistamiento.collection.name, 'avistamientos');
  assert.equal((await Avistamiento.findById(respuesta.body._id)).nombreComun, valido.nombreComun);
});

test('GET ordena por fecha descendente y filtra por categoría', async () => {
  await Avistamiento.create([{ ...valido, fechaRegistro: '2020-01-01' }, { ...valido, nombreComun: 'Guacamaya', categoria: 'Ave', fechaRegistro: '2025-01-01' }]);
  const todos = await request(app).get('/api/avistamientos').expect(200);
  assert.equal(todos.body[0].categoria, 'Ave');
  const aves = await request(app).get('/api/avistamientos').query({ categoria: 'Ave' }).expect(200);
  assert.equal(aves.body.length, 1);
  assert.equal(aves.body[0].categoria, 'Ave');
});

test('rechaza categorías de filtro inválidas y objetos de query', async () => {
  await request(app).get('/api/avistamientos?categoria=Pez').expect(400);
  await request(app).get('/api/avistamientos?categoria=Ave&categoria=Flora').expect(400);
});

test('campos obligatorios, enums y fechas inválidas devuelven 400 sin insertar', async () => {
  for (const datos of [{}, { ...valido, nombreComun: '   ' }, { ...valido, categoria: 'Pez' }, { ...valido, estadoConservacion: 'Extinto' }, { ...valido, fechaRegistro: 'no-es-fecha' }]) {
    await request(app).post('/api/avistamientos').send(datos).expect(400);
  }
  assert.equal(await Avistamiento.countDocuments(), 0);
});

test('cuerpos malformados y tipos incorrectos tienen errores JSON controlados', async () => {
  await request(app).post('/api/avistamientos').set('Content-Type', 'application/json').send('{').expect(400);
  await request(app).post('/api/avistamientos').send({ ...valido, zona: { $ne: null } }).expect(400);
  await request(app).post('/api/avistamientos').set('Content-Type', 'text/plain').send('texto').expect(415);
});

test('PUT actualiza zona y estado, conserva datos y valida los enums', async () => {
  const registro = await Avistamiento.create(valido);
  const actualizacion = await request(app).put(`/api/avistamientos/${registro.id}`)
    .send({ zona: 'Río Hacha', estadoConservacion: 'En peligro' }).expect(200);
  assert.equal(actualizacion.body.zona, 'Río Hacha');
  assert.equal(actualizacion.body.nombreComun, valido.nombreComun);
  await request(app).put(`/api/avistamientos/${registro.id}`).send({ estadoConservacion: 'Otro' }).expect(400);
  assert.equal((await Avistamiento.findById(registro.id)).estadoConservacion, 'En peligro');
});

test('no acepta actualizaciones vacías ni permite reemplazar _id', async () => {
  const registro = await Avistamiento.create(valido);
  await request(app).put(`/api/avistamientos/${registro.id}`).send({}).expect(400);
  await request(app).put(`/api/avistamientos/${registro.id}`).send({ _id: new mongoose.Types.ObjectId().toString() }).expect(400);
  await request(app).put(`/api/avistamientos/${registro.id}`).send({ fechaRegistro: '' }).expect(400);
});

test('ids malformados devuelven 400 y registros inexistentes 404', async () => {
  const inexistente = new mongoose.Types.ObjectId().toString();
  await request(app).put('/api/avistamientos/no-valido').send({ zona: 'Otra' }).expect(400);
  await request(app).delete('/api/avistamientos/no-valido').expect(400);
  await request(app).put(`/api/avistamientos/${inexistente}`).send({ zona: 'Otra' }).expect(404);
  await request(app).delete(`/api/avistamientos/${inexistente}`).expect(404);
  await request(app).get(`/editar/${inexistente}`).expect(404);
});

test('DELETE elimina en MongoDB y una segunda eliminación devuelve 404', async () => {
  const registro = await Avistamiento.create(valido);
  await request(app).delete(`/api/avistamientos/${registro.id}`).expect(200);
  assert.equal(await Avistamiento.findById(registro.id), null);
  await request(app).delete(`/api/avistamientos/${registro.id}`).expect(404);
});

test('formulario HTML crea, redirige, edita con inputs precargados y elimina', async () => {
  await request(app).post('/api/avistamientos').type('form').send(valido).expect(303).expect('Location', '/?exito=creado');
  const registro = await Avistamiento.findOne();
  const editar = await request(app).get(`/editar/${registro.id}`).expect(200);
  assert.match(editar.text, /value="Danta amazónica"/);
  assert.match(editar.text, /value="Mamífero" selected/);
  await request(app).post(`/api/avistamientos/update/${registro.id}`).type('form')
    .send({ ...valido, zona: 'Río Hacha', estadoConservacion: 'Vulnerable' }).expect(303);
  assert.equal((await Avistamiento.findById(registro.id)).zona, 'Río Hacha');
  await request(app).post(`/api/avistamientos/delete/${registro.id}`).type('form').send({}).expect(303);
  assert.equal(await Avistamiento.countDocuments(), 0);
});

test('errores HTML conservan los datos enviados', async () => {
  const vista = await request(app).post('/api/avistamientos').type('form').send({ ...valido, nombreCientifico: '' }).expect(400);
  assert.match(vista.text, /value="Danta amazónica"/);
  assert.match(vista.text, /El nombre científico es obligatorio/);
});

test('Handlebars escapa contenido y el filtro de vistas usa datos reales', async () => {
  await Avistamiento.create({ ...valido, nombreComun: '<script>alert(1)</script>' });
  const vista = await request(app).get('/').expect(200);
  assert.ok(!vista.text.includes('<script>alert(1)</script>'));
  assert.match(vista.text, /&lt;script&gt;/);
  const filtrada = await request(app).get('/?categoria=Ave').expect(200);
  assert.match(filtrada.text, /Aún no hay registros de esta categoría/);
});

test('archivos estáticos y rutas desconocidas responden correctamente', async () => {
  await request(app).get('/css/styles.css').expect(200);
  await request(app).get('/js/app.js').expect(200);
  const perdida = await request(app).get('/api/no-existe').expect(404);
  assert.equal(typeof perdida.body.error, 'string');
  await request(app).get('/no-existe').expect(404);
});

const fotoPrueba = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6C1sAAAAASUVORK5CYII=';

test('coordenadas exactas admiten números, strings y cero, y rechazan puntos incompletos', async () => {
  const creado = await request(app).post('/api/avistamientos').send({ ...valido, latitud: 0, longitud: -75.6062 }).expect(201);
  assert.equal(creado.body.latitud, 0);
  assert.match(creado.body.mapsUrl, /query=0,-75.6062/);
  await request(app).put(`/api/avistamientos/${creado.body._id}`).send({ zona: 'Otra zona' }).expect(200);
  assert.equal((await Avistamiento.findById(creado.body._id)).latitud, 0);
  for (const punto of [{ latitud: 91, longitud: 0 }, { latitud: 1, longitud: 181 }, { latitud: 1 }, { latitud: '', longitud: 2 }, { latitud: false, longitud: 3 }]) {
    await request(app).post('/api/avistamientos').send({ ...valido, ...punto }).expect(400);
  }
  const actualizado = await request(app).put(`/api/avistamientos/${creado.body._id}`).send({ latitud: '1.614400', longitud: '-75.606200' }).expect(200);
  assert.equal(actualizado.body.longitud, -75.6062);
  await request(app).put(`/api/avistamientos/${creado.body._id}`).send({ latitud: '', longitud: '' }).expect(200);
  assert.equal((await Avistamiento.findById(creado.body._id)).latitud, null);
});

test('foto persiste separada del JSON de listado y se sirve con tipo y cache correctos', async () => {
  const creado = await request(app).post('/api/avistamientos').send({ ...valido, foto: fotoPrueba }).expect(201);
  assert.equal(creado.body.tieneFoto, true);
  assert.equal(creado.body.foto, undefined);
  const listado = await request(app).get('/api/avistamientos').expect(200);
  assert.equal(listado.body[0].foto, undefined);
  assert.ok((await Avistamiento.findById(creado.body._id).select('+foto')).foto);
  const imagen = await request(app).get(creado.body.fotoUrl).expect('Content-Type', /image\/png/).expect(200);
  assert.ok(imagen.body.length > 16);
  await request(app).get(creado.body.fotoUrl).set('If-None-Match', imagen.headers.etag).expect(304);
  await request(app).put(`/api/avistamientos/${creado.body._id}`).send({ zona: 'Río Hacha' }).expect(200);
  await request(app).get(creado.body.fotoUrl).expect(200);
  const quitado = await request(app).put(`/api/avistamientos/${creado.body._id}`).send({ removerFoto: true }).expect(200);
  assert.equal(quitado.body.tieneFoto, false);
  await request(app).get(creado.body.fotoUrl).expect(404);
});

test('rechaza fotos activas, con firma falsa y por encima del límite', async () => {
  for (const foto of ['data:image/svg+xml;base64,PHN2Zz4=', 'data:image/jpeg;base64,' + Buffer.from('contenido que no es una fotografía').toString('base64'), 'data:image/png;base64,' + 'A'.repeat(2000004)]) {
    await request(app).post('/api/avistamientos').send({ ...valido, foto }).expect(400);
  }
  assert.equal(await Avistamiento.countDocuments(), 0);
});

test('formulario con errores conserva foto, coordenadas e id para volver a guardar', async () => {
  const registro = await Avistamiento.create(valido);
  const vista = await request(app).post(`/api/avistamientos/update/${registro.id}`).type('form')
    .send({ ...valido, nombreCientifico: '', latitud: '1.6144', longitud: '-75.6062', foto: fotoPrueba }).expect(400);
  assert.ok(vista.text.includes(`/api/avistamientos/update/${registro.id}`));
  const fotoConservada = /id="foto" name="foto" value="([^"]*)"/.exec(vista.text)?.[1].replace(/&#x3D;/g, '=');
  assert.equal(fotoConservada, fotoPrueba);
  assert.match(vista.text, /value="1.6144"/);
});

test('monitor registra operaciones reales y omite el contenido de la fotografía', async () => {
  const instancia = crearApp();
  await request(instancia).post('/api/avistamientos').send({ ...valido, foto: fotoPrueba }).expect(201);
  await request(instancia).get('/api/avistamientos').expect(200);
  const historial = await request(instancia).get('/api/solicitudes').expect(200);
  assert.equal(historial.body.length, 2);
  assert.equal(historial.body[0].metodo, 'GET');
  assert.equal(historial.body[1].estado, 201);
  assert.equal(historial.body[1].fotoAdjunta, true);
  assert.equal(historial.body[1].datos.foto, undefined);
  assert.ok(!JSON.stringify(historial.body).includes('base64'));
  await request(instancia).get('/api/solicitudes').expect(200);
  assert.equal((await request(instancia).get('/api/solicitudes')).body.length, 2);
});

test('búsqueda de lugar valida la entrada y reutiliza resultados en caché', async () => {
  const originalFetch = globalThis.fetch;
  let llamadas = 0;
  globalThis.fetch = async () => { llamadas++; return { ok: true, json: async () => [{ display_name: 'Florencia, Caquetá, Colombia', lat: '1.6144', lon: '-75.6062' }] }; };
  try {
    const instancia = crearApp();
    await request(instancia).get('/api/lugares?q=a').expect(400);
    const primera = await request(instancia).get('/api/lugares?q=Florencia').expect(200);
    assert.equal(primera.body[0].latitud, 1.6144);
    await request(instancia).get('/api/lugares?q=Florencia').expect(200);
    assert.equal(llamadas, 1);
    await request(instancia).get('/api/lugares?q=Otro%20lugar').expect(429);
  } finally { globalThis.fetch = originalFetch; }
});
