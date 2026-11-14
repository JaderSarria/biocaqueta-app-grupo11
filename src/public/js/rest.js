// La página usa los mismos métodos REST que Postman: GET, POST (JSON), PUT y DELETE.
// Así el panel "Solicitudes" muestra las peticiones reales. Sin JavaScript, los
// formularios HTML siguen funcionando con POST + redirección 303.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const API = '/api/avistamientos';

  async function pedir(metodo, url, cuerpo) {
    const opciones = { method: metodo, headers: { Accept: 'application/json' } };
    if (cuerpo !== undefined) {
      opciones.headers['Content-Type'] = 'application/json';
      opciones.body = JSON.stringify(cuerpo);
    }
    const respuesta = await fetch(url, opciones);
    let datos = null;
    try { datos = await respuesta.json(); } catch { /* respuesta sin cuerpo */ }
    if (!respuesta.ok) {
      const error = new Error(datos?.error || `La API respondió ${respuesta.status}.`);
      error.detalles = datos?.detalles || [];
      throw error;
    }
    return datos;
  }

  function avisar(texto) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = texto;
    toast.hidden = false;
    setTimeout(() => { toast.hidden = true; }, 4500);
  }

  function mostrarError(formulario, error) {
    const contenedor = formulario.closest('.panel');
    contenedor?.parentElement?.querySelectorAll(':scope > .aviso.error').forEach((n) => n.remove());
    const caja = document.createElement('div');
    caja.className = 'aviso error';
    caja.setAttribute('role', 'alert');
    const titulo = document.createElement('strong');
    titulo.textContent = error.message;
    caja.append(titulo);
    if (error.detalles?.length) {
      const lista = document.createElement('ul');
      error.detalles.forEach((d) => { const li = document.createElement('li'); li.textContent = d; lista.append(li); });
      caja.append(lista);
    }
    contenedor?.before(caja);
    caja.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- POST (crear) y PUT (editar) con JSON ---------- */
  const formulario = $('#form-avistamiento');
  if (formulario && window.fetch) {
    const botones = $$('button[type="submit"]', formulario);
    const originales = botones.map((b) => b.innerHTML);
    const restaurar = () => botones.forEach((b, i) => { b.disabled = false; b.innerHTML = originales[i]; });
    const accion = formulario.getAttribute('action') || '';
    const edicion = accion.match(/\/update\/([a-f0-9]{24})$/i);

    // Se registra después de app.js: si su validación canceló el envío, no se hace nada.
    formulario.addEventListener('submit', async (evento) => {
      if (evento.defaultPrevented) return;
      evento.preventDefault();
      const datos = Object.fromEntries(new FormData(formulario));
      try {
        if (edicion) {
          await pedir('PUT', `${API}/${edicion[1]}`, datos);
          location.href = '/?exito=actualizado';
        } else {
          await pedir('POST', API, datos);
          location.href = '/?exito=creado';
        }
      } catch (error) {
        restaurar();
        mostrarError(formulario, error);
      }
    });
  }

  /* ---------- DELETE ---------- */
  // app.js muestra el diálogo de confirmación y llama a esta función al aceptar.
  window.eliminarAvistamiento = async (form) => {
    const id = (form.getAttribute('action') || '').split('/').pop();
    const tarjeta = form.closest('.tarjeta');
    try {
      await pedir('DELETE', `${API}/${id}`);
      if (tarjeta?.animate) {
        await tarjeta.animate(
          [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.8) rotate(-4deg)', filter: 'blur(4px)' }],
          { duration: 450, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' }
        ).finished;
      }
      location.href = '/?exito=eliminado';
    } catch (error) {
      avisar(error.message);
    }
  };

  /* ---------- GET con filtro de categoría ---------- */
  const tarjetas = $$('.tarjeta');
  const chips = $$('.chips-categoria .chip');
  const contador = $('#resultados-visibles');
  const sinResultados = $('#sin-resultados');

  function actualizarConteo() {
    if (!contador) return;
    const visibles = tarjetas.filter((t) => !t.hidden && !t.classList.contains('fuera-categoria')).length;
    contador.textContent = `${visibles} ${visibles === 1 ? 'registro' : 'registros'}`;
    if (sinResultados) sinResultados.hidden = visibles !== 0 || !tarjetas.length;
  }

  if (chips.length && window.fetch) {
    chips.forEach((chip) => chip.addEventListener('click', async (evento) => {
      const url = new URL(chip.href, location.origin);
      const categoria = url.searchParams.get('categoria') || '';
      evento.preventDefault();
      try {
        const lista = await pedir('GET', categoria ? `${API}?categoria=${encodeURIComponent(categoria)}` : API);
        const ids = new Set(lista.map((r) => r._id));
        // Si la API devuelve registros que no están en la página, se recarga con el filtro.
        if ([...ids].some((id) => !tarjetas.some((t) => t.dataset.id === id))) { location.href = chip.href; return; }
        tarjetas.forEach((t) => t.classList.toggle('fuera-categoria', !ids.has(t.dataset.id)));
        tarjetas.filter((t) => ids.has(t.dataset.id) && !t.hidden).forEach((t, i) => {
          t.classList.remove('reentrar'); void t.offsetWidth;
          t.style.setProperty('--retraso', `${Math.min(i, 8) * 0.05}s`);
          t.classList.add('reentrar', 'aparecida');
        });
        chips.forEach((c) => { const activo = c === chip; c.classList.toggle('activo', activo); activo ? c.setAttribute('aria-current', 'true') : c.removeAttribute('aria-current'); });
        history.replaceState(null, '', categoria ? `/?categoria=${encodeURIComponent(categoria)}#explorar` : '/#explorar');
        actualizarConteo();
      } catch (error) {
        avisar(error.message);
      }
    }));
    // La búsqueda de app.js también respeta el filtro de categoría al contar.
    $('#buscar-registro')?.addEventListener('input', () => setTimeout(actualizarConteo));
  }
})();
