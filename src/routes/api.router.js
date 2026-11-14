import { Router } from 'express';
import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import Avistamiento, { CATEGORIAS } from '../models/Avistamiento.js';
import { HttpError, esFormulario, leerDatos, presentarAvistamiento, validarFoto } from '../utils/http.js';

const router = Router();

router.param('id', (req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) return next(new HttpError(400, 'El identificador del avistamiento no es válido.'));
  next();
});

function exigirFormato(req) {
  if (!req.is('application/json') && !esFormulario(req)) {
    throw new HttpError(415, 'Usa application/json o application/x-www-form-urlencoded.');
  }
}

router.get('/', async (req, res, next) => {
  try {
    const { categoria } = req.query;
    if (categoria !== undefined && !CATEGORIAS.includes(categoria)) throw new HttpError(400, 'La categoría del filtro no es válida.');
    const avistamientos = await Avistamiento.find(categoria ? { categoria } : {})
      .sort({ fechaRegistro: -1, _id: -1 }).lean();
    res.json(avistamientos.map(presentarAvistamiento));
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  req.formulario = 'crear';
  try {
    exigirFormato(req);
    const avistamiento = await Avistamiento.create(leerDatos(req.body));
    if (esFormulario(req)) return res.redirect(303, '/?exito=creado');
    return res.status(201).json(presentarAvistamiento(avistamiento));
  } catch (error) { next(error); }
});

async function actualizar(req, res, next) {
  req.formulario = 'editar';
  req.avistamientoId = req.params.id;
  try {
    exigirFormato(req);
    const datos = leerDatos(req.body, { actualizar: true });
    const avistamiento = await Avistamiento.findByIdAndUpdate(req.params.id,
      { $set: datos }, { returnDocument: 'after', runValidators: true });
    if (!avistamiento) throw new HttpError(404, 'No se encontró el avistamiento.');
    if (esFormulario(req)) return res.redirect(303, '/?exito=actualizado');
    return res.json(presentarAvistamiento(avistamiento));
  } catch (error) { next(error); }
}

async function eliminar(req, res, next) {
  try {
    const avistamiento = await Avistamiento.findByIdAndDelete(req.params.id);
    if (!avistamiento) throw new HttpError(404, 'No se encontró el avistamiento.');
    if (esFormulario(req)) return res.redirect(303, '/?exito=eliminado');
    return res.status(200).json({ mensaje: 'Avistamiento eliminado correctamente.', id: req.params.id });
  } catch (error) { next(error); }
}

router.put('/:id', actualizar);
router.post('/update/:id', actualizar);
router.delete('/:id', eliminar);
router.post('/delete/:id', eliminar);

router.get('/:id/foto', async (req, res, next) => {
  try {
    const registro = await Avistamiento.findById(req.params.id).select('+foto').lean();
    if (!registro?.foto) throw new HttpError(404, 'Este avistamiento no tiene fotografía.');
    const { buffer, mime } = validarFoto(registro.foto);
    const etag = `"${createHash('sha256').update(buffer).digest('hex')}"`;
    res.set({ 'Content-Type': mime, 'Cache-Control': 'private, max-age=0, must-revalidate', ETag: etag });
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    return res.send(buffer);
  } catch (error) { next(error); }
});

export default router;
