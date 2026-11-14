import { Router } from 'express';
import { HttpError } from '../utils/http.js';

export function crearMapaRouter() {
  const router = Router();
  const cache = new Map();
  let ultimaConsulta = 0;
  router.get('/lugares', async (req, res, next) => {
    try {
      const consulta = typeof req.query.q === 'string' ? req.query.q.trim() : '';
      if (consulta.length < 3 || consulta.length > 120) throw new HttpError(400, 'Escribe entre 3 y 120 caracteres para buscar el lugar.');
      const clave = consulta.toLocaleLowerCase('es');
      const guardado = cache.get(clave);
      if (guardado && guardado.vence > Date.now()) return res.json(guardado.datos);
      if (Date.now() - ultimaConsulta < 1100) throw new HttpError(429, 'Espera un segundo antes de buscar otro lugar.');
      ultimaConsulta = Date.now();
      const url = new URL(process.env.GEOCODER_URL || 'https://nominatim.openstreetmap.org/search');
      url.search = new URLSearchParams({ q: consulta, format: 'jsonv2', limit: '5', 'accept-language': 'es' }).toString();
      const respuesta = await fetch(url, { headers: { 'User-Agent': 'BioCaqueta/2.0 (academic biodiversity field notebook)', Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (!respuesta.ok) throw new Error('Geocodificador no disponible');
      const origen = await respuesta.json();
      if (!Array.isArray(origen)) throw new Error('Respuesta geográfica inválida');
      const datos = origen.map((lugar) => ({ nombre: String(lugar.display_name || '').slice(0, 300), latitud: Number(lugar.lat), longitud: Number(lugar.lon) }))
        .filter((lugar) => lugar.nombre && Number.isFinite(lugar.latitud) && Math.abs(lugar.latitud) <= 90 && Number.isFinite(lugar.longitud) && Math.abs(lugar.longitud) <= 180);
      if (cache.size >= 100) cache.delete(cache.keys().next().value);
      cache.set(clave, { vence: Date.now() + 300000, datos });
      res.json(datos);
    } catch (error) {
      next(error instanceof HttpError ? error : new HttpError(503, 'La búsqueda no está disponible. Puedes marcar el mapa o escribir las coordenadas.'));
    }
  });
  return router;
}
