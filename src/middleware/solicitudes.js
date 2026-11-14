import { randomUUID } from 'node:crypto';

// Historial temporal de la sesión del servidor. No registra cookies ni credenciales.
export function crearMonitor() {
  const solicitudes = [];
  function resumir(valor, nivel = 0) {
    if (Array.isArray(valor)) return { total: valor.length, registros: valor.slice(0, 2).map(item => resumir(item, nivel + 1)) };
    if (!valor || typeof valor !== 'object') return valor;
    if (typeof valor.toHexString === 'function') return valor.toHexString();
    if (nivel > 2) return '[objeto]';
    return Object.fromEntries(Object.entries(valor).filter(([clave]) => !/foto$|password|token|secret|authorization|cookie|uri/i.test(clave)).slice(0, 20)
      .map(([clave, dato]) => [clave, typeof dato === 'string' ? dato.slice(0, 250) : resumir(dato, nivel + 1)]));
  }
  return {
    middleware(req, res, next) {
      if (!req.path.startsWith('/api/avistamientos') || req.path.endsWith('/foto')) return next();
      const inicio = performance.now();
      let respuesta;
      const json = res.json;
      res.json = function (datos) { respuesta = resumir(datos); return json.call(this, datos); };
      res.once('finish', () => {
        solicitudes.unshift({
          id: randomUUID(), metodo: req.method, ruta: req.originalUrl.slice(0, 250),
          estado: res.statusCode, duracion: Math.round(performance.now() - inicio), fecha: new Date().toISOString(),
          datos: req.body ? resumir(req.body) : null,
          fotoAdjunta: Boolean(req.body?.foto),
          respuesta: respuesta ?? (res.statusCode === 303 ? { redireccion: res.getHeader('Location') } : null)
        });
        solicitudes.splice(50);
      });
      next();
    },
    listar(req, res) { res.set('Cache-Control', 'no-store').json(solicitudes); }
  };
}
