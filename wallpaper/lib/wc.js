// 수채화 붓 라이브러리 (Canvas2D)
// 핵심: 다각형을 무작위로 일그러뜨린 얇은 층을 수십 장 겹쳐 칠하면 가장자리가 진해지고 번지는 수채화 느낌이 난다.
(function () {
  let seed = 1;
  const W = (window.WC = {});
  W.seed = s => { seed = (s >>> 0) || 1; };
  W.rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
  W.range = (a, b) => a + (b - a) * W.rnd();
  W.gauss = () => { let u = 0; while (!u) u = W.rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * W.rnd()); };

  // 다각형 일그러뜨리기 (v = 흔들림 px, 단계마다 0.6배)
  W.deform = (pts, depth, v) => {
    let cur = pts.map(p => ({ x: p.x, y: p.y, v: p.v ?? v }));
    for (let d = 0; d < depth; d++) {
      const out = [];
      for (let i = 0; i < cur.length; i++) {
        const a = cur[i], b = cur[(i + 1) % cur.length];
        const ang = W.rnd() * Math.PI * 2, m = W.gauss() * (a.v + b.v) / 2;
        out.push(a, { x: (a.x + b.x) / 2 + Math.cos(ang) * m, y: (a.y + b.y) / 2 + Math.sin(ang) * m, v: (a.v + b.v) / 2 * 0.6 });
      }
      cur = out;
    }
    return cur;
  };

  W.path = (ctx, pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); };
  W.bbox = pts => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); } return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 }; };
  W.ellipse = (cx, cy, rx, ry, n = 48, rot = 0) => { const o = []; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; const x = Math.cos(t) * rx, y = Math.sin(t) * ry; o.push({ x: cx + x * Math.cos(rot) - y * Math.sin(rot), y: cy + x * Math.sin(rot) + y * Math.cos(rot) }); } return o; };
  // 초승달 (원 - 어긋난 원) : 구의 그림자용
  W.crescent = (cx, cy, r, dx, dy, k = 1) => {
    const o = [];
    for (let i = 0; i <= 40; i++) { const t = -Math.PI / 2 + Math.PI * i / 40 + Math.atan2(dy, dx); o.push({ x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r }); }
    for (let i = 40; i >= 0; i--) { const t = -Math.PI / 2 + Math.PI * i / 40 + Math.atan2(dy, dx); o.push({ x: cx - dx * k + Math.cos(t) * r * 0.92, y: cy - dy * k + Math.sin(t) * r * 0.92 }); }
    return o;
  };

  let CW = 1200, CH = 1200;
  W.size = (w, h) => { CW = w; CH = h; };
  const off = () => { const c = document.createElement('canvas'); c.width = CW; c.height = CH; return c; };

  // 물감 한 번 칠하기
  W.wash = (ctx, poly, color, o = {}) => {
    const { layers = 36, alpha = 0.05, v = 6, baseDepth = 2, depth = 3, mask = true, blend = 'multiply', groups = 3, holes = 50, holeR = [4, 24], clip = null } = o;
    const base = W.deform(poly, baseDepth, v);
    const bb = W.bbox(poly);
    for (let g = 0; g < groups; g++) {
      const c = off(), x = c.getContext('2d');
      if (clip) { W.path(x, clip); x.clip(); }
      x.fillStyle = color; x.globalAlpha = alpha;
      for (let i = 0; i < layers / groups; i++) { W.path(x, W.deform(base, depth, v * 0.7)); x.fill(); }
      if (mask) {
        x.globalCompositeOperation = 'destination-out'; x.globalAlpha = 1;
        for (let k = 0; k < holes; k++) {
          x.fillStyle = `rgba(0,0,0,${W.range(0.06, 0.28)})`;
          x.beginPath(); x.arc(W.range(bb.x0, bb.x1), W.range(bb.y0, bb.y1), W.range(holeR[0], holeR[1]), 0, 7); x.fill();
        }
      }
      ctx.save(); ctx.globalCompositeOperation = blend; ctx.drawImage(c, 0, 0); ctx.restore();
    }
  };

  // 불투명 바탕 (흰 크림처럼 아래 색을 덮을 때)
  W.base = (ctx, poly, color, v = 2) => { ctx.save(); ctx.fillStyle = color; ctx.globalCompositeOperation = 'source-over'; W.path(ctx, W.deform(poly, 2, v)); ctx.fill(); ctx.restore(); };

  // 붓 선 (굵기 변화 + 떨림)
  W.line = (ctx, pts, width, color, o = {}) => {
    const { alpha = 0.8, jitter = 1.2, passes = 2, taper = true, blend = 'multiply' } = o;
    ctx.save(); ctx.globalCompositeOperation = blend; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let p = 0; p < passes; p++) {
      ctx.globalAlpha = alpha / passes * 1.4;
      for (let i = 1; i < pts.length; i++) {
        const t = i / (pts.length - 1);
        const w = width * (taper ? Math.sin(Math.PI * Math.min(0.98, Math.max(0.02, t))) ** 0.5 : 1) * W.range(0.75, 1.15);
        ctx.lineWidth = Math.max(0.6, w);
        ctx.beginPath();
        ctx.moveTo(pts[i - 1].x + W.gauss() * jitter, pts[i - 1].y + W.gauss() * jitter);
        ctx.lineTo(pts[i].x + W.gauss() * jitter, pts[i].y + W.gauss() * jitter);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  // 곡선 보간 (캣멀-롬)
  W.spline = (pts, n = 12) => {
    const o = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        o.push({
          x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        });
      }
    }
    o.push(pts[pts.length - 1]);
    return o;
  };

  // 종이 결 (알파가 있는 곳에만 아주 옅게)
  W.grain = (ctx, amt = 0.12) => {
    const img = ctx.getImageData(0, 0, CW, CH), d = img.data;
    for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; const n = 1 - amt * W.rnd(); d[i] *= n; d[i + 1] *= n; d[i + 2] *= n; }
    ctx.putImageData(img, 0, 0);
  };

  // 점이 다각형 안에 있는지
  W.inside = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) c = !c; } return c; };
})();
