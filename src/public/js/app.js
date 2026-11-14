document.documentElement.classList.add('js');
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const movimientoReducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
let toastTimer;
function avisar(texto) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = texto;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4500);
}
function estado(elemento, texto, error = false) {
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.classList.toggle('es-error', error);
}
function cerrarDialogo(dialogo) { if (dialogo?.open) dialogo.close(); }
$$('[data-close-dialog]').forEach(boton => boton.addEventListener('click', () => cerrarDialogo(boton.closest('dialog'))));
$$('dialog').forEach(dialogo => dialogo.addEventListener('click', evento => {
  if (evento.target !== dialogo) return;
  const rect = dialogo.getBoundingClientRect();
  if (evento.clientX < rect.left || evento.clientX > rect.right || evento.clientY < rect.top || evento.clientY > rect.bottom) dialogo.close();
}));

// Entrada suave de secciones y contadores; no oculta contenido si JavaScript no está activo.
if ('IntersectionObserver' in window && !movimientoReducido) {
  const observador = new IntersectionObserver(entradas => entradas.forEach(entrada => {
    if (!entrada.isIntersecting) return;
    entrada.target.classList.add('visible');
    $$('[data-counter]', entrada.target).forEach(contador => {
      const total = Number(contador.dataset.counter);
      const inicio = performance.now();
      function contar(ahora) {
        const avance = Math.min((ahora - inicio) / 850, 1);
        contador.textContent = Math.round(total * (1 - (1 - avance) ** 3));
        if (avance < 1) requestAnimationFrame(contar);
      }
      requestAnimationFrame(contar);
    });
    observador.unobserve(entrada.target);
  }), { threshold: 0.08 });
  $$('.reveal').forEach(elemento => { elemento.classList.add('preparada'); observador.observe(elemento); });
}

// Tres secciones del mismo formulario HTML; se conservan todos los campos al enviar.
const formulario = $('#form-avistamiento');
const paneles = $$('[data-step]');
const tabs = $$('[data-step-button]');
let paso = 0;
let fotoProcesando = false;
function activarPaso(indice, enfocar = false) {
  paso = Math.max(0, Math.min(indice, paneles.length - 1));
  paneles.forEach((panel, i) => {
    panel.classList.toggle('activo', paso === i);
    panel.setAttribute('aria-hidden', String(paso !== i));
  });
  tabs.forEach((tab, i) => {
    tab.classList.toggle('activo', paso === i);
    tab.setAttribute('aria-pressed', String(paso === i));
  });
  const siguiente = $('[data-next-step]');
  if (siguiente) siguiente.hidden = paso === paneles.length - 1;
  if (paso === 1) requestAnimationFrame(() => { iniciarSelector(); mapaSelector?.invalidateSize(); });
  if (enfocar) tabs[paso]?.focus({ preventScroll: true });
}
tabs.forEach((tab, i) => tab.addEventListener('click', () => activarPaso(i)));
tabs.forEach((tab, i) => tab.addEventListener('keydown', evento => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) return;
  evento.preventDefault();
  const nuevo = evento.key === 'Home' ? 0 : evento.key === 'End' ? 2 : (i + (evento.key === 'ArrowRight' ? 1 : 2)) % 3;
  activarPaso(nuevo, true);
}));
$('[data-next-step]')?.addEventListener('click', () => {
  const invalido = $$('input, select', paneles[paso]).find(campo => !campo.validity.valid);
  if (invalido) return invalido.reportValidity();
  activarPaso(paso + 1, true);
});
if (formulario) {
  formulario.noValidate = true;
  formulario.addEventListener('submit', evento => {
    if (fotoProcesando) { evento.preventDefault(); return avisar('Espera a que termine de prepararse la fotografía.'); }
    validarCoordenadas();
    const invalido = $$('input, select', formulario).find(campo => campo.willValidate && !campo.validity.valid);
    if (invalido) {
      evento.preventDefault();
      activarPaso(Number(invalido.closest('[data-step]')?.dataset.step || 0));
      invalido.reportValidity();
      invalido.focus();
      return;
    }
    $$('button[type="submit"]', formulario).forEach(boton => { boton.disabled = true; boton.textContent = 'Guardando tu encuentro…'; });
  });
}

