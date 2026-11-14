export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function esFormulario(req) {
  return Boolean(req.is('application/x-www-form-urlencoded'));
}

export function leerDatos(body, { actualizar = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Envía un objeto con los datos del avistamiento.');
  }
  const campos = ['nombreComun', 'nombreCientifico', 'categoria', 'zona',
    'estadoConservacion', 'investigador', 'fechaRegistro'];
  const datos = {};
  for (const campo of campos) {
    if (!Object.hasOwn(body, campo)) continue;
    if (typeof body[campo] !== 'string') {
      throw new HttpError(400, `El campo ${campo} debe ser texto.`);
    }
    // Omitir opcionales vacíos al crear permite aplicar los defaults del esquema.
    if (!actualizar && ['estadoConservacion', 'fechaRegistro'].includes(campo) && !body[campo].trim()) continue;
    if (actualizar && campo === 'fechaRegistro' && !body[campo].trim()) {
      throw new HttpError(400, 'La fecha de registro no puede quedar vacía.');
    }
    datos[campo] = body[campo].trim();
  }
  const hayLatitud = Object.hasOwn(body, 'latitud');
  const hayLongitud = Object.hasOwn(body, 'longitud');
  if (hayLatitud || hayLongitud) {
    if (!hayLatitud || !hayLongitud) throw new HttpError(400, 'Envía la latitud y la longitud juntas.');
    const vacio = (valor) => valor === '' || valor === null;
    if (vacio(body.latitud) && vacio(body.longitud)) {
      datos.latitud = null;
      datos.longitud = null;
    } else {
      for (const [campo, limite] of [['latitud', 90], ['longitud', 180]]) {
        const valor = body[campo];
        if (!['string', 'number'].includes(typeof valor) || String(valor).trim() === '' ||
          !Number.isFinite(Number(valor)) || Math.abs(Number(valor)) > limite) {
          throw new HttpError(400, `La ${campo} debe estar entre -${limite} y ${limite}.`);
        }
        datos[campo] = Number(valor);
      }
    }
  }
  if (Object.hasOwn(body, 'foto') && body.foto !== '') {
    validarFoto(body.foto);
    datos.foto = body.foto;
    datos.tieneFoto = true;
  }
  if (body.removerFoto === 'true' || body.removerFoto === true) {
    if (datos.foto) throw new HttpError(400, 'Elige entre reemplazar o quitar la foto.');
    datos.foto = '';
    datos.tieneFoto = false;
  }
  if (actualizar && !Object.keys(datos).length) {
    throw new HttpError(400, 'Incluye al menos un campo válido para actualizar.');
  }
  return datos;
}

export function validarFoto(foto) {
  if (typeof foto !== 'string') throw new HttpError(400, 'La fotografía no es válida.');
  const partes = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(foto);
  if (!partes || partes[2].length % 4 !== 0) throw new HttpError(400, 'Usa una imagen JPG, PNG o WebP válida.');
  if (partes[2].length > 2000000) throw new HttpError(400, 'La foto debe pesar como máximo 1,5 MB después de comprimirla.');
  const buffer = Buffer.from(partes[2], 'base64');
  const correcto = (partes[1] === 'jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
    (partes[1] === 'png' && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (partes[1] === 'webp' && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP');
  if (!correcto || buffer.length < 16) throw new HttpError(400, 'El contenido de la fotografía no coincide con su formato.');
  return { buffer, mime: `image/${partes[1]}` };
}

export function presentarAvistamiento(registro) {
  const datos = typeof registro.toObject === 'function' ? registro.toObject() : { ...registro };
  delete datos.foto;
  datos.tieneUbicacion = Number.isFinite(datos.latitud) && Number.isFinite(datos.longitud);
  datos.fotoUrl = datos.tieneFoto ? `/api/avistamientos/${datos._id}/foto` : '';
  datos.mapsUrl = datos.tieneUbicacion ? `https://www.google.com/maps/search/?api=1&query=${datos.latitud},${datos.longitud}` : '';
  return datos;
}
