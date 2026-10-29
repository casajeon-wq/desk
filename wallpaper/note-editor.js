// 바탕화면 메모 편집기 — 보통 메모장처럼: 누른 자리에 커서, 끌어서 글자 고르기, 고른 뒤 Backspace·Delete·타자로 지우기/바꿔 쓰기,
// 두 번 누르기 = 낱말, 세 번 = 줄, 화살표·Shift·Home/End·Ctrl+화살표, Ctrl+A/C/X/V/Z/Y, Ctrl+Backspace/Delete(낱말).
// 진짜 입력칸(textarea)을 못 쓰는 이유: Lively가 넘겨 주는 키는 윈도우 한글 입력기를 안 거쳐서 한글이 "qhqk"로 오고,
// 키 하나가 영문+자모로 두 번 오기도 한다 → 키를 직접 받아 hangul.js로 조합하고, 글은 한 글자씩 <span>으로 직접 그린다.
// 쓰는 쪽(index.html): NoteEd.start(메모 div, 메모 객체, 누른 위치{x,y}) / NoteEd.active / NoteEd.finish()
// 알림: NoteEd.onSave(메모) = 글이 바뀜(치는 중 0.8초마다 + 끝낼 때) · NoteEd.onEnd(메모 div, 메모) = 편집 끝 · NoteEd.onToast(글)
(function () {
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const H = () => window.HANGUL;
  const JAMO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'; // 조합기에 넣을 수 있는 낱자
  // 글자 = 화면에 보이는 한 글자(이모지·결합 문자도 한 칸). 지원 안 되는 곳에선 코드 포인트 단위
  const SEG = window.Intl && Intl.Segmenter ? new Intl.Segmenter('ko', { granularity: 'grapheme' }) : null;
  const split = s => SEG ? [...SEG.segment(s)].map(x => x.segment) : [...s];

  // E = 편집 중인 메모 {el, n, t:[글자들], c:커서, a:고르기 시작(없으면 null), jb:[조합 중 자모(마지막 음절 하나)], undo, redo, px:위아래 이동 때 유지할 가로 위치}
  let E = null, mode = 'ko', keyLast = null, lastPush = 0, lastKind = '', selDrag = null, saveT = 0;
  let clicks = { t: 0, x: 0, y: 0, n: 0 };   // 두 번·세 번 누르기를 직접 센다(pointerdown의 detail은 보통 0)
  let layoutV = 0, rectCache = null;         // 글자 칸 위치 기억(글이 그대로면 다시 안 잼 → 긴 메모도 끌기가 가볍게)
  const kb = () => document.getElementById('kb');
  const focusKb = () => setTimeout(() => kb() && kb().focus({ preventScroll: true }));

  // ── 글 모델 ─────────────────────────────────────────
  const str = () => E.t.join('');
  const shown = () => E.t.slice(0, E.c).join('') + H().assemble(E.jb) + E.t.slice(E.c).join(''); // 조합 중 글자까지
  const hasSel = () => E.a != null && E.a !== E.c;
  const selRange = () => [Math.min(E.a, E.c), Math.max(E.a, E.c)];
  const changed = () => { layoutV++; rectCache = null };
  function snap(kind) { // 되돌리기 자리: 같은 종류(연속 타자 등)는 1초 안이면 하나로 묶음
    const now = Date.now();
    if (kind && kind === lastKind && now - lastPush < 1000) { lastPush = now; return }
    E.undo.push({ t: E.t.slice(), c: E.c, a: E.a, jb: E.jb.slice() }); if (E.undo.length > 200) E.undo.shift(); // 조합 중 글자도 같이 기억
    E.redo = []; lastKind = kind; lastPush = now;
  }
  function flush() { // 조합 중인 한글을 글에 확정
    if (!E.jb.length) return;
    const s = split(H().assemble(E.jb)); E.jb = [];
    E.t.splice(E.c, 0, ...s); E.c += s.length; changed();
  }
  // 자모 하나 넣기: 앞 음절이 끝났으면 그건 확정하고, 지금 고치는 음절 하나만 조합 중으로 남긴다
  // (바 + ㅂ + ㅗ → '바' 확정, '보'만 조합 중 → Backspace면 '바ㅂ')
  function feedJamo(j) {
    E.jb.push(j); changed();
    for (;;) {
      const s = split(H().assemble(E.jb)); if (s.length < 2) break;
      let k = 1; while (k < E.jb.length && H().assemble(E.jb.slice(0, k)) !== s[0]) k++;
      if (k >= E.jb.length || H().assemble(E.jb.slice(k)) !== s.slice(1).join('')) break;
      E.t.splice(E.c, 0, s[0]); E.c++; E.jb = E.jb.slice(k);
    }
  }
  function delSel() { const [x, y] = selRange(); E.t.splice(x, y - x); E.c = x; E.a = null; changed() }
  function insert(s, kind = 'type') {
    flush(); snap(kind);
    if (hasSel()) delSel(); E.a = null;
    const cs = split(s); E.t.splice(E.c, 0, ...cs); E.c += cs.length; changed();
  }
  function move(to, shift) { // to는 flush 뒤에 계산된 위치여야 함
    if (shift) { if (E.a == null) E.a = E.c } else E.a = null;
    E.c = Math.max(0, Math.min(E.t.length, to)); lastKind = ''; keyLast = null;
  }
  const lineStart = i => { while (i > 0 && E.t[i - 1] !== '\n') i--; return i };
  const lineEnd = i => { while (i < E.t.length && E.t[i] !== '\n') i++; return i };
  function wordLeft(i) { while (i > 0 && /\s/.test(E.t[i - 1])) i--; while (i > 0 && !/\s/.test(E.t[i - 1])) i--; return i }
  function wordRight(i) { while (i < E.t.length && /\s/.test(E.t[i])) i++; while (i < E.t.length && !/\s/.test(E.t[i])) i++; return i }

  // 칠 때마다 0.8초 뒤 알아서 저장(쓰다가 전원이 꺼져도 남게)
  function autosave() { clearTimeout(saveT); saveT = setTimeout(() => { if (!E) return; const t = shown(); if (t !== (E.n.text || '')) { E.n.text = t; E.n.edited = new Date().toISOString(); NoteEd.onSave && NoteEd.onSave(E.n) } }, 800) }

  // ── 그리기: 한 글자씩 span(data-i). 고른 글자 .sel, 조합 중 글자 .comp, 커서 .caret ──
  function render(opt = {}) {
    if (!E) return;
    // 고르기 시작점이 커서와 같은 자리면 '고른 것 없음'으로 정리. 안 그러면 한글이 확정되며 커서만 앞으로 가서
    // 방금 친 글자가 '고른 것'이 되고, 다음 자모에 지워진다(코덱스 최종 검수: '가끔 이상하게 지워짐'의 유력 원인)
    if (E.a === E.c) E.a = null;
    const tx = E.el.querySelector('.tx'), keep = tx.scrollTop, [x, y] = hasSel() ? selRange() : [-1, -1];
    let h = '';
    for (let i = 0; i <= E.t.length; i++) {
      if (i === E.c) { if (E.jb.length) h += `<span class="comp" data-i="comp">${esc(H().assemble(E.jb))}</span>`; if (!hasSel()) h += '<span class="caret"></span>' }
      if (i === E.t.length) break;
      const ch = E.t[i];
      h += `<span data-i="${i}"${i >= x && i < y ? ' class="sel"' : ''}>${ch === '\n' ? '\n' : esc(ch)}</span>`;
    }
    h += '<span data-i="end">​</span>'; // 마지막 줄 뒤(빈 줄 포함)를 누를 자리
    tx.innerHTML = h; tx.scrollTop = keep;
    const km = E.el.querySelector('.km'); if (km) km.textContent = mode === 'ko' ? '가' : 'A';
    // 긴 메모는 글 칸 안에서 넘김 → 커서(고르는 중이면 움직이는 끝)가 늘 보이게 그 칸만 굴린다(바탕화면 전체는 안 움직임)
    if (!opt.noScroll && tx.scrollHeight > tx.clientHeight) {
      const cr = tx.querySelector('.caret') || tx.querySelector(`span[data-i="${Math.max(0, E.c - (E.a != null && E.a < E.c ? 1 : 0))}"]`);
      if (cr) { const top = cr.offsetTop - tx.offsetTop, h2 = cr.offsetHeight || 20; if (top < tx.scrollTop) tx.scrollTop = top; else if (top + h2 > tx.scrollTop + tx.clientHeight) tx.scrollTop = top + h2 - tx.clientHeight }
    }
    autosave();
  }

  // 글자 칸 사각형(글이 안 바뀌었으면 기억해 둔 것)
  function rects() {
    const tx = E.el.querySelector('.tx'), st = tx.scrollTop;
    const b = tx.getBoundingClientRect(), box = `${Math.round(b.left)},${Math.round(b.top)},${Math.round(b.width)}`; // 메모가 옮겨지거나 크기가 바뀌어도 다시 잼
    if (rectCache && rectCache.v === layoutV && rectCache.st === st && rectCache.box === box) return rectCache.list;
    const list = [...tx.querySelectorAll('span[data-i]')].map(s => ({ i: s.dataset.i, r: s.getBoundingClientRect() })).filter(o => o.r.height);
    rectCache = { v: layoutV, st, box, list }; return list;
  }
  function hitSpan(px, py) {
    let best = null, bestD = 1e9;
    for (const o of rects()) {
      const r = o.r, dy = py < r.top ? r.top - py : py > r.bottom ? py - r.bottom : 0;
      const dx = px < r.left ? r.left - px : px > r.right ? px - r.right : 0;
      const d = dy * 1000 + dx; // 같은 줄을 먼저, 그다음 가까운 글자
      if (d < bestD) { bestD = d; best = o }
    }
    return best;
  }
  // 화면 좌표 → 글자 사이 위치(0..길이). 글자 칸 가운데보다 오른쪽이면 그 뒤. (무대 확대는 화면 좌표끼리라 상관없음, 편집 중엔 메모 기울기도 펴 둠)
  function idxAt(px, py) {
    const b = hitSpan(px, py); if (!b) return 0;
    if (b.i === 'end') return E.t.length;
    if (b.i === 'comp') return E.c;
    const i = +b.i; if (E.t[i] === '\n') return i; // 줄바꿈 칸 = 그 줄 끝
    return px > b.r.left + b.r.width / 2 ? i + 1 : i;
  }
  function selectWordAt(px, py) { // 누른 글자가 속한 덩어리(낱말 또는 띄어쓰기 덩어리)
    const b = hitSpan(px, py); if (!b || b.i === 'end' || b.i === 'comp' || !E.t.length) { E.a = null; E.c = idxAt(px, py); return }
    const i = +b.i; if (E.t[i] === '\n') { E.a = null; E.c = i; return }
    const sp = /\s/.test(E.t[i]), same = j => /\s/.test(E.t[j]) === sp && E.t[j] !== '\n';
    let x = i, y = i + 1; while (x > 0 && same(x - 1)) x--; while (y < E.t.length && same(y)) y++;
    E.a = x; E.c = y;
  }
  function caretBox() {
    const tx = E.el.querySelector('.tx'), c = tx.querySelector('.caret') || tx.querySelector(`span[data-i="${E.c}"]`) || tx.querySelector('span[data-i="end"]');
    const r = c.getBoundingClientRect(), lh = parseFloat(getComputedStyle(tx).lineHeight) || r.height || 20;
    return { x: r.left, y: r.top + r.height / 2, lh: lh * (E.el.getBoundingClientRect().height / (E.el.offsetHeight || 1)) }; // 줄 높이도 화면 배율만큼
  }

  // ── 시작·끝 ─────────────────────────────────────────
  function start(el, n, at) {
    if (E && E.n.id === n.id) { if (at) { flush(); render({ noScroll: true }); move(idxAt(at.x, at.y), false); render() } return }
    if (E) finish();
    E = { el, n, t: split(n.text || ''), c: 0, a: null, jb: [], undo: [], redo: [], px: null };
    keyLast = null; lastKind = ''; changed();
    el.classList.add('editing');
    el.insertAdjacentHTML('beforeend', '<b class="km" title="한글/영문 바꾸기 (한/영 키)">가</b>');
    if (at) { render({ noScroll: true }); E.c = idxAt(at.x, at.y) } else E.c = E.t.length; // 누른 자리 그대로 잰 뒤에 커서
    render(); focusKb();
  }
  // 끝내기: 쓴 그대로 저장(끝 줄바꿈도 그대로). 화면은 그 메모 하나만 원래 모양으로
  function finish() {
    if (!E) return; flush(); clearTimeout(saveT);
    const { n, el } = E, t = str(); E = null; selDrag = null; keyLast = null; rectCache = null;
    if (n && t !== (n.text || '')) { n.text = t; n.edited = new Date().toISOString(); NoteEd.onSave && NoteEd.onSave(n) }
    NoteEd.onEnd && NoteEd.onEnd(el, n);
  }

  // ── 클립보드 ───────────────────────────────────────
  function copySel(cut) {
    if (!hasSel()) return; const [x, y] = selRange(), s = E.t.slice(x, y).join('');
    try { navigator.clipboard.writeText(s).catch(() => legacyCopy(s)) } catch { legacyCopy(s) }
    if (cut) { snap('cut'); delSel(); render() }
  }
  function legacyCopy(s) { const ta = document.createElement('textarea'); ta.value = s; ta.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy') } catch { } ta.remove(); focusKb() }
  let pasted = 0;
  document.addEventListener('paste', e => { if (!E) return; const s = e.clipboardData && e.clipboardData.getData('text/plain'); if (s == null) return; e.preventDefault(); pasted = Date.now(); insert(s.replace(/\r\n?/g, '\n'), 'paste'); render() });
  function paste() { // paste 이벤트가 안 오면(키를 Lively가 넘겨 준 경우) 클립보드를 직접 읽어 본다
    const t0 = Date.now(), id = E.n.id;
    setTimeout(() => { if (!E || pasted >= t0) return; try { navigator.clipboard.readText().then(s => { if (E && E.n.id === id && s) { insert(s.replace(/\r\n?/g, '\n'), 'paste'); render() } }).catch(() => NoteEd.onToast && NoteEd.onToast('붙여넣기는 이 바탕화면에서 막혀 있어요')) } catch { } }, 150);
  }

  // 누른 횟수 세기: 편집 전 첫 누르기(그걸로 편집이 시작됨)도 센다 → 안 쓰던 메모를 두 번 누르면 바로 낱말 고르기
  document.addEventListener('pointerdown', e => {
    const note = e.target.closest && e.target.closest('.note'), id = note && note.dataset.id, now = Date.now();
    const near = id && id === clicks.id && now - clicks.t < 450 && Math.abs(e.clientX - clicks.x) < 6 && Math.abs(e.clientY - clicks.y) < 6;
    clicks = { t: now, x: e.clientX, y: e.clientY, id, n: near ? clicks.n + 1 : 1 };
  }, true);
  // 화면 크기·배율·글꼴이 바뀌면 기억해 둔 글자 위치는 버림
  addEventListener('resize', () => { rectCache = null });
  if (document.fonts) document.fonts.addEventListener('loadingdone', () => { rectCache = null });
  // ── 마우스: 편집 중인 메모 글 위에서 누르기 = 커서, 끌기 = 글자 고르기, 두 번 = 낱말, 세 번 = 줄. 여백·머리는 메모 옮기기 ──
  document.addEventListener('pointerdown', e => {
    if (!E) return;
    if (e.target.closest('.km')) { e.preventDefault(); flush(); mode = mode === 'ko' ? 'en' : 'ko'; keyLast = null; render(); focusKb(); return }
    if (!E.el.contains(e.target)) { finish(); return }  // 바깥 누르면 저장하고 끝
    if (e.target.closest('.tx') && e.button === 0) {
      e.preventDefault(); e.stopPropagation(); // 메모 끌기 대신 글자 고르기
      if (E.jb.length) { flush(); render({ noScroll: true }) } // 조합 중이면 먼저 확정하고 다시 그린 뒤에 위치를 잰다
      const i = idxAt(e.clientX, e.clientY); E.px = null; lastKind = ''; keyLast = null;
      if (clicks.n === 2) selectWordAt(e.clientX, e.clientY)
      else if (clicks.n >= 3) { E.a = lineStart(i); E.c = lineEnd(i) }
      else { if (e.shiftKey) { if (E.a == null) E.a = E.c } else E.a = null; E.c = i; selDrag = { id: e.pointerId } }
      render(); focusKb();
    } else focusKb();
  }, true);
  const endSel = () => { if (selDrag) { selDrag = null; if (E && E.a === E.c) E.a = null } };
  window.addEventListener('pointermove', e => {
    if (!E || !selDrag) return;
    if (e.buttons === 0) return endSel(); // 놓은 걸 못 받았으면 여기서 끝
    const i = idxAt(e.clientX, e.clientY); if (E.a == null) E.a = E.c; if (i !== E.c) { E.c = i; render() }
  });
  window.addEventListener('pointerup', endSel); window.addEventListener('pointercancel', endSel); window.addEventListener('blur', endSel);

  // ── 키보드 ─────────────────────────────────────────
  const NAV = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
  // 이상하게 지워질 때 원인 찾기용 기록: NoteEd.onLog를 정해 두면 키·누르기마다 전후 상태를 넘긴다(안 정하면 아무것도 안 함)
  const st = () => E && { n: E.t.length, c: E.c, a: E.a, jb: E.jb.join(''), tail: shown().slice(-24) };
  const logEv = (type, e, before) => { if (!NoteEd.onLog) return; try { NoteEd.onLog({ t: Math.round(performance.now()), type, k: e.key, code: e.code, rep: e.repeat || undefined, ctrl: e.ctrlKey || undefined, sh: e.shiftKey || undefined, btn: e.buttons, x: e.clientX && Math.round(e.clientX), y: e.clientY && Math.round(e.clientY), before, after: st(), mode }) } catch { } };
  document.addEventListener('keydown', e => { if (!E) return; const b = st(); onKey(e); logEv('key', e, b) });
  document.addEventListener('pointerdown', e => { if (E) logEv('down', e, st()) }, true);
  window.addEventListener('pointerup', e => { if (E) logEv('up', e, st()) });
  // Lively는 키 하나를 0~1ms 간격으로 꼭 두 번 보낸다(첫 번째는 code가 비었거나 엉뚱함: 'f'=LaunchApp2, 'd'=AudioVolumeMute,
  // 두 번째가 제대로 된 code). 키 기록(2026-10-29)으로 확인 — Backspace·Enter·화살표·Ctrl+Z가 두 번씩 먹던 '이상하게 지워짐'의 원인.
  // → 같은 키가 15ms 안에 또 오면 무조건 하나만 쓴다(사람 손으론 15ms 안에 같은 키를 두 번 못 누르니 진짜 연타는 안 버림)
  let rawLast = null;
  function onKey(e) {
    if (!E) return;
    // 시각은 이벤트가 만들어진 때(e.timeStamp)로 비교 → 처리가 밀려 한꺼번에 와도 진짜 입력을 겹침으로 오해하지 않음
    const t0 = e.timeStamp || performance.now(), sig = e.key + '|' + (e.ctrlKey || e.metaKey ? 1 : 0) + (e.shiftKey ? 1 : 0) + (e.altKey ? 1 : 0);
    const isToggle = ev => ev.key === 'HangulMode' || ev.code === 'Lang1' || ev.code === 'AltRight' || ev.key === 'KanaMode';
    if (rawLast && rawLast.sig === sig && t0 - rawLast.t < 15) {
      e.preventDefault();
      // 첫 번째(code 엉뚱)로는 한/영 키인 걸 몰랐고 두 번째(code 정상)가 한/영 키면, 그때 한 번만 바꾼다
      if (!rawLast.toggled && isToggle(e)) { rawLast.toggled = true; flush(); mode = mode === 'ko' ? 'en' : 'ko'; keyLast = null; render() }
      return;
    }
    rawLast = { sig, t: t0, toggled: isToggle(e) };
    const k = e.key, code = e.code || '', ctrl = e.ctrlKey || e.metaKey, sh = e.shiftKey;
    if (k === 'Escape' || (k === 'Enter' && ctrl)) { e.preventDefault(); finish(); return }
    if (k !== 'ArrowUp' && k !== 'ArrowDown') E.px = null;
    if (ctrl && !e.altKey) {
      const K = code.startsWith('Key') ? code.slice(3) : (k.length === 1 ? k.toUpperCase() : k);
      if (K === 'V') { flush(); paste(); return }             // 기본 동작 → paste 이벤트로 들어옴
      if (K === 'C') { flush(); copySel(false); return }       // 기본 동작(copy 이벤트)도 막지 않음
      e.preventDefault(); flush(); keyLast = null;             // 아래는 모두 조합을 먼저 확정하고 계산
      if (K === 'A') { E.a = 0; E.c = E.t.length; return render() }
      if (K === 'X') { copySel(true); return }
      if (K === 'Z' && !sh) { const u = E.undo.pop(); if (u) { E.redo.push({ t: E.t.slice(), c: E.c, a: E.a, jb: [] }); E.t = u.t; E.c = u.c; E.a = u.a; E.jb = (u.jb || []).slice(); changed() } lastKind = ''; return render() }
      if (K === 'Y' || (K === 'Z' && sh)) { const r = E.redo.pop(); if (r) { E.undo.push({ t: E.t.slice(), c: E.c, a: E.a, jb: [] }); E.t = r.t; E.c = r.c; E.a = r.a; E.jb = (r.jb || []).slice(); changed() } lastKind = ''; return render() }
      if (k === 'Backspace') { snap('del'); if (hasSel()) delSel(); else { const w = wordLeft(E.c); E.t.splice(w, E.c - w); E.c = w; changed() } return render() }
      if (k === 'Delete') { snap('del'); if (hasSel()) delSel(); else { const w = wordRight(E.c); E.t.splice(E.c, w - E.c); changed() } return render() }
      if (k === 'ArrowLeft') { move(wordLeft(E.c), sh); return render() }
      if (k === 'ArrowRight') { move(wordRight(E.c), sh); return render() }
      if (k === 'Home') { move(0, sh); return render() }
      if (k === 'End') { move(E.t.length, sh); return render() }
      return render();
    }
    // 한/영 키는 Alt 같은 보조키로 걸러지기 전에 먼저 본다(오른쪽 Alt가 한/영인 노트북: key='Alt', code='AltRight')
    if (isToggle(e)) { e.preventDefault(); flush(); mode = mode === 'ko' ? 'en' : 'ko'; keyLast = null; return render() }
    if (e.altKey) return;
    e.preventDefault();
    // 커서·고르기 키: 조합 중이면 먼저 확정. ←/→는 확정만 하고 그 글자 뒤에 머문다(윈도우 입력기와 같게)
    if (NAV.includes(k)) {
      if (E.jb.length) { flush(); if (!sh && (k === 'ArrowLeft' || k === 'ArrowRight')) { move(E.c, false); return render() } }
      if (k === 'ArrowLeft') { if (!sh && hasSel()) move(selRange()[0], false); else move(E.c - 1, sh); return render() }
      if (k === 'ArrowRight') { if (!sh && hasSel()) move(selRange()[1], false); else move(E.c + 1, sh); return render() }
      if (k === 'Home') { move(lineStart(E.c), sh); return render() }
      if (k === 'End') { move(lineEnd(E.c), sh); return render() }
      // ↑/↓: 화면에 보이는 위·아래 줄의 같은 가로 위치로(연달아 누르면 처음 가로 위치를 기억)
      render({ noScroll: true }); const p = caretBox(); if (E.px == null) E.px = p.x;
      const px = E.px, to = idxAt(px, p.y + (k === 'ArrowUp' ? -p.lh : p.lh));
      move(to === E.c ? (k === 'ArrowUp' ? 0 : E.t.length) : to, sh); E.px = px; return render();
    }
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Process', 'Tab', 'Insert', 'PageUp', 'PageDown'].includes(k)) return;
    // 지우기·줄바꿈은 겹침 거르기 없이 바로(연타도 다 먹게)
    if (k === 'Backspace') {
      keyLast = null;
      if (hasSel()) { flush(); snap('del'); delSel(); return render() }   // 고른 게 있으면 그 부분
      if (E.jb.length) { E.jb.pop(); changed(); return render() }        // 조합 중이면 자모 하나만
      snap('del'); if (E.c > 0) { E.t.splice(E.c - 1, 1); E.c--; changed() }
      return render();
    }
    if (k === 'Delete') { keyLast = null; flush(); snap('del'); if (hasSel()) delSel(); else { E.t.splice(E.c, 1); changed() } return render() }
    if (k === 'Enter') { keyLast = null; insert('\n', 'enter'); return render() }
    // Lively는 키 하나를 두 번 넘길 때가 있다: 영문 글자('d')와 입력기가 만든 자모('ㅇ'). 짝이 되는 둘이 잇달아 오면 하나만 쓴다.
    // 키를 누르고 있어서 반복되는 진짜 입력(e.repeat)은 거르지 않고, 하나를 버렸으면 기록을 비워 다음 진짜 입력은 살린다
    const now = performance.now(), prev = e.repeat ? null : keyLast; keyLast = { k, t: now };
    const near = prev && now - prev.t < 120;
    const isJamo = /^[ㄱ-ㅣ]$/.test(k);
    let ch = null, kch = null; const m = /^Key([A-Z])$/.exec(code);
    const caps = !!(e.getModifierState && e.getModifierState('CapsLock'));
    if (m) { kch = sh ? m[1] : m[1].toLowerCase(); ch = (sh !== caps) ? m[1] : m[1].toLowerCase() } // 한글 자판은 Shift만, 영문은 CapsLock도
    else if (/^[a-zA-Z]$/.test(k)) { ch = k; kch = sh ? k.toUpperCase() : k.toLowerCase() } // code가 없을 때도 한글 자판은 Shift만 봄
    const startComp = () => { if (hasSel()) { flush(); snap('type'); delSel() } else snap('type'); E.a = null }; // 고른 글이 있으면 지우고 그 자리에 씀. 끝나면 고르기는 늘 없음
    if (isJamo) {
      // 입력기가 한글 상태라는 뜻 → 바로 앞에 같은 자판의 영문이 왔으면 그건 버리고 자모 하나만
      if (near && prev.asJamo === k && prev.k !== k) { keyLast = null; return } // 영문 키로 이미 넣은 그 자모(짝)일 때만 버림 → 진짜 'ㅎㅎ'는 살림
      if (near && prev.asLetter && E.c > 0 && (H().KEY[prev.k] || H().KEY[prev.k.toLowerCase()]) === k && E.t[E.c - 1] === prev.k) { E.t.splice(E.c - 1, 1); E.c--; changed() } // 짝인 영문일 때만 지움
      if (!JAMO.includes(k)) { insert(k); return render() } // 겹받침 같은 낱자모는 조합하지 않고 그대로
      mode = 'ko'; startComp(); feedJamo(k); keyLast.asJamo = k; return render();
    }
    if (ch) {
      const jm = H().KEY[kch] || H().KEY[kch.toLowerCase()];
      if (near && prev.k && /^[ㄱ-ㅣ]$/.test(prev.k) && prev.k === jm) { keyLast = null; return } // 자모가 먼저 왔던 짝
      if (mode === 'ko' && jm) { startComp(); feedJamo(jm); keyLast.asJamo = jm; return render() }
      insert(ch); keyLast.asLetter = true; return render();
    }
    if (k.length === 1) { insert(k); render() }
  }

  window.NoteEd = { start, finish, get active() { return E }, onSave: null, onEnd: null, onToast: null, onLog: null };
})();
