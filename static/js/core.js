/* Общие анимации и интерактив для всех сайтов-приглашений */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // при «уменьшить движение» видео не крутим — остаётся постер
  if (reduced) document.querySelectorAll('video[autoplay]').forEach(v => { v.removeAttribute('autoplay'); v.pause(); });
  // внутри превью-iframe на главной прячем служебные элементы
  if (window.self !== window.top) document.documentElement.classList.add('in-frame');

  /* ---------- разбивка текста на буквы ---------- */
  $$('[data-split]').forEach(el => {
    const mode = el.dataset.split || 'chars';
    const text = el.textContent;
    el.setAttribute('aria-label', text.trim());
    el.textContent = '';
    let i = 0;
    const parts = mode === 'words' ? text.split(/(\s+)/) : [...text];
    parts.forEach(p => {
      if (/^\s+$/.test(p)) { el.append(p.includes('\n') ? document.createElement('br') : ' '); return; }
      const s = document.createElement('span');
      s.className = 'ch';
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', i++);
      s.textContent = p;
      el.append(s);
    });
  });

  /* ---------- появление при скролле ---------- */
  // Элементы с clip-path (маски) IntersectionObserver считает невидимыми,
  // поэтому для них наблюдаем за родителем.
  const watched = new Map();
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      (watched.get(e.target) || []).forEach(el => {
        if (e.isIntersecting) {
          if (el.classList.contains('is-in')) return;
          el.classList.add('is-in');
          el.dispatchEvent(new CustomEvent('reveal'));
        } else if (el.hasAttribute('data-repeat')) {
          el.classList.remove('is-in');
        }
      });
    });
  }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
  $$('[data-reveal], [data-split], [data-draw], [data-count]').forEach(el => {
    if (el.dataset.delay) el.style.setProperty('--d', el.dataset.delay + 'ms');
    const t = /mask|arch/.test(el.dataset.reveal || '') ? el.parentElement : el;
    if (!watched.has(t)) { watched.set(t, []); io.observe(t); }
    watched.get(t).push(el);
  });
  // всё, что уже на первом экране, показываем сразу (иначе низ экрана ждал бы скролла)
  requestAnimationFrame(() => watched.forEach((els, t) => {
    if (t.getBoundingClientRect().top < innerHeight) els.forEach(el => {
      if (!el.classList.contains('is-in')) { el.classList.add('is-in'); el.dispatchEvent(new CustomEvent('reveal')); }
    });
  }));

  /* ---------- SVG линии, которые «рисуются» ---------- */
  $$('[data-draw] path, path[data-draw]').forEach(p => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
    p.style.setProperty('--len', len);
  });

  /* ---------- счётчик чисел ---------- */
  $$('[data-count]').forEach(el => {
    el.addEventListener('reveal', () => {
      const to = +el.dataset.count, dur = +(el.dataset.dur || 1600);
      if (reduced) { el.textContent = to; return; }
      const t0 = performance.now();
      const step = t => {
        const k = Math.min(1, (t - t0) / dur);
        el.textContent = Math.round(to * (1 - Math.pow(1 - k, 4)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  });

  /* ---------- параллакс ---------- */
  const px = $$('[data-parallax]');
  if (px.length && !reduced) {
    let ticking = false;
    const update = () => {
      const vh = innerHeight;
      px.forEach(el => {
        const r = el.getBoundingClientRect();
        const speed = parseFloat(el.dataset.parallax) || 0.15;
        const lim = +(el.dataset.limit || 80);
        const off = Math.max(-lim, Math.min(lim, (r.top + r.height / 2 - vh / 2) * speed));
        el.style.setProperty('--py', `${-off.toFixed(1)}px`);
      });
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* ---------- прогресс скролла ---------- */
  const bar = $('.scroll-progress');
  if (bar) addEventListener('scroll', () => {
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
  }, { passive: true });

  /* ---------- обратный отсчёт ---------- */
  $$('[data-countdown]').forEach(el => {
    const target = new Date(el.dataset.countdown).getTime();
    const units = { d: 864e5, h: 36e5, m: 6e4, s: 1e3 };
    const cells = $$('[data-unit]', el);
    const pad = el.hasAttribute('data-pad');
    const tick = () => {
      let left = Math.max(0, target - Date.now());
      cells.forEach(c => {
        const u = c.dataset.unit;
        const v = Math.floor(left / units[u]);
        left -= v * units[u];
        const txt = pad || u !== 'd' ? String(v).padStart(2, '0') : String(v);
        if (c.textContent !== txt) {
          c.textContent = txt;
          c.classList.remove('tick'); void c.offsetWidth; c.classList.add('tick');
          if (c.dataset.ring) {
            const max = { d: 365, h: 24, m: 60, s: 60 }[u];
            c.closest('[data-ring-wrap]')?.style.setProperty('--p', v / max);
          }
        }
      });
    };
    tick(); setInterval(tick, 1000);
  });

  /* ---------- календарь ---------- */
  $$('[data-calendar]').forEach(el => {
    const d = new Date(el.dataset.calendar);
    const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const shift = (first.getDay() + 6) % 7;
    let html = `<div class="cal-month">${months[d.getMonth()]} ${d.getFullYear()}</div><div class="cal-grid">`;
    ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(w => html += `<span class="cal-w">${w}</span>`);
    for (let i = 0; i < shift; i++) html += '<span></span>';
    for (let i = 1; i <= days; i++) {
      const on = i === d.getDate();
      html += `<span class="cal-d${on ? ' is-day' : ''}" style="--i:${i}">${i}${on ? '<svg viewBox="0 0 40 36" class="cal-heart"><path d="M20 33S3 22 3 11a8.5 8.5 0 0 1 17-2 8.5 8.5 0 0 1 17 2c0 11-17 22-17 22z"/></svg>' : ''}</span>`;
    }
    el.innerHTML = html + '</div>';
  });

  /* ---------- toast ---------- */
  const toast = msg => {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
  };
  window.inviteToast = toast;

  /* ---------- копирование ---------- */
  $$('[data-copy]').forEach(el => el.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(el.dataset.copy); toast(el.dataset.copyMsg || 'Скопировано: ' + el.dataset.copy); }
    catch { toast(el.dataset.copy); }
  }));

  /* ---------- лайтбокс ---------- */
  const imgs = $$('[data-lightbox]');
  if (imgs.length) {
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = '<button class="lb-close" aria-label="Закрыть">×</button><button class="lb-prev" aria-label="Назад">‹</button><img alt=""><button class="lb-next" aria-label="Вперёд">›</button>';
    document.body.append(box);
    const big = $('img', box);
    let idx = 0;
    const show = i => { idx = (i + imgs.length) % imgs.length; big.src = imgs[idx].dataset.lightbox || imgs[idx].src; box.classList.add('open'); };
    imgs.forEach((im, i) => { im.style.cursor = 'zoom-in'; im.addEventListener('click', () => show(i)); });
    box.addEventListener('click', e => { if (e.target === box || e.target.classList.contains('lb-close')) box.classList.remove('open'); });
    $('.lb-prev', box).onclick = () => show(idx - 1);
    $('.lb-next', box).onclick = () => show(idx + 1);
    addEventListener('keydown', e => {
      if (!box.classList.contains('open')) return;
      if (e.key === 'Escape') box.classList.remove('open');
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* ---------- 3D-наклон ---------- */
  if (!reduced && matchMedia('(hover: hover)').matches) {
    $$('[data-tilt]').forEach(el => {
      const max = +(el.dataset.tilt || 8);
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${x * max}deg) rotateX(${-y * max}deg)`;
        el.style.setProperty('--mx', `${(x + 0.5) * 100}%`);
        el.style.setProperty('--my', `${(y + 0.5) * 100}%`);
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- RSVP-анкета → FastAPI ---------- */
  $$('form[data-rsvp]').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const base = ['name', 'phone', 'attend', 'guests', 'comment'];
      const name = (fd.get('name') || '').toString().trim();
      if (!name) { toast('Пожалуйста, укажите имя'); form.querySelector('[name=name]')?.focus(); return; }
      if (!fd.get('attend')) { toast('Отметьте, придёте ли вы'); return; }
      const extra = {};
      for (const [k, v] of fd.entries()) {
        if (base.includes(k) || v === '') continue;
        extra[k] = extra[k] ? [].concat(extra[k], v) : v;
      }
      const body = {
        name,
        phone: fd.get('phone') || null,
        attend: fd.get('attend') === 'yes',
        guests: fd.get('guests') ? parseInt(fd.get('guests'), 10) : null,
        comment: fd.get('comment') || null,
        extra,
      };
      const btn = form.querySelector('[type=submit]');
      btn && (btn.disabled = true, btn.classList.add('is-loading'));
      try {
        // Куда отправлять ответ:
        //  - по умолчанию — в FastAPI (/api/rsvp/<сайт>), там же считаются гости;
        //  - на статическом хостинге (GitHub Pages) у <html> есть data-rsvp-endpoint —
        //    адрес сервиса форм (например, Formspree); пустое значение = демо-режим без отправки.
        const endpoint = document.documentElement.dataset.rsvpEndpoint;
        let data = { coming: null };
        if (endpoint === undefined) {
          const res = await fetch(`/api/rsvp/${form.dataset.rsvp}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error(await res.text());
          data = await res.json();
        } else if (endpoint) {
          const res = await fetch(endpoint, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ site: form.dataset.rsvp, ...body, ...body.extra }),
          });
          if (!res.ok) throw new Error(await res.text());
        }
        form.classList.add('is-done');
        const done = form.querySelector('[data-rsvp-done]') || form.parentElement.querySelector('[data-rsvp-done]');
        if (done) {
          done.hidden = false;
          const n = done.querySelector('[data-coming]');
          if (n && data.coming != null) n.textContent = data.coming;
          // без сервера число гостей неизвестно — прячем строку со счётчиком
          done.querySelectorAll('[data-coming-line]').forEach(el => { el.hidden = data.coming == null; });
        }
        form.dispatchEvent(new CustomEvent('rsvp:done', { detail: { ...data, attend: body.attend } }));
        toast(body.attend ? 'Спасибо! Ждём вас ♥' : 'Спасибо, что сообщили!');
      } catch (err) {
        console.error(err);
        toast('Не получилось отправить, попробуйте ещё раз');
      } finally {
        btn && (btn.disabled = false, btn.classList.remove('is-loading'));
      }
    });
  });

  /* ---------- конфетти (canvas) ---------- */
  window.confetti = (opts = {}) => {
    if (reduced) return;
    const c = document.createElement('canvas');
    c.className = 'confetti-canvas';
    document.body.append(c);
    const ctx = c.getContext('2d');
    const dpr = devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.scale(dpr, dpr);
    const colors = opts.colors || ['#fff', '#f5d06f', '#e63946', '#8ecae6'];
    const x0 = opts.x ?? innerWidth / 2, y0 = opts.y ?? innerHeight * 0.6;
    const ps = Array.from({ length: opts.count || 160 }, () => ({
      x: x0, y: y0,
      vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 16 - 4,
      r: Math.random() * 6 + 4, a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3,
      c: colors[Math.floor(Math.random() * colors.length)], shape: opts.shape,
    }));
    let frames = 0;
    const loop = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach(p => {
        p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
        if (p.shape === 'heart') {
          ctx.font = `${p.r * 3}px serif`; ctx.fillText('♥', -p.r, p.r);
        } else ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        ctx.restore();
      });
      if (++frames < 220) requestAnimationFrame(loop); else c.remove();
    };
    loop();
  };

  /* ---------- плавающие сердечки по клику ---------- */
  $$('[data-hearts]').forEach(zone => zone.addEventListener('click', e => {
    if (e.target.closest('a,button,input,label,textarea,select')) return;
    const h = document.createElement('span');
    h.className = 'float-heart';
    h.textContent = zone.dataset.hearts || '♥';
    h.style.left = e.clientX + 'px'; h.style.top = e.clientY + 'px';
    h.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
    document.body.append(h);
    setTimeout(() => h.remove(), 1400);
  }));
})();
