/* Larah's Treats – scripted chat assistant (no AI service, no dependencies). */
(function () {
  'use strict';
  const S = window.SITE || {};
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const css = `
  .lt-btn{position:fixed;right:18px;bottom:18px;z-index:70;display:flex;align-items:center;gap:10px;padding:8px 20px 8px 8px;border:0;border-radius:18px;background:#2b1b2e;color:#fff;font:800 .95rem 'Bricolage Grotesque',system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 0 #ff6f59;transition:transform .35s cubic-bezier(.22,.7,.2,1),box-shadow .35s}
  .lt-btn:hover{transform:translateY(-3px);box-shadow:0 9px 0 #ff6f59}
  .lt-btn i{width:40px;height:40px;border-radius:13px;background:#ffc145;display:grid;place-items:center;font-style:normal;font-size:1.3rem}
  .lt-panel{position:fixed;right:18px;bottom:90px;z-index:71;width:min(370px,calc(100vw - 36px));height:min(540px,calc(100vh - 120px));background:#fff;border-radius:24px;box-shadow:0 30px 70px -24px rgba(43,27,46,.55);display:flex;flex-direction:column;overflow:hidden;transform:translateY(16px) scale(.97);opacity:0;pointer-events:none;transition:all .35s cubic-bezier(.22,.7,.2,1)}
  .lt-panel.open{transform:none;opacity:1;pointer-events:auto}
  .lt-head{background:#0b6e4f;color:#fff;padding:15px 18px;display:flex;align-items:center;gap:12px}
  .lt-head b{display:block;font:800 1.15rem 'Bricolage Grotesque',system-ui,sans-serif}
  .lt-head small{color:#cdeadc;font-size:.78rem}
  .lt-head .x{margin-left:auto;background:rgba(255,255,255,.15);border:0;color:#fff;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:1rem}
  .lt-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#fff9f2}
  .lt-m{max-width:86%;padding:10px 14px;border-radius:18px;font-size:.93rem;line-height:1.5;white-space:pre-line;animation:ltIn .35s ease both}
  .lt-m a{color:#0b6e4f;font-weight:800}
  .lt-bot{background:#fff;border:1px solid #f0e3d6;border-bottom-left-radius:5px;color:#3b3040}
  .lt-me{align-self:flex-end;background:#ff6f59;color:#fff;border-bottom-right-radius:5px}
  .lt-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px;background:#fff9f2}
  .lt-chips button{border:2px solid #2b1b2e;background:#fff;color:#2b1b2e;border-radius:999px;padding:5px 12px;font:700 .82rem 'DM Sans',system-ui,sans-serif;cursor:pointer;transition:all .25s}
  .lt-chips button:hover{background:#2b1b2e;color:#ffc145}
  .lt-form{display:flex;gap:8px;padding:12px;border-top:1px solid #f0e3d6;background:#fff}
  .lt-form input{flex:1;min-width:0;border:2px solid #f0e3d6;border-radius:14px;padding:10px 14px;font:inherit;font-size:.94rem}
  .lt-form input:focus{outline:none;border-color:#0b6e4f}
  .lt-form button{width:44px;height:44px;border-radius:14px;border:0;background:#0b6e4f;color:#fff;cursor:pointer;display:grid;place-items:center}
  .lt-form svg{width:18px;height:18px}
  .lt-typing{display:inline-flex;gap:4px}.lt-typing span{width:6px;height:6px;border-radius:50%;background:#c9b8cc;animation:ltDot 1s infinite}.lt-typing span:nth-child(2){animation-delay:.15s}.lt-typing span:nth-child(3){animation-delay:.3s}
  @keyframes ltIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  @keyframes ltDot{0%,80%,100%{opacity:.3}40%{opacity:1}}
  @media (max-width:640px){.lt-btn span{display:none}.lt-btn{padding:6px;bottom:88px;right:14px}.lt-panel{bottom:150px;right:14px;height:min(500px,calc(100vh - 180px))}}
  @media (prefers-reduced-motion:reduce){.lt-m,.lt-panel{animation:none;transition:none}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const sendI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>';
  const root = document.createElement('div');
  root.innerHTML = `
  <button class="lt-btn" aria-expanded="false" aria-controls="lt-panel"><i aria-hidden="true">🎂</i><span>Ask Larah’s</span></button>
  <section class="lt-panel" id="lt-panel" role="dialog" aria-label="Chat with Larah’s Treats">
    <div class="lt-head"><div><b>Larah’s Treats</b><small>Automated assistant · set answers</small></div><button class="x" aria-label="Close chat">✕</button></div>
    <div class="lt-body" aria-live="polite"></div>
    <div class="lt-chips"></div>
    <form class="lt-form"><label class="sr-only" for="lt-in">Type your message</label><input id="lt-in" autocomplete="off" placeholder="Ask about cakes, small chops…" maxlength="300"><button aria-label="Send">${sendI}</button></form>
  </section>`;
  document.body.appendChild(root);
  const btn = root.querySelector('.lt-btn'), panel = root.querySelector('.lt-panel'), body = root.querySelector('.lt-body'),
    chipBox = root.querySelector('.lt-chips'), form = root.querySelector('.lt-form'), input = root.querySelector('#lt-in');
  let started = false, busy = false;
  const add = (h, who = 'bot') => { const m = document.createElement('div'); m.className = 'lt-m lt-' + who; m.innerHTML = h; body.appendChild(m); body.scrollTop = body.scrollHeight; return m; };
  const say = (h, w = 420) => new Promise((r) => { const tp = add('<span class="lt-typing"><span></span><span></span><span></span></span>'); setTimeout(() => { tp.innerHTML = h; body.scrollTop = body.scrollHeight; r(); }, w); });
  const chips = (l) => { chipBox.innerHTML = ''; l.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.onclick = () => handle(c); chipBox.appendChild(b); }); };
  const MAIN = ['Order a cake', 'Small chops', 'Where are you?', 'Contact'];
  const wa = () => `<a href="https://wa.me/${S.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>`;
  const contact = () => `💬 ${wa()}\n📞 <a href="${S.phoneHref}">${S.phone}</a>\n📍 ${esc(S.address)}`;
  const intents = [
    { re: /wedding|traditional|engagement|introduction|owambe|party|birthday|celebrat|anniversar|christening|naming|cake/i, run: () => say(`Yes! Larah bakes custom celebration cakes, including Nigerian-style cakes for birthdays, weddings, traditional engagements, naming ceremonies and more. Tell us your date and design: ${'<a href="cakes.html#order">Order a cake →</a>'}`).then(() => chips(['How much notice?', 'Small chops'])) },
    { re: /notice|advance|how long|how soon|last minute|urgent|tomorrow|this week/i, run: () => say(`The more notice the better, especially for big or tiered cakes. Message us your date on ${wa()} and we’ll let you know straight away if we can fit you in.`).then(() => chips(MAIN)) },
    { re: /chop|meat ?pie|puff|chin ?chin|sausage|fish ?roll|samosa|spring roll|snack|pastr|party pack|platter/i, run: () => say(`We make pastries and snacks: meat pies, sausage rolls, puff-puff, chin chin and small chops for parties. Build your order here: ${'<a href="small-chops.html#order">Pastries &amp; small chops →</a>'}`).then(() => chips(['Order a cake', 'Where are you?'])) },
    { re: /price|cost|how much|£|quote/i, run: () => say(`Prices depend on the size, design and quantity. Send your order through the website or on ${wa()} and Larah will reply with a price.`).then(() => chips(MAIN)) },
    { re: /deliver|collect|pick ?up|where|location|address|huddersfield|lockwood|swan/i, run: () => say(`We’re at <strong>${esc(S.address)}</strong>. Orders are made to order for collection; ask about delivery when you order. <a href="contact.html#find">Map &amp; directions</a>`).then(() => chips(MAIN)) },
    { re: /hour|open|close|time|today|sunday|saturday/i, run: () => say(`We bake to order, so please message before visiting to arrange a collection time:\n${contact()}`).then(() => chips(MAIN)) },
    { re: /allerg|nut|gluten|egg|dairy|vegan|halal|eggless/i, run: () => say(`Please tell us about any allergies or dietary needs when you order, and Larah will advise what’s possible.`).then(() => chips(MAIN)) },
    { re: /review|rating|good|recommend/i, run: () => say(`Customers rate us <strong>4.9★</strong> from 13 reviews. Thank you to everyone who has ordered! 💛`).then(() => chips(MAIN)) },
    { re: /contact|phone|call|number|whatsapp|text|message|email|talk/i, run: () => say(`You can reach Larah here:\n${contact()}`).then(() => chips(MAIN)) },
    { re: /^(hi|hello|hey|hiya|good (morning|afternoon|evening))\b/i, run: () => say('Hello! 👋 What are we celebrating?').then(() => chips(MAIN)) },
    { re: /thank|cheers|lovely/i, run: () => say('You’re welcome! 🎂').then(() => chips(MAIN)) },
  ];
  async function handle(text) {
    if (busy || !text.trim()) return;
    busy = true; add(esc(text), 'me');
    try {
      const map = { 'Order a cake': 'cake', 'Small chops': 'small chops', 'Where are you?': 'where', 'Contact': 'contact', 'How much notice?': 'notice' };
      const q = map[text] || text, hit = intents.find((i) => i.re.test(q));
      if (hit) { await hit.run(); return; }
      await say(`I don’t have a set answer for that one, but Larah can help:\n${contact()}`); chips(MAIN);
    } finally { busy = false; }
  }
  const open = async (s) => {
    panel.classList.toggle('open', s); btn.setAttribute('aria-expanded', String(s));
    if (s) { input.focus(); if (!started) { started = true; await say('Welcome to <strong>Larah’s Treats</strong>! 🎂 Ask me about celebration cakes, Nigerian treats and small chops, or how to order.', 300); chips(MAIN); } }
  };
  btn.addEventListener('click', () => open(!panel.classList.contains('open')));
  root.querySelector('.x').addEventListener('click', () => open(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) open(false); });
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; handle(v); });
})();
