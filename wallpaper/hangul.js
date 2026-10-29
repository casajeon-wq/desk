// 바탕화면 메모용 한글 조합기.
// Lively가 키보드를 넘겨줄 때 윈도우 한글 입력기(IME)를 거치지 않아 "바보"가 "qhqk"와 섞여 들어갔다.
// 그래서 메모를 쓸 땐 IME를 쓰지 않고, 누른 자판(두벌식)을 여기서 직접 한글로 조합한다.
(function () {
  const KEY = { q: 'ㅂ', w: 'ㅈ', e: 'ㄷ', r: 'ㄱ', t: 'ㅅ', y: 'ㅛ', u: 'ㅕ', i: 'ㅑ', o: 'ㅐ', p: 'ㅔ', a: 'ㅁ', s: 'ㄴ', d: 'ㅇ', f: 'ㄹ', g: 'ㅎ', h: 'ㅗ', j: 'ㅓ', k: 'ㅏ', l: 'ㅣ', z: 'ㅋ', x: 'ㅌ', c: 'ㅊ', v: 'ㅍ', b: 'ㅠ', n: 'ㅜ', m: 'ㅡ',
    Q: 'ㅃ', W: 'ㅉ', E: 'ㄸ', R: 'ㄲ', T: 'ㅆ', O: 'ㅒ', P: 'ㅖ' };
  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
  const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const CV = { 'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ' };
  const CF = { 'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ' };
  const isV = (j) => JUNG.includes(j);
  // 자모 배열 → 글자 (예: ['ㅂ','ㅏ','ㅂ','ㅗ'] → '바보')
  function assemble(js) {
    let out = '', c = null, v = null, f = [];
    const flush = () => {
      if (c && v) out += String.fromCharCode(0xac00 + (CHO.indexOf(c) * 21 + JUNG.indexOf(v)) * 28 + JONG.indexOf(f.length === 2 ? CF[f.join('')] : f[0] || ''));
      else out += (c || '') + (v || '') + f.join('');
      c = null; v = null; f = [];
    };
    for (const j of js) {
      if (!isV(j)) {
        if (c && v) {
          if (!f.length && JONG.includes(j)) f = [j];
          else if (f.length === 1 && CF[f[0] + j]) f = [f[0], j];
          else { flush(); c = j; }
        } else { if (c || v) flush(); c = j; }
      } else if (c && !v) v = j;
      else if (v && !f.length && CV[v + j]) v = CV[v + j];
      else if (c && v && f.length) { const moved = f.pop(); flush(); c = moved; v = j; }
      else { flush(); v = j; }
    }
    flush();
    return out;
  }
  window.HANGUL = { KEY, assemble };
})();
