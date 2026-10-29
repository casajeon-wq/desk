// 사진 턴테이블 2종 (사진 누끼).
//  photo       : 위에서 본 몸체 + 레코드판을 오려 얹고 판 전체를 돌림
//  photo-angle : 사선으로 찍은 누끼. 원래 라벨이 무늬 없는 흰색이라, 날짜 라벨을 같은 각도로 덧씌워 그 라벨을 돌림
window.buildTTPhoto = function (mode) {
  const slot = document.createElement('div'); slot.className = 'ttp'; slot.id = 'tt-' + mode;
  document.getElementById('tt').after(slot);
  slot.addEventListener('click', () => document.getElementById('playBtn').click());
  const d = new Date(), DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  // 날짜 라벨 (크림색, 위가 보이도록 글씨는 위쪽에)
  const label = () => {
    const c = document.createElement('canvas'); c.width = c.height = 240; const g = c.getContext('2d');
    g.fillStyle = '#ece6d7'; g.beginPath(); g.arc(120, 120, 118, 0, 7); g.fill();
    g.strokeStyle = '#cbbfa6'; g.lineWidth = 2; g.beginPath(); g.arc(120, 120, 110, 0, 7); g.stroke();
    g.fillStyle = '#222'; g.textAlign = 'center'; g.font = '700 22px Galmuri, monospace'; g.fillText('DESK', 120, 78);
    g.fillStyle = '#c62f28'; g.fillRect(48, 100, 144, 4);
    g.fillStyle = '#555'; g.font = '400 16px Galmuri, monospace'; g.fillText(`${d.getMonth() + 1}.${d.getDate()} ${DAYS[d.getDay()]}`, 120, 158); g.fillText('33⅓ RPM', 120, 182);
    g.fillStyle = '#9a9a9a'; g.beginPath(); g.arc(120, 120, 5, 0, 7); g.fill();
    return c;
  };
  if (mode === 'photo') {
    // 몸체(810×631)를 높이 402에 맞춤 → 폭 516, 좌우 22px 여백. 매트 중심(323,311)·반지름 258 → ×0.637
    slot.innerHTML = '<img class="pl" src="photo/plinth.png" style="left:22px;top:0;width:516px;height:402px"><img class="spin" src="photo/record.png" style="left:64px;top:34px;width:328px;height:328px">';
  } else {
    // 누끼(637×500)를 높이 402에 맞춤 → 폭 512, 왼쪽 24px. 라벨 중심(257,186), 반지름 가로 60·세로 50 → ×0.804
    const s = 402 / 500, cx = 24 + 257 * s, cy = 186 * s, r = 60 * s, ry = 50 / 60;
    slot.innerHTML = `<img class="pl" src="photo/angle.png" style="left:24px;top:0;width:512px;height:402px">
      <div style="position:absolute;left:${cx - r}px;top:${cy - r}px;width:${2 * r}px;height:${2 * r}px;transform:scaleY(${ry})"><div class="spin lbl" style="position:absolute;inset:0"></div></div>`;
    const c = label(); c.style.cssText = 'width:100%;height:100%;display:block;border-radius:50%'; slot.querySelector('.lbl').appendChild(c);
  }
  return slot;
};
