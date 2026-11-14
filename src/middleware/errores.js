import { esFormulario } from '../utils/http.js';
import { datosInicio, datosFormulario } from '../utils/vistas.js';

export function describirError(error) {
  if (error.name === 'ValidationError') {
    return { status: 400, mensaje: 'Revisa los datos del formulario.',
      detalles: Object.values(error.errors).map((item) => item.kind === 'date'
        ? 'La fecha de registro no es válida' : item.message) };
  }
  if (error.name === 'CastError') return { status: 400, mensaje: 'El identificador o la fecha no son válidos.' };
  if (error.type === 'entity.parse.failed') return { status: 400, mensaje: 'El cuerpo JSON no es válido.' };
  if (error.type === 'entity.too.large') return { status: 413, mensaje: 'El cuerpo de la petición es demasiado grande.' };
  if (error.status >= 400 && error.status < 500) {
    return { status: error.status, mensaje: error.message };
  }
  return { status: 500, mensaje: 'No se pudo completar la operación. Inténtalo de nuevo.' };
}

export async function manejarError(error, req, res, next) {
  if (res.headersSent) return next(error);
  const { status, mensaje, detalles = [] } = describirError(error);
  if (status === 500) console.error('Error interno:', error.name);
  const esApi = req.path === '/api' || req.path.startsWith('/api/');
  if (esApi && !esFormulario(req)) {
    return res.status(status).json({ error: mensaje, ...(detalles.length ? { detalles } : {}) });
  }
  const base = { error: mensaje, detalles, titulo: 'Revisa el registro' };
  try {
    if (status === 400 && req.formulario === 'crear') {
      return res.status(status).render('home', { ...await datosInicio('', req.body), ...base });
    }
    if (status === 400 && req.formulario === 'editar') {
      return res.status(status).render('editar', {
        ...datosFormulario({ ...req.body, _id: req.avistamientoId }), ...base
      });
    }
  } catch {
    // Si también falla la consulta para reconstruir el formulario, mostrar el error simple.
  }
  return res.status(status).render('error', { ...base, codigo: status });
}
