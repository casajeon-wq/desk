// 수채화 턴테이블 (표지 때 쓴 lib/wc.js 붓 사용). 크림 종이 카드 위에 세 겹: 바탕 / 돌아가는 레코드 / 톤암
window.buildTTWc = function () {
  if (!window.WC) return null;
  const K = 2, Wd = 560 * K, Ht = 402 * K, W = window.WC; W.size(Wd, Ht); W.seed(11);
  const slot = document.createElement('div'); slot.className = 'ttp ttwc'; slot.id = 'tt-wc';
  document.getElementById('tt').after(slot);
  slot.addEventListener('click', () => document.getElementById('playBtn').click());
  const layer = cls => { const c = document.createElement('canvas'); c.width = Wd; c.height = Ht; c.className = cls; slot.appendChild(c); return c.getContext('2d'); };
  const base = layer('wc-base'), rec = layer('wc-rec spin'), top = layer('wc-top');
  const P = (x, y) => ({ x: x * K, y: y * K });
  const rect = (x0, y0, x1, y1, r) => { const o = [], k = 8; const arc = (cx, cy, a0) => { for (let i = 0; i <= k; i++) { const t = a0 + i / k * Math.PI / 2; o.push(P(cx + Math.cos(t) * r, cy + Math.sin(t) * r)); } }; arc(x1 - r, y1 - r, 0); arc(x0 + r, y1 - r, Math.PI / 2); arc(x0 + r, y0 + r, Math.PI); arc(x1 - r, y0 + r, Math.PI * 1.5); return o; };
  const circ = (cx, cy, r, n = 64) => W.ellipse(cx * K, cy * K, r * K, r * K, n);

  // 종이 카드
  base.fillStyle = '#f3eee2'; W.path(base, rect(0, 0, 560, 402, 18)); base.fill();
  // 몸체: 차가운 회색 물감 두 번 + 아래쪽 그림자 한 번
  W.wash(base, rect(28, 26, 532, 378, 14), '#b8bcc5', { layers: 30, alpha: .05, v: 5 * K });
  W.wash(base, rect(28, 330, 532, 378, 14), '#8f95a1', { layers: 18, alpha: .045, v: 4 * K, holes: 20 });
  W.line(base, W.spline(rect(28, 26, 532, 378, 14).concat([rect(28, 26, 532, 378, 14)[0]]), 2), 1.6 * K, '#6f7480', { alpha: .45, jitter: .8 });
  // 플래터 테두리(점 무늬 대신 옅은 띠) + 손잡이·슬라이더·버튼
  W.wash(base, circ(236, 205, 172), '#8a909b', { layers: 28, alpha: .055, v: 3 * K, holes: 30 });
  for (const [x, y, r] of [[488, 302, 14], [62, 340, 15], [452, 92, 32]]) W.wash(base, circ(x, y, r, 32), '#7d838e', { layers: 18, alpha: .07, v: 2 * K, holes: 6, holeR: [2, 6] });
  W.line(base, [P(480, 160), P(480, 240)], 3 * K, '#5f6470', { alpha: .6, taper: false });
  W.wash(base, rect(470, 192, 492, 206, 3), '#5f6470', { layers: 12, alpha: .1, v: 1.5 * K, mask: false });
  W.wash(base, circ(70, 318, 3, 12), '#c8463c', { layers: 10, alpha: .25, v: 1 * K, mask: false });
  W.grain(base, .1);

  // 레코드판: 남색 섞인 검정을 여러 번 겹치고, 결은 아주 옅은 붓선, 라벨은 크림 + 빨간 띠
  W.wash(rec, circ(236, 205, 160, 96), '#2a2e3a', { layers: 40, alpha: .09, v: 2.5 * K, holes: 40, holeR: [6, 30] });
  W.wash(rec, circ(236, 205, 160, 96), '#1b1e27', { layers: 24, alpha: .07, v: 2 * K, holes: 60 });
  for (let r = 64; r < 156; r += 9) W.line(rec, circ(236, 205, r + W.range(-1, 1), 120).concat([circ(236, 205, r, 120)[0]]), .8 * K, '#4a5062', { alpha: .35, jitter: .5, taper: false, blend: 'source-over' });
  W.wash(rec, circ(236, 205, 54, 48), '#eadfc6', { layers: 20, alpha: .2, v: 1.5 * K, blend: 'source-over', holes: 10 });
  W.wash(rec, [P(200, 222), P(272, 222), P(272, 227), P(200, 227)], '#c8463c', { layers: 10, alpha: .25, v: .8 * K, mask: false, blend: 'source-over' });
  rec.fillStyle = '#5a5a5a'; rec.beginPath(); rec.arc(236 * K, 205 * K, 4 * K, 0, 7); rec.fill();
  rec.canvas.style.transformOrigin = `${236}px ${205}px`;

  // 톤암: 은회색 붓선 + 헤드셸 + 무게추
  const arm = W.spline([P(452, 92), P(446, 200), P(436, 262), P(380, 322)], 14);
  W.line(top, arm, 7 * K, '#9aa0aa', { alpha: .9, jitter: .4, taper: false });
  W.line(top, arm, 2.2 * K, '#e9ecf0', { alpha: .8, jitter: .3, taper: false, blend: 'source-over' });
  W.wash(top, [P(362, 316), P(392, 332), P(380, 352), P(350, 336)], '#4a4f5a', { layers: 16, alpha: .12, v: 1.5 * K, mask: false });
  W.wash(top, circ(452, 92, 14, 24), '#c9ccd2', { layers: 14, alpha: .2, v: 1 * K, blend: 'source-over', mask: false });
  W.wash(top, rect(462, 52, 490, 76, 5), '#3a3e48', { layers: 14, alpha: .12, v: 1.2 * K, mask: false });
  return slot;
};
