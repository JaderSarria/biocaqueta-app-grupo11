import Avistamiento, { CATEGORIAS, ESTADOS } from '../models/Avistamiento.js';
import { presentarAvistamiento, validarFoto } from './http.js';

export function opciones(valores, actual) {
  return valores.map((valor) => ({ valor, selected: valor === actual }));
}

export function datosFormulario(datos = {}) {
  const presentado = presentarAvistamiento(datos);
  let fotoValida = '';
  if (datos.foto) {
    try { validarFoto(datos.foto); fotoValida = datos.foto; } catch { /* No reconstruir imágenes inválidas en un error de formulario. */ }
  }
  return {
    datos: { ...presentado, foto: fotoValida },
    fotoPreview: fotoValida || presentado.fotoUrl,
    categoriasFormulario: opciones(CATEGORIAS, datos.categoria),
    estadosFormulario: opciones(ESTADOS, datos.estadoConservacion || ESTADOS[0])
  };
}

export async function datosInicio(categoria = '', datos = {}) {
  const filtro = categoria ? { categoria } : {};
  const [avistamientos, todos] = await Promise.all([
    Avistamiento.find(filtro).sort({ fechaRegistro: -1, _id: -1 }).lean(),
    Avistamiento.find().select('nombreCientifico zona estadoConservacion').lean()
  ]);
  return {
    titulo: 'Cuaderno de campo',
    avistamientos: avistamientos.map(presentarAvistamiento),
    categoriaActual: categoria,
    categoriasFiltro: opciones(CATEGORIAS, categoria),
    filtrado: Boolean(categoria),
    estadisticas: {
      registros: todos.length,
      especies: new Set(todos.map((item) => item.nombreCientifico.toLocaleLowerCase('es').trim())).size,
      zonas: new Set(todos.map((item) => item.zona.toLocaleLowerCase('es').trim())).size,
      amenazados: todos.filter((item) => item.estadoConservacion !== 'Preocupación menor').length
    },
    ...datosFormulario(datos)
  };
}
