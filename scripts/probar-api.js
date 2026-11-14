// Pruebas de API con Node.js, sin instalar un ejecutor adicional de Postman.
import 'dotenv/config';
import assert from 'node:assert/strict';

const base = (process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
let id;
let verificaciones = 0;
async function pedir(metodo, ruta = '', datos, esperado = 200) {
  const respuesta = await fetch(`${base}/api/avistamientos${ruta}`, {
    method: metodo, headers: datos ? { 'Content-Type': 'application/json' } : {},
    body: datos ? JSON.stringify(datos) : undefined, signal: AbortSignal.timeout(10000)
  });
  const cuerpo = await respuesta.json();
  assert.equal(respuesta.status, esperado, `${metodo} ${ruta}: ${JSON.stringify(cuerpo)}`);
  verificaciones++;
  return cuerpo;
}
try {
  const creado = await pedir('POST', '', { nombreComun: 'Guacamaya · Prueba de API', nombreCientifico: 'Ara macao', categoria: 'Ave', zona: 'Río Hacha', investigador: 'Prueba académica de API', latitud: 1.6144, longitud: -75.6062 }, 201);
  id = creado._id;
  assert.equal(creado.estadoConservacion, 'Preocupación menor');
  assert.ok((await pedir('GET')).some(registro => registro._id === id));
  assert.ok((await pedir('GET', '?categoria=Ave')).every(registro => registro.categoria === 'Ave'));
  const cambiado = await pedir('PUT', `/${id}`, { zona: 'Reserva natural El Caraño', estadoConservacion: 'Vulnerable' });
  assert.equal(cambiado.estadoConservacion, 'Vulnerable');
  assert.equal(cambiado.latitud, 1.6144);
  assert.equal((await pedir('GET')).find(registro => registro._id === id).zona, 'Reserva natural El Caraño');
  await pedir('POST', '', { nombreComun: 'Registro incompleto' }, 400);
  await pedir('PUT', `/${id}`, { estadoConservacion: 'Extinto' }, 400);
  await pedir('DELETE', '/id-invalido', undefined, 400);
  await pedir('DELETE', `/${id}`);
  assert.ok(!(await pedir('GET')).some(registro => registro._id === id));
  await pedir('PUT', `/${id}`, { zona: 'Río Hacha' }, 404);
  id = undefined;
  console.log(`${verificaciones} solicitudes verificadas correctamente en ${base}.`);
} catch (error) {
  console.error('No se completaron las pruebas:', error.message);
  process.exitCode = 1;
} finally {
  if (id) {
    try { await fetch(`${base}/api/avistamientos/${id}`, { method: 'DELETE', signal: AbortSignal.timeout(5000) }); }
    catch { console.error('Quedó un registro de prueba pendiente de eliminar:', id); }
  }
}
