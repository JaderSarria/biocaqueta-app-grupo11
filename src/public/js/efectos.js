// Efectos visuales de BioCaquetá. Solo decoración: no modifica formularios, API ni mapa.
(() => {
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tactil = matchMedia('(hover: none)').matches;
  const raiz = document.documentElement;
  const cabecera = document.querySelector('.cabecera');
  const progreso = document.querySelector('.progreso-scroll');

  // Barra de progreso y cabecera compacta al desplazarse.
  let pendiente = false;
  function alDesplazar() {
    pendiente = false;
    const max = raiz.scrollHeight - innerHeight;
    progreso?.style.setProperty('--progreso', max > 0 ? (scrollY / max).toFixed(4) : 0);
    cabecera?.classList.toggle('compacta', scrollY > 40);
  }
  addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(alDesplazar); } }, { passive: true });
  alDesplazar();

  // Onda al pulsar botones.
  document.addEventListener('pointerdown', (evento) => {
    const boton = evento.target.closest('.boton');
    if (!boton || reducido) return;
    const rect = boton.getBoundingClientRect();
    const onda = document.createElement('span');
    onda.className = 'onda';
    onda.style.left = `${evento.clientX - rect.left}px`;
    onda.style.top = `${evento.clientY - rect.top}px`;
    boton.append(onda);
    onda.addEventListener('animationend', () => onda.remove());
  });

  if (reducido) return;

  // Parallax suave del hero siguiendo el puntero.
  const hero = document.querySelector('.hero');
  if (hero && !tactil) {
    hero.addEventListener('pointermove', (evento) => {
      const rect = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', (((evento.clientX - rect.left) / rect.width) - 0.5).toFixed(3));
      hero.style.setProperty('--my', (((evento.clientY - rect.top) / rect.height) - 0.5).toFixed(3));
    });
    hero.addEventListener('pointerleave', () => { hero.style.setProperty('--mx', 0); hero.style.setProperty('--my', 0); });
  }

  // Tarjetas: aparición escalonada al entrar en pantalla.
  const tarjetas = [...document.querySelectorAll('.tarjeta')];
  if ('IntersectionObserver' in window && tarjetas.length) {
    const observador = new IntersectionObserver((entradas) => {
      const visibles = entradas.filter((e) => e.isIntersecting);
      visibles.forEach((entrada, i) => {
        entrada.target.style.setProperty('--retraso', `${i * 0.09}s`);
        entrada.target.classList.add('aparecida');
        entrada.target.addEventListener('transitionend', () => entrada.target.style.removeProperty('--retraso'), { once: true });
        observador.unobserve(entrada.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    tarjetas.forEach((t) => { t.classList.add('por-aparecer'); observador.observe(t); });
  }


  // Tarjetas: transición al reaparecer tras buscar o filtrar, y al volver a la vista de tarjetas.
  if ('MutationObserver' in window) {
    let lote = 0;
    let temporizador;
    const vigilante = new MutationObserver((cambios) => {
      cambios.forEach(({ target }) => {
        if (target.hidden) return;
        if (target.classList.contains('tarjeta')) {
          target.classList.remove('reentrar');
          target.style.setProperty('--retraso', `${Math.min(lote++, 8) * 0.05}s`);
          void target.offsetWidth;
          target.classList.add('reentrar', 'aparecida');
          target.classList.remove('por-aparecer');
        } else {
          target.classList.remove('lista-entrando');
          void target.offsetWidth;
          target.classList.add('lista-entrando');
        }
      });
      clearTimeout(temporizador);
      temporizador = setTimeout(() => { lote = 0; }, 120);
    });
    tarjetas.forEach((t) => vigilante.observe(t, { attributes: true, attributeFilter: ['hidden'] }));
    ['#lista-tarjetas', '#vista-mapa'].forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) vigilante.observe(el, { attributes: true, attributeFilter: ['hidden'] });
    });
  }

  // Tarjetas: inclinación 3D y brillo que sigue al cursor.
  if (!tactil) {
    tarjetas.forEach((tarjeta) => {
      tarjeta.addEventListener('pointermove', (evento) => {
        const rect = tarjeta.getBoundingClientRect();
        const x = (evento.clientX - rect.left) / rect.width;
        const y = (evento.clientY - rect.top) / rect.height;
        tarjeta.style.setProperty('--ry', `${((x - 0.5) * 8).toFixed(2)}deg`);
        tarjeta.style.setProperty('--rx', `${((0.5 - y) * 8).toFixed(2)}deg`);
        tarjeta.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
        tarjeta.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
      });
      tarjeta.addEventListener('pointerleave', () => {
        tarjeta.style.setProperty('--rx', '0deg');
        tarjeta.style.setProperty('--ry', '0deg');
      });
    });
  }

  // Botones principales con un leve efecto magnético.
  if (!tactil) {
    document.querySelectorAll('.boton.acento, .boton-nav').forEach((boton) => {
      boton.addEventListener('pointermove', (evento) => {
        const rect = boton.getBoundingClientRect();
        const dx = evento.clientX - rect.left - rect.width / 2;
        const dy = evento.clientY - rect.top - rect.height / 2;
        boton.style.translate = `${dx * 0.15}px ${dy * 0.25}px`;
      });
      boton.addEventListener('pointerleave', () => { boton.style.translate = ''; });
    });
  }
})();
