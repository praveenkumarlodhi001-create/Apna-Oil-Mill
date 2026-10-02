/* 3D layer v2: scroll-driven bottle journey, seeds + oil drops + sparkles, 3D cards. Falls back to plain site. */
(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce) return;
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  var small = innerWidth < 700;
  var mx = 0, my = 0, scrollY = 0, cards = [], heads = [].slice.call(document.querySelectorAll('.section h2'));
  var hero = document.querySelector('.hero'), hv = document.querySelector('.hero-visual');

  /* ---------- progress bar + cursor glow ---------- */
  var bar = document.createElement('div'); bar.id = 'd3bar'; document.body.appendChild(bar);
  var glow = null;
  if(fine){ glow = document.createElement('div'); glow.id = 'd3glow'; document.body.appendChild(glow); }

  /* ---------- cards ---------- */
  var SEL = '.product-card,.strip-item,.gallery-item,.testimonial-card,.faq-item,.story-item,.proprietor-card,.shelf-life-box,.purity-banner,.brand-banner';
  document.querySelectorAll(SEL).forEach(function(el, i){
    el.classList.add('d3'); cards.push(el);
    el.style.setProperty('--bd', (-(i % 6) * 0.9) + 's');
    el.style.transitionDelay = ((i % 3) * 110) + 'ms';
    setTimeout(function(){ el.style.transitionDelay = ''; }, 2500);
    function tilt(e){
      var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', ((x - .5) * 22).toFixed(1) + 'deg');
      el.style.setProperty('--rx', ((.5 - y) * 22).toFixed(1) + 'deg');
      el.style.setProperty('--gx', (x * 100) + '%'); el.style.setProperty('--gy', (y * 100) + '%');
      el.classList.add('tilting');
    }
    function rest(){ el.classList.remove('tilting'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }
    el.addEventListener('pointermove', tilt); el.addEventListener('pointerleave', rest);
    el.addEventListener('pointerup', function(e){ if(e.pointerType !== 'mouse') rest(); });
    el.addEventListener('pointercancel', rest);
  });

  /* ---------- scroll + pointer ---------- */
  function onScroll(){
    scrollY = window.scrollY || 0;
    var vh = innerHeight, dh = document.documentElement.scrollHeight - vh;
    bar.style.transform = 'scaleX(' + (dh > 0 ? Math.min(1, scrollY / dh) : 0).toFixed(4) + ')';
    cards.forEach(function(c){            // cards lean as they pass through the screen
      var r = c.getBoundingClientRect();
      if(r.bottom < -100 || r.top > vh + 100) return;
      var k = Math.max(-1, Math.min(1, ((r.top + r.height / 2) - vh / 2) / vh));
      c.style.setProperty('--sx', (k * -14).toFixed(1) + 'deg');
    });
    heads.forEach(function(h){
      var r = h.getBoundingClientRect(), k = Math.max(-1, Math.min(1, (r.top - vh / 2) / vh));
      h.style.setProperty('--hy', (k * -14).toFixed(1) + 'px'); h.style.setProperty('--hx', (k * 18).toFixed(1) + 'deg');
    });
  }
  addEventListener('scroll', onScroll, {passive:true}); addEventListener('resize', onScroll); onScroll();
  addEventListener('pointermove', function(e){
    mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5;
    if(glow){ glow.style.opacity = 1; glow.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }
    if(hv && fine) hv.style.setProperty('--hry', (mx * 14).toFixed(1) + 'deg');
  });

  /* ---------- Three.js ---------- */
  var s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  s.onload = function(){ try { init(); } catch(e){ console.warn('3D scene disabled', e); } };
  document.head.appendChild(s);

  function init(){
    var cv = document.createElement('canvas'); cv.id = 'd3bg'; document.body.appendChild(cv);
    var R = new THREE.WebGLRenderer({canvas:cv, alpha:true, antialias:!small});
    R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    var S = new THREE.Scene(), C = new THREE.PerspectiveCamera(50, 1, .1, 100); C.position.z = 12;
    S.add(new THREE.AmbientLight(0xfff2cc, .85));
    var dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(3, 5, 6); S.add(dl);
    var pl = new THREE.PointLight(0xd4af37, 1.6, 30); pl.position.set(-4, -2, 5); S.add(pl);

    var gold = new THREE.MeshStandardMaterial({color:0xd4a017, roughness:.3, metalness:.35, emissive:0x3a2a00, emissiveIntensity:.4});

    /* hero bottle (follows the page as you scroll) */
    var bottle = new THREE.Group(), inner = new THREE.Group(); bottle.add(inner);
    var prof = [[0,0],[.78,0],[.9,.1],[.92,.9],[.86,1.5],[.55,2.0],[.32,2.3],[.3,2.9],[.34,3.0],[0,3.0]]
      .map(function(p){ return new THREE.Vector2(p[0], p[1]); });
    inner.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 48),
      new THREE.MeshPhysicalMaterial({color:0xe6a800, roughness:.06, metalness:.08, transparent:true, opacity:.9, clearcoat:1, emissive:0x7a5400, emissiveIntensity:.5})));
    var cap = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .34, 28), new THREE.MeshStandardMaterial({color:0x0b4d3b, roughness:.35, metalness:.4}));
    cap.position.y = 3.17; inner.add(cap);
    var label = new THREE.Mesh(new THREE.CylinderGeometry(.935, .935, .8, 40, 1, true, 0, Math.PI * 1.45),
      new THREE.MeshStandardMaterial({color:0xf3e6b8, roughness:.8, side:THREE.DoubleSide}));
    label.position.y = .95; inner.add(label);
    inner.position.y = -1.55;
    var ringMat = new THREE.MeshBasicMaterial({color:0xf0c850, transparent:true, opacity:.55});
    var ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.1, .018, 8, 80), ringMat);
    var ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.6, .012, 8, 80), ringMat);
    bottle.add(ring1, ring2); S.add(bottle);

    /* seeds + falling oil drops */
    var seeds = [], drops = [], N = small ? 22 : 48, D = small ? 6 : 12;
    var sg = new THREE.SphereGeometry(.2, 14, 12);
    for(var i = 0; i < N; i++){
      var m = new THREE.Mesh(sg, gold); m.scale.set(1, 1.2, 1);
      m.userData = {nx:(i % 2 ? 1 : -1) * (.5 + Math.random() * .5), y0:Math.random() * 24, z:-4 + Math.random() * 6,
        sp:.3 + Math.random() * .6, ph:Math.random() * 6.28, par:.5 + Math.random() * 1.5, ox:0, oy:0};
      S.add(m); seeds.push(m);
    }
    var dp = [[0,0],[.12,.05],[.2,.2],[.22,.38],[.15,.58],[.06,.8],[0,.98]].map(function(p){ return new THREE.Vector2(p[0], p[1]); });
    var dg = new THREE.LatheGeometry(dp, 14);
    for(var j = 0; j < D; j++){
      var d = new THREE.Mesh(dg, gold); d.scale.setScalar(.7 + Math.random() * .7);
      d.userData = {nx:(j % 2 ? 1 : -1) * (.45 + Math.random() * .55), y:Math.random() * 14 - 7, v:1.2 + Math.random() * 1.6, z:-2 + Math.random() * 3};
      S.add(d); drops.push(d);
    }
    /* sparkles */
    var P = small ? 90 : 220, pos = new Float32Array(P * 3);
    for(var k = 0; k < P; k++){ pos[k*3] = (Math.random() - .5) * 26; pos[k*3+1] = (Math.random() - .5) * 16; pos[k*3+2] = -6 + Math.random() * 9; }
    var pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var sparkle = new THREE.Points(pg, new THREE.PointsMaterial({color:0xffd966, size:.07, transparent:true, opacity:.8, blending:THREE.AdditiveBlending, depthWrite:false}));
    S.add(sparkle);

    var halfW = 8, halfH = 5.6, bx = 0, bs = 1, visible = true;
    function size(){
      R.setSize(innerWidth, innerHeight, false); C.aspect = innerWidth / innerHeight; C.updateProjectionMatrix();
      halfH = Math.tan(25 * Math.PI / 180) * 12; halfW = halfH * C.aspect; small = innerWidth < 700;
    }
    size(); addEventListener('resize', size);
    document.addEventListener('visibilitychange', function(){ visible = !document.hidden; });

    var last = performance.now();
    (function loop(now){
      requestAnimationFrame(loop);
      if(!visible) return;
      now = now || performance.now(); var dt = Math.min(.05, (now - last) / 1000); last = now; var t = now / 1000;
      var wx = mx * 2 * halfW, wy = -my * 2 * halfH, H = halfH * 2 + 3;
      var dh = Math.max(1, document.documentElement.scrollHeight - innerHeight), p = scrollY / dh;

      /* bottle: sticks to the left/right margin, swings across between sections, spins with scroll */
      var inHero = scrollY < innerHeight * .8;
      var tx = Math.tanh(Math.cos(p * Math.PI * 7) * 3) * halfW * (small ? .72 : .8);
      var ts = small ? (scrollY < innerHeight * .9 ? .62 : .0001) : (inHero ? 1.4 : 1);
      bx += (tx - bx) * .06; bs += (ts - bs) * .06;
      bottle.position.set(bx, Math.sin(t * 1.1) * .25 + (inHero ? -.3 : 0) - p * 0, 0);
      bottle.scale.setScalar(bs);
      bottle.rotation.y = t * .7 + p * 28 + mx;
      bottle.rotation.z = -bx * .03 + Math.sin(t * .8) * .05;
      ring1.rotation.set(1.2, t * .6, 0); ring2.rotation.set(1.9, -t * .45, .3);

      seeds.forEach(function(m){
        var u = m.userData, x = u.nx * halfW, y = ((u.y0 - scrollY * .006 * u.par) % H + H) % H - H / 2 + Math.sin(t * u.sp + u.ph) * .5;
        var ddx = x - wx, ddy = y - wy, dd = Math.sqrt(ddx * ddx + ddy * ddy), push = dd < 2.4 ? (2.4 - dd) / 2.4 : 0;
        u.ox += (ddx / (dd || 1) * push * 2.2 - u.ox) * .1; u.oy += (ddy / (dd || 1) * push * 2.2 - u.oy) * .1;
        m.position.set(x + u.ox + Math.sin(t * u.sp * .7 + u.ph) * .4, y + u.oy, u.z);
        m.rotation.x = t * u.sp * 1.4; m.rotation.y = t * u.sp;
      });
      drops.forEach(function(d){
        var u = d.userData; u.y -= u.v * dt;
        if(u.y < -halfH - 1.5){ u.y = halfH + 1.5; u.nx = (Math.random() < .5 ? -1 : 1) * (.45 + Math.random() * .55); }
        d.position.set(u.nx * halfW, u.y, u.z); d.rotation.y = t; d.rotation.z = Math.sin(t * 2 + u.nx * 9) * .15;
      });
      sparkle.rotation.y = t * .02; sparkle.position.y = (scrollY * .0015) % 2; sparkle.material.opacity = .55 + Math.sin(t * 2) * .25;
      C.position.x += (mx * 1.2 - C.position.x) * .04; C.position.y += (-my * .8 - C.position.y) * .04; C.lookAt(0, 0, 0);
      R.render(S, C);
    })();
  }
})();
