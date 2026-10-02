(function(){
  var $ = function(s, r){ return (r || document).querySelector(s); };
  function lang(){ return typeof currentLang === 'function' ? currentLang() : (document.documentElement.lang === 'hi' ? 'hi' : 'en'); }
  function tx(el, l){ return el ? (el.getAttribute('data-' + l) || el.textContent).replace(/\s+/g, ' ').trim() : ''; }

  /* ---------- build the index from the live page (products) + site sections ---------- */
  var KEYS = [ // extra Hinglish / Hindi search words per product, matched by image name
    ['product-oil',   'tel sarson mustard oil kachi ghani kacchi ghani cold pressed तेल सरसों कच्ची घानी bottle'],
    ['product-khal',  'khal khali oil cake cattle feed pashu chara janwar gai bhains खल पशु चारा'],
    ['product-seed',  'seed beej sarson mandi trading grain anaj बीज सरसों अनाज व्यापार'],
    ['product-rice',  'rice chawal chaval paddy polish milling basmati चावल धान'],
    ['seed-farmer',   'farmer kisan sell bechna harvest fasal weight tol किसान बेचें फसल तोल'],
    ['seed-bulk',     'buy kharid bulk graded trader mill kharidna खरीद थोक']
  ];
  var SECTIONS = [
    {id:'pilai',    e:'🛠️', k:'pilai custom pressing crush apna seed nikalna पिसाई',
      en:['Custom Oil Pressing','Bring your own mustard seed and get fresh oil pressed for you.'], hi:['पिसाई सेवा','अपनी सरसों लाएँ और ताज़ा तेल निकलवाएँ।']},
    {id:'payment',  e:'💳', k:'payment upi qr advance paytm phonepe gpay pay पेमेंट',
      en:['Advance Payment','Pay in advance with UPI / QR and lock your order.'], hi:['एडवांस पेमेंट','UPI / QR से एडवांस पेमेंट करें और ऑर्डर पक्का करें।']},
    {id:'location', e:'📍', k:'location address map kahan where bigrau siyana bulandshahr direction पता लोकेशन',
      en:['Location','Near Bhagwant Singh Inter College, Bigrau, Siyana, Bulandshahr, UP.'], hi:['स्थान','भगवंत सिंह इंटर कॉलेज के पास, बिगराउ, सियाना, बुलंदशहर, यूपी।']},
    {id:'mill',     e:'🏭', k:'about mill owner proprietor kiranpal singh trust malik मालिक किरणपाल',
      en:['About the Mill','A trading house built on trust — proprietor Mr. Kiranpal Singh.'], hi:['मिल के बारे में','भरोसे पर बना व्यापार — मालिक श्री किरणपाल सिंह।']},
    {id:'contact',  e:'📞', k:'contact phone call whatsapp order number mobile ऑर्डर संपर्क',
      en:['Contact / Order Now','Call or message us to place your order.'], hi:['संपर्क / ऑर्डर','ऑर्डर देने के लिए कॉल या मैसेज करें।']},
    {id:'faq',      e:'❓', k:'faq question help sawal prashn doubt सवाल',
      en:['FAQ','Answers to common questions.'], hi:['अक्सर पूछे जाने वाले सवाल','आम सवालों के जवाब।']}
  ];
  var items = [];
  function build(){
    items = [];
    document.querySelectorAll('.product-card').forEach(function(c){
      var img = $('img', c), src = img ? img.getAttribute('src') : '', extra = '';
      KEYS.forEach(function(k){ if(src.indexOf(k[0]) > -1) extra = k[1]; });
      var h = $('h3', c), p = $('p', c), tag = $('.tag', c);
      var feats = [].slice.call(c.querySelectorAll('.feat-list li'));
      items.push({kind:'product', el:c, img:src, extra:extra,
        en:{t:tx(h,'en'), d:tx(p,'en'), tag:tx(tag,'en'), f:feats.map(function(f){ return tx(f,'en'); })},
        hi:{t:tx(h,'hi'), d:tx(p,'hi'), tag:tx(tag,'hi'), f:feats.map(function(f){ return tx(f,'hi'); })}});
    });
    SECTIONS.forEach(function(s){
      var el = document.getElementById(s.id); if(!el) return;
      items.push({kind:'section', el:el, emoji:s.e, extra:s.k,
        en:{t:s.en[0], d:s.en[1], tag:'', f:[]}, hi:{t:s.hi[0], d:s.hi[1], tag:'', f:[]}});
    });
  }

  /* ---------- matching (words, prefixes, 1-letter typos) ---------- */
  function norm(s){ return (s || '').toLowerCase().replace(/[^a-z0-9\u0900-\u097f\s]/g, ' '); }
  function near(a, b){ // true if a ~ b within one edit (len>=4)
    if(a === b) return true; if(a.length < 4 || Math.abs(a.length - b.length) > 1) return false;
    var i = 0; while(i < a.length && a[i] === b[i]) i++;
    return a.slice(i + 1) === b.slice(i + 1) || a.slice(i) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i);
  }
  function score(it, q){
    var l = lang(), L = it[l], other = it[l === 'en' ? 'hi' : 'en'];
    var title = norm(L.t + ' ' + other.t), alias = norm(it.extra + ' ' + L.tag + ' ' + other.tag);
    var body = norm(L.d + ' ' + L.f.join(' ') + ' ' + other.d + ' ' + other.f.join(' '));
    var tw = title.split(/\s+/), aw = alias.split(/\s+/), total = 0;
    var toks = norm(q).split(/\s+/).filter(Boolean);
    for(var i = 0; i < toks.length; i++){
      var t = toks[i], s = 0;
      if(title.indexOf(t) > -1) s = 10;
      else if(alias.indexOf(t) > -1) s = 7;
      else if(tw.concat(aw).some(function(w){ return near(t, w); })) s = 5;
      else if(body.indexOf(t) > -1) s = 2;
      if(!s) return 0; total += s;
    }
    return total + (it.kind === 'product' ? .5 : 0);
  }

  /* ---------- UI ---------- */
  var ov, input, list, meta, chips, active = -1, shown = [];
  var T = {
    en:{ph:'Search oil, khal, seed, rice…', btn:'Search items', pop:'Popular items', res:' result(s)', none:'No item found', tryx:'Try: oil, khal, seed, rice, payment, location',
         view:'View item', order:'Order now', go:'Open', close:'Close', chips:['Mustard Oil','Khal','Seed','Rice','Pilai','Payment','Location'], p:'Product', s:'Section'},
    hi:{ph:'तेल, खल, बीज, चावल खोजें…', btn:'आइटम खोजें', pop:'लोकप्रिय आइटम', res:' नतीजे', none:'कोई आइटम नहीं मिला', tryx:'आज़माएँ: तेल, खल, बीज, चावल, पेमेंट, स्थान',
         view:'आइटम देखें', order:'ऑर्डर करें', go:'खोलें', close:'बंद करें', chips:['सरसों तेल','खल','बीज','चावल','पिसाई','पेमेंट','स्थान'], p:'उत्पाद', s:'सेक्शन'}
  };
  function esc(s){ return s.replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function hl(s, q){
    var out = esc(s), toks = norm(q).split(/\s+/).filter(function(t){ return t.length > 1; });
    toks.forEach(function(t){ out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); });
    return out;
  }

  function render(){
    var l = lang(), q = input.value.trim(), tt = T[l], res;
    input.placeholder = tt.ph;
    chips.innerHTML = tt.chips.map(function(c){ return '<button type="button" class="srch-chip">' + esc(c) + '</button>'; }).join('');
    if(q){
      res = items.map(function(it){ return {it:it, s:score(it, q)}; }).filter(function(r){ return r.s > 0; })
        .sort(function(a, b){ return b.s - a.s; }).map(function(r){ return r.it; });
      meta.textContent = res.length + tt.res;
    } else {
      res = items.filter(function(i){ return i.kind === 'product'; }).slice(0, 4); meta.textContent = tt.pop;
    }
    shown = res; active = res.length ? 0 : -1;
    if(!res.length){ list.innerHTML = '<div class="srch-empty"><b>🔍 ' + tt.none + '</b>' + tt.tryx + '</div>'; return; }
    list.innerHTML = res.map(function(it, i){
      var L = it[l], thumb = it.img ? '<img src="' + esc(it.img) + '" alt="" loading="lazy">' : it.emoji;
      return '<div class="srch-card' + (i === 0 ? ' act' : '') + '" data-i="' + i + '" style="--i:' + i + '">' +
        '<div class="srch-img">' + thumb + '</div><div class="srch-body">' +
        '<div class="srch-row"><span class="srch-title">' + hl(L.t, q) + '</span>' +
        (L.tag ? '<span class="srch-badge">' + esc(L.tag) + '</span>' : '') +
        '<span class="srch-badge cat">' + (it.kind === 'product' ? tt.p : tt.s) + '</span></div>' +
        '<div class="srch-desc">' + hl(L.d, q) + '</div>' +
        (L.f.length ? '<div class="srch-feat">' + L.f.slice(0, 3).map(function(f){ return '<i>✓ ' + esc(f) + '</i>'; }).join('') + '</div>' : '') +
        '<div class="srch-acts"><button type="button" class="srch-go" data-act="view">' + (it.kind === 'product' ? tt.view : tt.go) + '</button>' +
        (it.kind === 'product' ? '<button type="button" class="srch-go alt" data-act="order">' + tt.order + '</button>' : '') + '</div>' +
        '</div></div>';
    }).join('');
  }

  function setActive(n){
    var cards = list.querySelectorAll('.srch-card'); if(!cards.length) return;
    active = (n + cards.length) % cards.length;
    cards.forEach(function(c, i){ c.classList.toggle('act', i === active); });
    cards[active].scrollIntoView({block:'nearest', behavior:'smooth'});
  }
  function pick(i, act){
    var it = shown[i]; if(!it) return; close();
    var target = act === 'order' ? document.getElementById('contact') : it.el;
    setTimeout(function(){
      it.el.classList.add('revealed');
      (target || it.el).scrollIntoView({behavior:'smooth', block: act === 'order' ? 'start' : 'center'});
      var f = act === 'order' ? it.el : it.el;
      f.classList.remove('srch-flash'); void f.offsetWidth; f.classList.add('srch-flash');
    }, 120);
  }

  function open(){
    if(!ov) make(); build(); input.value = ''; render();
    ov.classList.add('open'); document.documentElement.style.overflow = 'hidden';
    setTimeout(function(){ input.focus(); }, 50);
  }
  function close(){ if(!ov) return; ov.classList.remove('open'); document.documentElement.style.overflow = ''; }

  function make(){
    ov = document.createElement('div'); ov.id = 'srchOv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Search items');
    ov.innerHTML = '<div class="srch-panel"><div class="srch-top">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
      '<input type="search" autocomplete="off" spellcheck="false" aria-label="Search"><button type="button" class="srch-x">Esc</button></div>' +
      '<div class="srch-chips"></div><div class="srch-meta"></div><div class="srch-list"></div></div>';
    document.body.appendChild(ov);
    input = $('input', ov); list = $('.srch-list', ov); meta = $('.srch-meta', ov); chips = $('.srch-chips', ov);
    input.addEventListener('input', render);
    $('.srch-x', ov).addEventListener('click', close);
    ov.addEventListener('mousedown', function(e){ if(e.target === ov) close(); });
    chips.addEventListener('click', function(e){ var b = e.target.closest('.srch-chip'); if(b){ input.value = b.textContent; render(); input.focus(); } });
    list.addEventListener('click', function(e){
      var c = e.target.closest('.srch-card'); if(!c) return;
      var b = e.target.closest('[data-act]'); pick(+c.getAttribute('data-i'), b ? b.getAttribute('data-act') : 'view');
    });
    input.addEventListener('keydown', function(e){
      if(e.key === 'ArrowDown'){ e.preventDefault(); setActive(active + 1); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); setActive(active - 1); }
      else if(e.key === 'Enter' && active > -1){ e.preventDefault(); pick(active, 'view'); }
    });
  }

  /* ---------- header button + shortcuts + language refresh ---------- */
  function addButton(){
    var host = $('#mainNav .lang-toggle') || $('#mainNav') || $('.site-header'); if(!host) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'srch-btn'; b.id = 'srchBtn';
    b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span></span><kbd>/</kbd>';
    function lab(){ $('span', b).textContent = T[lang()].btn; b.setAttribute('aria-label', T[lang()].btn); }
    lab(); b.addEventListener('click', open);
    if(host.classList && host.classList.contains('lang-toggle')) host.parentNode.insertBefore(b, host); else host.appendChild(b);
    document.querySelectorAll('[data-lang-btn]').forEach(function(x){ x.addEventListener('click', function(){ setTimeout(function(){ lab(); if(ov && ov.classList.contains('open')) render(); }, 80); }); });
  }
  document.addEventListener('keydown', function(e){
    var typing = /input|textarea|select/i.test((e.target.tagName || '')) || e.target.isContentEditable;
    if(e.key === 'Escape') close();
    else if((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')){ e.preventDefault(); open(); }
  });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton); else addButton();
})();