// Ubicación: Leaflet + OpenStreetMap; la búsqueda se hace al pulsar el botón.
const centroInicial = [1.6144, -75.6062];
let mapaSelector;
let marcadorSelector;
let mapaDetalle;
let marcadorDetalle;
let mapaRegistros;
let grupoRegistros;
const latInput = $('#latitud');
const lngInput = $('#longitud');
function puntoValido(lat, lng) {
  return lat !== '' && lat !== null && lat !== undefined && lng !== '' && lng !== null && lng !== undefined &&
    Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180;
}
function enlaceMaps(lat, lng) { return 'https://www.google.com/maps/search/?api=1&query=' + Number(lat) + ',' + Number(lng); }
function iconoPunto() {
  return L.divIcon({ className: 'marcador-bio', html: '<span></span>', iconSize: [28, 32], iconAnchor: [13, 30], popupAnchor: [0, -27] });
}
function crearMapa(id, centro = centroInicial, zoom = 12) {
  const mapa = L.map(id, { scrollWheelZoom: false, worldCopyJump: true }).setView(centro, zoom);
  const capa = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, minZoom: 2,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
  }).addTo(mapa);
  let aviso = false;
  capa.on('tileerror', () => {
    if (aviso) return;
    aviso = true;
    if (id === 'mapa-selector') estado($('#estado-mapa'), 'No se pudo cargar el fondo del mapa. Puedes escribir las coordenadas o reintentar con Internet.', true);
  });
  return mapa;
}
function validarCoordenadas() {
  if (!latInput || !lngInput) return;
  latInput.setCustomValidity('');
  lngInput.setCustomValidity('');
  if (Boolean(latInput.value) !== Boolean(lngInput.value)) {
    (latInput.value ? lngInput : latInput).setCustomValidity('Completa la latitud y la longitud, o deja las dos vacías.');
  }
}
function actualizarPunto(lat, lng, moverVista = false) {
  if (!puntoValido(lat, lng)) return;
  lat = Number(lat); lng = Number(lng);
  latInput.value = lat.toFixed(6);
  lngInput.value = lng.toFixed(6);
  validarCoordenadas();
  if (mapaSelector) {
    if (!marcadorSelector) {
      marcadorSelector = L.marker([lat, lng], { draggable: true, icon: iconoPunto(), title: 'Arrastra para ajustar el lugar del avistamiento' }).addTo(mapaSelector);
      marcadorSelector.on('dragend', () => {
        const punto = marcadorSelector.getLatLng().wrap();
        actualizarPunto(punto.lat, punto.lng);
      });
    } else marcadorSelector.setLatLng([lat, lng]);
    if (moverVista) mapaSelector.setView([lat, lng], Math.max(15, mapaSelector.getZoom()));
  }
  const enlace = $('#abrir-google-maps');
  enlace.href = enlaceMaps(lat, lng);
  enlace.hidden = false;
  estado($('#estado-mapa'), 'Punto seleccionado · ' + lat.toFixed(6) + ', ' + lng.toFixed(6));
}
function iniciarSelector() {
  if (mapaSelector || !$('#mapa-selector')) return;
  if (!window.L) return estado($('#estado-mapa'), 'No se pudo abrir el mapa. Puedes escribir las coordenadas manualmente.', true);
  const tienePunto = puntoValido(latInput.value, lngInput.value);
  mapaSelector = crearMapa('mapa-selector', tienePunto ? [Number(latInput.value), Number(lngInput.value)] : centroInicial, tienePunto ? 15 : 12);
  mapaSelector.on('click', evento => {
    const punto = evento.latlng.wrap();
    actualizarPunto(punto.lat, punto.lng);
  });
  if (tienePunto) actualizarPunto(latInput.value, lngInput.value);
}
[latInput, lngInput].filter(Boolean).forEach(input => input.addEventListener('input', () => {
  validarCoordenadas();
  if (puntoValido(latInput.value, lngInput.value)) {
    const enlace = $('#abrir-google-maps');
    enlace.href = enlaceMaps(latInput.value, lngInput.value);
    enlace.hidden = false;
    if (marcadorSelector) marcadorSelector.setLatLng([Number(latInput.value), Number(lngInput.value)]);
  } else {
    $('#abrir-google-maps').hidden = true;
    if (marcadorSelector) { marcadorSelector.remove(); marcadorSelector = undefined; }
  }
}));
[latInput, lngInput].filter(Boolean).forEach(input => input.addEventListener('change', () => {
  if (puntoValido(latInput.value, lngInput.value)) actualizarPunto(latInput.value, lngInput.value, true);
}));
$('#quitar-ubicacion')?.addEventListener('click', () => {
  latInput.value = ''; lngInput.value = '';
  validarCoordenadas();
  if (marcadorSelector) { marcadorSelector.remove(); marcadorSelector = undefined; }
  $('#abrir-google-maps').hidden = true;
  estado($('#estado-mapa'), 'Punto retirado. Puedes guardar únicamente el nombre de la zona.');
});
$('#mi-ubicacion')?.addEventListener('click', () => {
  if (!navigator.geolocation) return estado($('#estado-mapa'), 'Tu navegador no permite consultar la ubicación.', true);
  const boton = $('#mi-ubicacion');
  boton.disabled = true;
  estado($('#estado-mapa'), 'Consultando tu ubicación…');
  navigator.geolocation.getCurrentPosition(posicion => {
    boton.disabled = false;
    iniciarSelector();
    actualizarPunto(posicion.coords.latitude, posicion.coords.longitude, true);
    estado($('#estado-mapa'), 'Ubicación recibida. Precisión aproximada: ' + Math.round(posicion.coords.accuracy) + ' m. Ajusta el marcador si hace falta.');
  }, () => {
    boton.disabled = false;
    estado($('#estado-mapa'), 'No pudimos consultar tu ubicación. Puedes buscar un lugar o marcar el mapa.', true);
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
});
async function buscarLugar() {
  const consulta = $('#buscar-lugar').value.trim();
  if (consulta.length < 3) return estado($('#estado-mapa'), 'Escribe al menos tres caracteres para buscar.', true);
  const boton = $('#buscar-mapa');
  const resultados = $('#resultados-lugares');
  boton.disabled = true;
  resultados.hidden = true;
  estado($('#estado-mapa'), 'Buscando el lugar…');
  try {
    const respuesta = await fetch('/api/lugares?q=' + encodeURIComponent(consulta), { signal: AbortSignal.timeout(10000) });
    const datos = await respuesta.json();
    if (!respuesta.ok) throw new Error(datos.error);
    resultados.replaceChildren();
    if (!datos.length) return estado($('#estado-mapa'), 'No encontramos ese lugar. Prueba agregando municipio y departamento.', true);
    datos.forEach(lugar => {
      const opcion = document.createElement('button');
      opcion.type = 'button'; opcion.className = 'resultado-lugar'; opcion.textContent = lugar.nombre;
      opcion.addEventListener('click', () => {
        iniciarSelector();
        actualizarPunto(lugar.latitud, lugar.longitud, true);
        if (!$('#zona').value.trim()) $('#zona').value = lugar.nombre.split(',').slice(0, 2).join(',');
        resultados.hidden = true;
        $('#buscar-lugar').value = lugar.nombre.slice(0, 120);
      });
      resultados.append(opcion);
    });
    resultados.hidden = false;
    estado($('#estado-mapa'), 'Elige un resultado y ajusta el punto exacto en el mapa.');
  } catch (error) { estado($('#estado-mapa'), error.name === 'TimeoutError' ? 'La búsqueda tardó demasiado. Prueba de nuevo o marca el mapa.' : error.message || 'No se pudo buscar el lugar.', true); }
  finally { boton.disabled = false; }
}
$('#buscar-mapa')?.addEventListener('click', buscarLugar);
$('#buscar-lugar')?.addEventListener('keydown', evento => { if (evento.key === 'Enter') { evento.preventDefault(); buscarLugar(); } });
if (paneles.length) activarPaso(0);

// Vista previa y compresión local. Atlas recibe la foto únicamente al guardar.
let secuenciaFoto = 0;
async function prepararFoto(archivo) {
  if (!archivo) return;
  const secuencia = ++secuenciaFoto;
  fotoProcesando = false;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) return estado($('#estado-foto'), 'Selecciona una fotografía JPG, PNG o WebP.', true);
  if (archivo.size > 10 * 1024 * 1024) return estado($('#estado-foto'), 'La fotografía de origen no puede superar 10 MB.', true);
  fotoProcesando = true;
  estado($('#estado-foto'), 'Preparando la fotografía…');
  try {
    const imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
    const proporcion = Math.min(1, 1500 / Math.max(imagen.width, imagen.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(imagen.width * proporcion));
    canvas.height = Math.max(1, Math.round(imagen.height * proporcion));
    const contexto = canvas.getContext('2d');
    contexto.fillStyle = '#fff'; contexto.fillRect(0, 0, canvas.width, canvas.height);
    contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
    imagen.close();
    let foto = canvas.toDataURL('image/jpeg', 0.84);
    if (foto.split(',')[1].length > 2000000) foto = canvas.toDataURL('image/jpeg', 0.65);
    if (foto.split(',')[1].length > 2000000) throw new Error('La imagen sigue siendo demasiado pesada. Prueba una fotografía más pequeña.');
    if (secuencia !== secuenciaFoto) return;
    $('#foto').value = foto;
    $('#removerFoto').value = 'false';
    $('#foto-preview').src = foto;
    $('#foto-preview').hidden = false;
    $('#foto-vacia').hidden = true;
    $('#quitar-foto').hidden = false;
    estado($('#estado-foto'), 'Foto lista · ' + Math.round(foto.split(',')[1].length * 0.75 / 1024) + ' KB. Se guardará al enviar el registro.');
  } catch (error) {
    if (secuencia === secuenciaFoto) estado($('#estado-foto'), error.message || 'No se pudo preparar la foto. Intenta con otra imagen.', true);
  } finally {
    if (secuencia === secuenciaFoto) fotoProcesando = false;
    $('#archivo-foto').value = '';
  }
}
$('#archivo-foto')?.addEventListener('change', evento => prepararFoto(evento.target.files[0]));
const zonaFoto = $('#zona-foto');
['dragenter', 'dragover'].forEach(nombre => zonaFoto?.addEventListener(nombre, evento => { evento.preventDefault(); zonaFoto.classList.add('arrastrando'); }));
['dragleave', 'drop'].forEach(nombre => zonaFoto?.addEventListener(nombre, evento => { evento.preventDefault(); zonaFoto.classList.remove('arrastrando'); }));
zonaFoto?.addEventListener('drop', evento => prepararFoto(evento.dataTransfer.files[0]));
$('#quitar-foto')?.addEventListener('click', () => {
  secuenciaFoto++; fotoProcesando = false;
  $('#foto').value = ''; $('#removerFoto').value = 'true';
  $('#foto-preview').hidden = true; $('#foto-preview').removeAttribute('src');
  $('#foto-vacia').hidden = false; $('#quitar-foto').hidden = true; $('#archivo-foto').value = '';
  estado($('#estado-foto'), 'La foto se quitará cuando guardes los cambios.');
});

// Eliminar conserva el formulario nativo y exige una decisión en el diálogo.
const confirmar = $('#confirmar-eliminacion');
let formularioPendiente;
$$('.form-eliminar').forEach(form => form.addEventListener('submit', evento => {
  if (!confirmar?.showModal) return;
  evento.preventDefault();
  formularioPendiente = form;
  $('#detalle-eliminar').textContent = form.dataset.nombre;
  confirmar.returnValue = 'cancelar';
  confirmar.showModal();
}));
confirmar?.addEventListener('close', () => {
  if (confirmar.returnValue === 'eliminar' && formularioPendiente) {
    if (window.eliminarAvistamiento) window.eliminarAvistamiento(formularioPendiente);
    else formularioPendiente.submit();
  }
  formularioPendiente = undefined;
});

// Tarjetas, búsqueda local y mapa general con los puntos existentes.
const tarjetas = $$('.tarjeta');
const normalizar = valor => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
let vistaActual = 'tarjetas';
function popupRegistro(tarjeta) {
  const contenido = document.createElement('div');
  const nombre = document.createElement('strong'); nombre.textContent = tarjeta.dataset.nombre;
  const zona = document.createElement('p'); zona.textContent = tarjeta.dataset.zona;
  const enlace = document.createElement('a'); enlace.href = enlaceMaps(tarjeta.dataset.lat, tarjeta.dataset.lng);
  enlace.target = '_blank'; enlace.rel = 'noopener noreferrer'; enlace.textContent = 'Abrir en Google Maps ↗';
  contenido.append(nombre, zona, enlace);
  return contenido;
}
function actualizarMapaRegistros() {
  if (!window.L || !$('#mapa-registros')) return;
  if (!mapaRegistros) { mapaRegistros = crearMapa('mapa-registros'); grupoRegistros = L.featureGroup().addTo(mapaRegistros); }
  grupoRegistros.clearLayers();
  tarjetas.filter(tarjeta => !tarjeta.hidden && !tarjeta.classList.contains('fuera-categoria') && puntoValido(tarjeta.dataset.lat, tarjeta.dataset.lng)).forEach(tarjeta => {
    L.marker([Number(tarjeta.dataset.lat), Number(tarjeta.dataset.lng)], { icon: iconoPunto(), title: tarjeta.dataset.nombre })
      .bindPopup(popupRegistro(tarjeta)).addTo(grupoRegistros);
  });
  mapaRegistros.invalidateSize();
  if (grupoRegistros.getLayers().length) mapaRegistros.fitBounds(grupoRegistros.getBounds().pad(0.2), { maxZoom: 15 });
}
$$('[data-view]').forEach(boton => boton.addEventListener('click', () => {
  vistaActual = boton.dataset.view;
  $$('[data-view]').forEach(b => { b.classList.toggle('activo', b === boton); b.setAttribute('aria-pressed', String(b === boton)); });
  $('#lista-tarjetas').hidden = vistaActual === 'mapa';
  $('#vista-mapa').hidden = vistaActual !== 'mapa';
  if (vistaActual === 'mapa') requestAnimationFrame(actualizarMapaRegistros);
}));
$('#buscar-registro')?.addEventListener('input', evento => {
  const consulta = normalizar(evento.target.value);
  tarjetas.forEach(tarjeta => { tarjeta.hidden = !normalizar(tarjeta.dataset.search).includes(consulta); });
  const visibles = tarjetas.filter(tarjeta => !tarjeta.hidden).length;
  $('#resultados-visibles').textContent = visibles + (visibles === 1 ? ' registro' : ' registros');
  $('#sin-resultados').hidden = visibles !== 0 || !tarjetas.length;
  if (vistaActual === 'mapa') actualizarMapaRegistros();
});
$$('.ver-ubicacion').forEach(boton => boton.addEventListener('click', () => {
  const lat = Number(boton.dataset.lat), lng = Number(boton.dataset.lng);
  $('#titulo-ubicacion').textContent = boton.dataset.nombre;
  $('#coordenadas-detalle').textContent = lat.toFixed(6) + ', ' + lng.toFixed(6);
  $('#maps-detalle').href = enlaceMaps(lat, lng);
  $('#ubicacion-modal').showModal();
  if (!window.L) return;
  requestAnimationFrame(() => {
    if (!mapaDetalle) mapaDetalle = crearMapa('mapa-detalle', [lat, lng], 15);
    mapaDetalle.invalidateSize(); mapaDetalle.setView([lat, lng], 15);
    if (marcadorDetalle) marcadorDetalle.setLatLng([lat, lng]);
    else marcadorDetalle = L.marker([lat, lng], { icon: iconoPunto() }).addTo(mapaDetalle);
  });
}));

// Panel oculto: solo consulta el historial mientras está abierto.
const drawer = $('#solicitudes-panel');
const botonDrawer = $('#abrir-solicitudes');
let historial = [];
let intervaloMonitor;
let monitorCargando = false;
function elemento(tag, clase, texto) {
  const nodo = document.createElement(tag);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}
function pintarSolicitudes() {
  const lista = $('#lista-solicitudes');
  const abiertos = new Set($$('details[open]', lista).map(item => item.dataset.id));
  const filtro = $('#filtro-solicitudes').value;
  const datos = historial.filter(item => filtro === 'todas' || (filtro === 'errores' ? item.estado >= 400 : item.metodo === filtro));
  $('#conteo-solicitudes').textContent = datos.length;
  lista.replaceChildren();
  if (!datos.length) {
    const vacio = elemento('div', 'monitor-vacio');
    vacio.append(elemento('strong', '', historial.length ? 'Sin coincidencias.' : 'Todo empieza con una acción.'), elemento('p', '', 'Registra, consulta o edita un avistamiento para ver aquí su solicitud.'));
    lista.append(vacio); return;
  }
  datos.forEach(item => {
    const tarjeta = elemento('details', 'solicitud'); tarjeta.dataset.id = item.id; tarjeta.open = abiertos.has(item.id);
    const resumen = elemento('summary');
    const linea = elemento('span', 'solicitud-linea');
    linea.append(elemento('span', 'metodo ' + item.metodo, item.metodo), elemento('span', 'http-estado' + (item.estado >= 400 ? ' error-http' : ''), item.estado), elemento('span', 'duracion', item.duracion + ' ms'));
    resumen.append(linea, elemento('span', 'solicitud-ruta', item.ruta), elemento('span', 'solicitud-hora', new Date(item.fecha).toLocaleTimeString('es-CO') + ' · Toca para ver detalles'));
    const detalle = elemento('div', 'solicitud-detalle');
    detalle.append(elemento('h3', '', 'Datos enviados'), elemento('pre', '', JSON.stringify(item.datos || {}, null, 2)));
    if (item.fotoAdjunta) detalle.append(elemento('p', 'nota', 'Fotografía adjunta · Se omite su contenido del historial.'));
    detalle.append(elemento('h3', '', 'Respuesta'), elemento('pre', '', JSON.stringify(item.respuesta || {}, null, 2)));
    tarjeta.append(resumen, detalle); lista.append(tarjeta);
  });
}
async function consultarSolicitudes() {
  if (monitorCargando || document.hidden || !drawer?.open) return;
  monitorCargando = true;
  try {
    const respuesta = await fetch('/api/solicitudes', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!respuesta.ok) throw new Error('No se pudo consultar el historial.');
    const nuevos = await respuesta.json();
    if (JSON.stringify(nuevos) !== JSON.stringify(historial) || !$('#lista-solicitudes').children.length) {
      historial = nuevos; pintarSolicitudes();
    }
    $('#monitor-status').textContent = 'En vivo · Actividad de esta sesión';
  } catch { $('#monitor-status').textContent = 'Sin conexión. Pulsa Actualizar para reintentar.'; }
  finally { monitorCargando = false; }
}
botonDrawer?.addEventListener('click', () => {
  drawer.showModal(); botonDrawer.setAttribute('aria-expanded', 'true');
  pintarSolicitudes(); consultarSolicitudes();
  clearInterval(intervaloMonitor); intervaloMonitor = setInterval(consultarSolicitudes, 4000);
});
drawer?.addEventListener('close', () => { clearInterval(intervaloMonitor); botonDrawer.setAttribute('aria-expanded', 'false'); });
$('#filtro-solicitudes')?.addEventListener('change', pintarSolicitudes);
$('#actualizar-solicitudes')?.addEventListener('click', consultarSolicitudes);

