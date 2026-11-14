// Estructura interactiva de BioCaquetá: hoja de registro lateral y ficha emergente de cada tarjeta.
// Solo presentación: el formulario, la API y la eliminación siguen siendo los mismos de app.js.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVG = 'http://www.w3.org/2000/svg';
  const ICONOS = '/images/iconos.svg#';

  function icono(id, clase = 'icon') {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', clase);
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG, 'use');
    use.setAttribute('href', ICONOS + id);
    svg.append(use);
    return svg;
  }
  function el(tag, clase, hijos = [], attrs = {}) {
    const nodo = document.createElement(tag);
    if (clase) nodo.className = clase;
    Object.entries(attrs).forEach(([k, v]) => nodo.setAttribute(k, v));
    [].concat(hijos).forEach((h) => { if (h !== null && h !== undefined) nodo.append(h); });
    return nodo;
  }
  const hayDialogoAbierto = () => Boolean($('dialog[open]'));

  /* ======================================================================
     Hoja lateral de registro (página nueva del cuaderno)
     ====================================================================== */
  const hoja = $('#registrar.hoja-registro');
  const fondoHoja = $('.hoja-fondo');
  let ultimoFoco;

  function abrirHoja(inmediato = false) {
    if (!hoja || hoja.classList.contains('abierta')) return;
    ultimoFoco = document.activeElement;
    hoja.inert = false;
    hoja.classList.toggle('sin-transicion', inmediato);
    hoja.classList.add('abierta');
    fondoHoja?.classList.add('visible');
    document.body.classList.add('hoja-abierta');
    // Leaflet recalcula su tamaño al recibir un resize cuando la hoja ya está visible.
    setTimeout(() => dispatchEvent(new Event('resize')), inmediato ? 50 : 750);
    if (!inmediato) setTimeout(() => $('input, select', hoja)?.focus({ preventScroll: true }), 650);
  }
  function cerrarHoja() {
    if (!hoja?.classList.contains('abierta')) return;
    hoja.classList.remove('abierta', 'sin-transicion');
    fondoHoja?.classList.remove('visible');
    document.body.classList.remove('hoja-abierta');
    setTimeout(() => { if (!hoja.classList.contains('abierta')) hoja.inert = true; }, 700);
    ultimoFoco?.focus?.({ preventScroll: true });
  }

  if (hoja) {
    hoja.inert = true;
    document.addEventListener('click', (evento) => {
      const enlace = evento.target.closest('[data-abrir-registro], a[href="#registrar"], a[href="/#registrar"]');
      if (enlace) { evento.preventDefault(); abrirHoja(); return; }
      if (evento.target.closest('[data-cerrar-registro]')) cerrarHoja();
    });
    if ($('.aviso.error', hoja) || location.hash === '#registrar') {
      requestAnimationFrame(() => abrirHoja(true));
      if (location.hash === '#registrar') history.replaceState(null, '', location.pathname + location.search);
    }
  }

  /* ======================================================================
     Ficha emergente: la tarjeta gira y crece hasta su forma grande
     ====================================================================== */
  const tarjetas = $$('.tarjeta');
  let ficha = null;

  function construirFicha(tarjeta) {
    const d = tarjeta.dataset;
    const numero = String(tarjetas.indexOf(tarjeta) + 1).padStart(2, '0');
    const clase = d.clase || 'flora';
    const foto = $('.foto-avistamiento', tarjeta)?.getAttribute('src');
    const lat = Number(d.lat);
    const lng = Number(d.lng);
    const conPunto = d.lat !== '' && d.lng !== '' && Number.isFinite(lat) && Number.isFinite(lng);

    // Portada grande
    const portada = el('div', `ficha-portada ${clase}`, [
      el('span', 'ficha-anillo', [], { 'aria-hidden': 'true' }),
      foto ? el('img', 'ficha-foto', [], { src: foto, alt: `Fotografía registrada de ${d.nombre}` })
        : el('div', 'ficha-ilustracion', [icono(clase, 'ficha-animal'), el('span', '', 'Una historia por fotografiar')]),
      el('span', 'categoria', d.categoria),
      el('span', `estado ${d.estadoClase}`, [el('span', '', '●', { 'aria-hidden': 'true' }), ` ${d.estado}`]),
      el('span', 'ficha-numero', `Nº ${numero}`)
    ]);

    // Datos
    const dato = (id, etiqueta, valor, extra) => el('div', 'ficha-dato', [
      el('span', 'ficha-dato-icono', icono(id)),
      el('div', '', [el('dt', '', etiqueta), el('dd', '', valor)]),
      extra
    ]);
    const datos = el('dl', 'ficha-datos', [
      dato('pin', 'Zona', d.zona),
      dato('calendar', 'Fecha de registro', d.fecha),
      dato('locate', 'Coordenadas', conPunto ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Sin punto exacto'),
      dato('eye', 'Registrado por', d.investigador)
    ]);

    const editar = $('a.editar', tarjeta);
    const formEliminar = $('.form-eliminar', tarjeta);
    const acciones = el('div', 'ficha-acciones', [
      editar ? el('a', 'boton', ['Editar registro', icono('edit')], { href: editar.getAttribute('href') }) : null,
      conPunto ? el('a', 'boton secundario', ['Google Maps', icono('arrow')], {
        href: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, target: '_blank', rel: 'noopener noreferrer'
      }) : null,
      formEliminar ? el('button', 'boton-icono ficha-eliminar', icono('trash'), { type: 'button', 'aria-label': `Eliminar ${d.nombre}` }) : null
    ]);

    const cuerpo = el('div', 'ficha-cuerpo', [
      el('div', 'ficha-top', [
        el('span', 'etiqueta', `FICHA DE CAMPO · Nº ${numero}`),
        el('button', 'boton-icono ficha-cerrar', icono('close'), { type: 'button', 'aria-label': 'Cerrar ficha' })
      ]),
      el('h2', '', d.nombre, { id: 'ficha-titulo' }),
      el('p', 'cientifico', d.cientifico),
      el('div', `medidor ${d.estadoClase}`, [
        el('span', 'medidor-etiqueta', `Riesgo · ${d.estado}`),
        el('span', 'medidor-barras', [el('i'), el('i'), el('i')])
      ]),
      datos,
      conPunto ? el('div', 'ficha-mapa', [], { id: 'ficha-mapa', 'aria-label': `Mapa de ${d.nombre}` }) : null,
      acciones
    ]);
    $$(':scope > *', cuerpo).forEach((hijo, i) => hijo.style.setProperty('--i', i));

    const cubierta = el('div', `ficha-cubierta ${clase}`, [
      icono(clase, 'ficha-cubierta-animal'),
      el('strong', '', d.nombre)
    ], { 'aria-hidden': 'true' });

    const ventana = el('article', `ficha-ventana ${clase}`, [portada, cuerpo, cubierta], {
      role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ficha-titulo', tabindex: '-1'
    });
    const capa = el('div', 'ficha-capa', [el('div', 'ficha-fondo'), ventana]);
    return { capa, ventana, cuerpo, cubierta, formEliminar, conPunto, lat, lng };
  }

  function geometria(tarjeta, ventana) {
    const c = tarjeta.getBoundingClientRect();
    const f = ventana.getBoundingClientRect();
    return {
      dx: (c.left + c.width / 2) - (f.left + f.width / 2),
      dy: (c.top + c.height / 2) - (f.top + f.height / 2),
      cw: c.width, ch: c.height, fw: f.width, fh: f.height,
      visible: c.width > 0 && c.bottom > 0 && c.top < innerHeight
    };
  }
  const mezclar = (a, b, t) => a + (b - a) * t;

  // La ventana cambia su tamaño real (no se deforma) mientras gira y viaja hacia el centro.
  function cuadrosApertura({ dx, dy, cw, ch, fw, fh }) {
    const tam = (t, extra = 1) => ({ width: `${mezclar(cw, fw, t) * extra}px`, height: `${mezclar(ch, fh, t) * extra}px` });
    return [
      { ...tam(0), transform: `translate(${dx}px, ${dy}px) rotate(0deg)`, borderRadius: '24px', offset: 0 },
      { ...tam(0.12, 1.06), transform: `translate(${dx * 0.62}px, ${dy * 0.62 - 60}px) rotate(-170deg)`, offset: 0.3 },
      { ...tam(0.62), transform: `translate(${dx * 0.16}px, ${dy * 0.16}px) rotate(-325deg)`, offset: 0.62 },
      { ...tam(1, 1.025), transform: 'translate(0, 0) rotate(-366deg)', offset: 0.84 },
      { ...tam(1), transform: 'translate(0, 0) rotate(-360deg)', borderRadius: '30px', offset: 1 }
    ];
  }

  function abrirFicha(tarjeta) {
    if (ficha) return;
    const partes = construirFicha(tarjeta);
    ficha = { ...partes, tarjeta, foco: document.activeElement };
    document.body.append(partes.capa);
    document.body.classList.add('ficha-abierta');

    const fin = () => {
      partes.ventana.classList.add('revelada');
      $('.ficha-cerrar', partes.ventana)?.focus({ preventScroll: true });
      crearMapa();
    };

    if (reducido) {
      partes.capa.classList.add('visible');
      partes.cubierta.remove();
      partes.ventana.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 250, easing: 'ease-out' });
      fin();
      return;
    }

    const g = geometria(tarjeta, partes.ventana);
    tarjeta.classList.add('en-ficha');
    requestAnimationFrame(() => partes.capa.classList.add('visible'));
    const duracion = 1150;
    ficha.animacion = partes.ventana.animate(cuadrosApertura(g), { duration: duracion, easing: 'cubic-bezier(.45,.05,.2,1)', fill: 'both' });
    partes.cubierta.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: duracion + 250, easing: 'ease', fill: 'forwards' });
    ficha.animacion.onfinish = () => { ficha.animacion.cancel(); fin(); };
  }

  function cerrarFicha(inmediato = false) {
    if (!ficha || ficha.cerrando) return;
    const f = ficha;
    f.cerrando = true;
    const terminar = () => {
      f.mapa?.remove();
      f.capa.remove();
      f.tarjeta.classList.remove('en-ficha');
      document.body.classList.remove('ficha-abierta');
      if (!inmediato) f.foco?.focus?.({ preventScroll: true });
      ficha = null;
    };
    if (inmediato || reducido) { terminar(); return; }

    f.ventana.classList.remove('revelada');
    f.capa.classList.remove('visible');
    f.animacion?.cancel();
    const g = geometria(f.tarjeta, f.ventana);
    if (!g.visible || f.tarjeta.hidden) {
      f.ventana.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.85) rotate(12deg)' }], { duration: 380, easing: 'ease-in', fill: 'forwards' }).onfinish = terminar;
      return;
    }
    f.cubierta.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, fill: 'forwards' });
    const cuadros = cuadrosApertura(g).reverse().map((c) => ({ ...c, offset: 1 - c.offset }));
    f.ventana.animate(cuadros, { duration: 900, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' }).onfinish = terminar;
  }

  function crearMapa() {
    if (!ficha?.conPunto || !window.L || !$('#ficha-mapa')) return;
    const mapa = L.map('ficha-mapa', { scrollWheelZoom: false, zoomControl: false, attributionControl: true }).setView([ficha.lat, ficha.lng], 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap'
    }).addTo(mapa);
    L.marker([ficha.lat, ficha.lng], {
      icon: L.divIcon({ className: 'marcador-bio', html: '<span></span>', iconSize: [28, 32], iconAnchor: [13, 30] })
    }).addTo(mapa);
    ficha.mapa = mapa;
    setTimeout(() => mapa.invalidateSize(), 300);
  }

  // Abrir: clic en cualquier parte de la tarjeta, salvo en sus botones y enlaces propios.
  document.addEventListener('click', (evento) => {
    const tarjeta = evento.target.closest('.tarjeta');
    if (tarjeta && !ficha) {
      const interactivo = evento.target.closest('a, button, form, input, select, label');
      if (interactivo && !interactivo.classList.contains('ver-ficha')) return;
      abrirFicha(tarjeta);
      return;
    }
    if (!ficha) return;
    if (evento.target.closest('.ficha-cerrar') || evento.target.classList.contains('ficha-fondo')) cerrarFicha();
    if (evento.target.closest('.ficha-eliminar')) {
      const form = ficha.formEliminar;
      cerrarFicha(true);
      form?.requestSubmit();
    }
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && !hayDialogoAbierto()) {
      if (ficha) { evento.preventDefault(); cerrarFicha(); return; }
      if (hoja?.classList.contains('abierta')) { evento.preventDefault(); cerrarHoja(); }
    }
    // Mantener el foco dentro de la ficha o de la hoja mientras están abiertas.
    if (evento.key !== 'Tab') return;
    const contenedor = ficha ? ficha.ventana : (hoja?.classList.contains('abierta') ? hoja : null);
    if (!contenedor || hayDialogoAbierto()) return;
    const enfocables = $$('a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select, [tabindex]:not([tabindex="-1"])', contenedor)
      .filter((n) => n.offsetParent !== null);
    if (!enfocables.length) return;
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo.focus(); }
    else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
  });
})();
