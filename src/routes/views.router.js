import { Router } from 'express';
import mongoose from 'mongoose';
import Avistamiento, { CATEGORIAS } from '../models/Avistamiento.js';
import { HttpError } from '../utils/http.js';
import { datosInicio, datosFormulario } from '../utils/vistas.js';

const router = Router();
const mensajes = {
  creado: 'Avistamiento registrado correctamente.',
  actualizado: 'Los cambios se guardaron correctamente.',
  eliminado: 'El avistamiento se eliminó correctamente.'
};

router.get('/', async (req, res, next) => {
  try {
    const categoria = req.query.categoria || '';
    if (categoria && !CATEGORIAS.includes(categoria)) throw new HttpError(400, 'La categoría del filtro no es válida.');
    res.render('home', {
      ...await datosInicio(categoria),
      exito: Object.hasOwn(mensajes, req.query.exito || '') ? mensajes[req.query.exito] : ''
    });
  } catch (error) { next(error); }
});

router.get('/editar/:id', async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) throw new HttpError(400, 'El identificador del avistamiento no es válido.');
    const avistamiento = await Avistamiento.findById(req.params.id).lean();
    if (!avistamiento) throw new HttpError(404, 'No se encontró el avistamiento.');
    res.render('editar', { titulo: 'Editar avistamiento', ...datosFormulario(avistamiento) });
  } catch (error) { next(error); }
});

export default router;
