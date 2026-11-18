/* Larah's Treats – site interactions (no dependencies).
   Orders are sent as a ready-written WhatsApp message (plus email if an inbox is set in site-config.js). */
(function () {
  'use strict';
  document.documentElement.classList.remove('no-js');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const S = window.SITE || {};
  const params = new URLSearchParams(location.search);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Header + mobile menu */
  const hdr = $('.hdr');
  const onScroll = () => hdr && hdr.classList.toggle('scrolled', window.scrollY > 10);
  onScroll(); addEventListener('scroll', onScroll, { passive: true });
  const burger = $('.burger'), nav = $('.nav');
  if (burger && nav) {
    const close = () => { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; };
    burger.addEventListener('click', () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', String(o)); document.body.style.overflow = o ? 'hidden' : ''; });
    $$('a', nav).forEach((a) => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* Reveal on scroll – never leaves content hidden */
  const rv = $$('.rv'); const show = (el) => el.classList.add('in');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    rv.forEach((el) => io.observe(el));
    let tk = false;
    const sweep = () => { tk = false; rv.forEach((el) => { if (!el.classList.contains('in') && el.getBoundingClientRect().top < innerHeight) show(el); }); };
    addEventListener('scroll', () => { if (!tk) { tk = true; requestAnimationFrame(sweep); } }, { passive: true });
    addEventListener('load', sweep);
  } else rv.forEach(show);
  setTimeout(() => rv.forEach(show), 2500);

  /* Tabs with sliding indicator + arrow keys */
  $$('[role=tablist]').forEach((list) => {
    const tabs = $$('[role=tab]', list), ind = $('.ind', list);
    const cur = () => tabs.find((x) => x.getAttribute('aria-selected') === 'true');
    const move = (tb) => { if (ind && tb) { ind.style.width = tb.offsetWidth + 'px'; ind.style.transform = `translateX(${tb.offsetLeft - 6}px)`; } };
    const select = (tb, focus) => {
      tabs.forEach((x) => { const on = x === tb; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; const p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on; });
      move(tb); if (focus) tb.focus();
    };
    tabs.forEach((tb, i) => {
      tb.addEventListener('click', () => select(tb));
      tb.addEventListener('keydown', (e) => { const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (k) { e.preventDefault(); select(tabs[(i + k + tabs.length) % tabs.length], true); } });
    });
    select(tabs.find((x) => '#' + x.dataset.id === location.hash) || cur() || tabs[0]);
    addEventListener('resize', () => move(cur())); addEventListener('load', () => move(cur()));
    if (document.fonts) document.fonts.ready.then(() => move(cur()));
  });

  /* Quantity steppers + live basket */
  const basket = $('#basket-list');
  const unitOf = (x) => (x.q === 1 ? x.unit.replace(/s$/, '') : x.unit);
  const renderBasket = () => {
    if (!basket) return;
    const items = $$('.snack').map((s) => ({ name: s.dataset.name, unit: s.dataset.unit, q: parseInt($('input', s).value, 10) || 0, el: s })).filter((x) => { x.el.classList.toggle('on', x.q > 0); return x.q > 0; });
    basket.innerHTML = items.length ? items.map((x) => `<li><span>${esc(x.name)}</span><b>× ${x.q} ${esc(unitOf(x))}</b></li>`).join('') : '<li class="empty-b" style="background:none;padding:0">Nothing added yet. Use the + buttons to build your order.</li>';
    const hid = $('#items'); if (hid) hid.value = items.map((x) => `${x.name} × ${x.q} ${unitOf(x)}`).join('\n');
  };
  $$('.qty').forEach((q) => {
    const inp = $('input', q), min = +(inp.min || 0);
    $$('button', q).forEach((b) => b.addEventListener('click', () => {
      inp.value = Math.max(min, Math.min(99, (parseInt(inp.value, 10) || 0) + (b.dataset.d === '+' ? 1 : -1))); renderBasket();
    }));
    inp.addEventListener('input', renderBasket);
  });
  renderBasket();
  const pre = params.get('add'); if (pre) { const s = $(`.snack[data-id="${pre}"] input`); if (s) { s.value = Math.max(1, +s.value); renderBasket(); } }
  const occ = params.get('type'); if (occ) { const r = $(`input[name="occasion"][value="${occ}"]`); if (r) r.checked = true; }

  /* Validation */
  const rules = {
    name: (v) => v.trim().length >= 2 || 'Please enter your name.',
    phone: (v) => { const d = v.replace(/\D/g, ''); return (d.length >= 10 && d.length <= 13) || 'Please enter a valid phone number, e.g. 07700 900123.'; },
    date_needed: (v) => !!v || 'Please choose the date you need it.',
    design: (v) => v.trim().length >= 5 || 'Please describe the cake you’d like.',
    items: (v) => v.trim().length > 0 || 'Please add at least one item to your order.',
    message: (v) => v.trim().length >= 5 || 'Please tell us a little more.',
  };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  $$('input[type=date]').forEach((d) => { d.min = today.toISOString().slice(0, 10); });

  $$('form[data-wa]').forEach((form) => {
    const fields = $$('input, textarea, select', form).filter((el) => rules[el.name] && (el.required || el.dataset.req !== undefined));
    const check = (el) => {
      const res = rules[el.name](el.value), box = el.closest('.f') || el.closest('[data-errbox]'), err = box && $('.err', box), ok = res === true;
      if (box) box.classList.toggle('bad', !ok); if (err) err.textContent = ok ? '' : res; el.setAttribute('aria-invalid', String(!ok));
      return ok;
    };
    fields.forEach((el) => {
      el.addEventListener('blur', (e) => { if (e.relatedTarget && e.relatedTarget.matches('button[type=submit]')) return; const bx = el.closest('.f'); if (!el.value.trim() && !(bx && bx.classList.contains('bad'))) return; check(el); });
      el.addEventListener('input', () => { const bx = el.closest('.f'); if (bx && bx.classList.contains('bad')) check(el); });
    });
    $$('.qty button', document).forEach((b) => b.addEventListener('click', () => { const it = $('#items', form); if (it) { const bx = it.closest('[data-errbox]'); if (bx && bx.classList.contains('bad')) check(it); } }));
    const file = $('input[type=file]', form);
    if (file) file.addEventListener('change', () => { const f = file.files[0], hint = $('.hint', file.closest('.f')); if (hint && f) hint.textContent = `Selected: ${f.name}. Please attach it in WhatsApp after the chat opens.`; });
    const status = $('.status', form), btn = $('button[type=submit]', form);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (form.elements._honey && form.elements._honey.value) return;
      if (fields.map(check).includes(false)) {
        status.className = 'status bad'; status.textContent = 'Please fix the highlighted fields and try again.';
        const first = $('.bad input:not([type=hidden]), .bad textarea, .bad select', form); if (first) first.focus(); else { const b = $('.bad', form); if (b) b.scrollIntoView({ block: 'center' }); }
        return;
      }
      const fd = new FormData(form); fd.delete('_honey');
      const label = (k) => (form.querySelector(`[name="${k}"]`)?.closest('.f')?.querySelector('label, legend')?.textContent || k).replace(/\*|\(optional\)/g, '').trim();
      const lines = []; const seen = new Set();
      fd.forEach((v, k) => { if (seen.has(k) || k.startsWith('_') || typeof v !== 'string' || !v.trim()) return; seen.add(k); const el = form.querySelector(`[name="${k}"]`); if (el && el.type === 'date') { try { v = new Date(v + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); } catch (x) {} } lines.push(k === 'items' ? `*Order:*\n${v}` : `*${label(k)}:* ${v}`); });
      const hasPhoto = file && file.files[0];
      const text = `Hi Larah! 👋 ${form.dataset.wa}\n\n${lines.join('\n')}${hasPhoto ? '\n\n(I’ll attach my design photo in this chat.)' : ''}\n\nSent from your website`;
      const wa = `https://wa.me/${S.whatsapp}?text=${encodeURIComponent(text)}`;
      const sms = `sms:${S.phoneIntl}?&body=${encodeURIComponent(text)}`;
      if (S.email) { const ef = new FormData(form); ef.append('_subject', `${form.dataset.wa} – ${fd.get('name')}`); ef.append('_template', 'table'); ef.append('_captcha', 'false'); fetch(`https://formsubmit.co/ajax/${S.email}`, { method: 'POST', headers: { Accept: 'application/json' }, body: ef }).catch(() => {}); }
      const w = window.open(wa, '_blank', 'noopener');
      status.className = 'status ok';
      status.innerHTML = `<strong>Almost done, ${esc(String(fd.get('name')).trim().split(' ')[0])}! 🎉</strong> Your order message is ready in WhatsApp. Just press <b>send</b>${hasPhoto ? ' and attach your design photo' : ''}.<br>WhatsApp didn’t open? <a href="${wa}" target="_blank" rel="noopener">Open it here</a>, <a href="${sms}">send as a text</a> or call <a href="${S.phoneHref}">${S.phone}</a>.`;
      status.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      void w; void btn;
    });
  });

  /* Cookie notice + year */
  const ck = $('.cookie');
  if (ck) {
    let seen = false; try { seen = localStorage.getItem('lt-cookie-ok') === '1'; } catch (e) {}
    if (!seen) ck.hidden = false;
    $('button', ck).addEventListener('click', () => { ck.hidden = true; try { localStorage.setItem('lt-cookie-ok', '1'); } catch (e) {} });
  }
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
