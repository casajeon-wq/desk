// 3D 턴테이블 (three.js r147). 성공하면 SVG 턴테이블(#tt)을 숨기고 같은 자리에 그린다. WebGL이 안 되면 SVG 그대로.
(function () {
  const host = document.getElementById('tt3d'), svg = document.getElementById('tt'), stage = document.getElementById('stage');
  if (!window.THREE || !host) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { host.remove(); return; }
  const W = 560, H = 402;
  const pr = () => Math.min(3, (window.devicePixelRatio || 1) * Math.max(innerWidth / 1440, innerHeight / 900));
  renderer.setPixelRatio(pr()); renderer.setSize(W, H);
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .82;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement); svg.style.display = 'none';
  addEventListener('resize', () => { renderer.setPixelRatio(pr()); renderer.setSize(W, H); });

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(24, W / H, 0.1, 100);
  if (window.TT_MODE === '3d-angle') { camera.fov = 26; camera.updateProjectionMatrix(); camera.position.set(3.9, 5.1, 6.0); camera.lookAt(-.05, -.25, .15); } else { camera.position.set(0, 9.45, 4.1); camera.lookAt(0, 0, 0.14); }
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(-4, 9, 5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 4; Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.15));

  // ---- 캔버스로 만든 질감 ----
  const tex = (w, h, draw, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; };
  const brushed = tex(512, 512, (g, w, h) => { g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const y = Math.random() * h, v = 120 + Math.random() * 90; g.fillStyle = `rgba(${v},${v},${v},.35)`; g.fillRect(0, y, w, Math.random() * 1.4 + .3); } });
  brushed.encoding = THREE.LinearEncoding;
  const grooves = tex(1024, 1024, (g, w) => {
    const c = w / 2; g.fillStyle = '#0c0c0c'; g.fillRect(0, 0, w, w);
    for (let r = 160; r < 505; r += 1.6) { const band = (r > 300 && r < 306) || (r > 410 && r < 416); g.strokeStyle = band ? '#050505' : (Math.random() < .5 ? '#191919' : '#101010'); g.lineWidth = 1; g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke(); }
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 3; g.beginPath(); g.arc(c, c, 508, 0, Math.PI * 2); g.stroke();
  });
  const grooveRough = tex(1024, 1024, (g, w) => { const c = w / 2; g.fillStyle = '#777'; g.fillRect(0, 0, w, w); for (let r = 160; r < 505; r += 1.6) { const v = 60 + Math.random() * 120; g.strokeStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke(); } });
  grooveRough.encoding = THREE.LinearEncoding;
  const now = new Date(), DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const label = tex(512, 512, (g, w) => {
    const c = w / 2; g.fillStyle = '#ebe5d6'; g.beginPath(); g.arc(c, c, 250, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c9c0ac'; g.lineWidth = 3; g.beginPath(); g.arc(c, c, 236, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#2a2a2a'; g.textAlign = 'center'; g.font = '700 46px Galmuri, monospace'; g.fillText('DESK', c, c - 70);
    g.font = '400 30px Galmuri, monospace'; g.fillStyle = '#555'; g.fillText(`${now.getMonth() + 1}.${now.getDate()} ${DAYS[now.getDay()]}`, c, c + 92);
    g.fillText('33⅓ RPM · SIDE A', c, c + 140); g.fillStyle = '#c62f28'; g.fillRect(c - 150, c + 30, 300, 6);
  });
  const strobe = tex(2048, 64, (g, w, h) => { g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; for (let x = 0; x < w; x += 10) { g.fillRect(x, 10, 4, 16); g.fillRect(x + 5, 38, 4, 14); } });

  // ---- 재질 ----
  const plinthMat = new THREE.MeshPhysicalMaterial({ color: 0xc9c9c6, metalness: 1, roughness: .3, roughnessMap: brushed, clearcoat: .25, clearcoatRoughness: .3, envMapIntensity: .75 });
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xf1f1f1, metalness: 1, roughness: .1 });
  const satin = new THREE.MeshPhysicalMaterial({ color: 0xbdbdbd, metalness: 1, roughness: .28 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x111111, metalness: .2, roughness: .55, envMapIntensity: .4 });
  const vinyl = new THREE.MeshPhysicalMaterial({ map: grooves, roughness: .5, roughnessMap: grooveRough, metalness: 0, clearcoat: .8, clearcoatRoughness: .07, envMapIntensity: .55 });
  const top = 0.22, root = new THREE.Group(); scene.add(root);
  const add = (geo, mat, x, y, z, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };

  // 몸체
  add(new THREE.RoundedBoxGeometry(5.6, .44, 4.04, 8, .2), plinthMat, 0, 0, 0);
  for (const [x, z] of [[-2.6, -1.82], [2.6, -1.82], [-2.6, 1.82], [2.6, 1.82]]) add(new THREE.CylinderGeometry(.06, .06, .02, 24), satin, x, top + .005, z);
  // 플래터(옆면 점 무늬) + 판
  const pc = { x: -.72, z: .02 };
  add(new THREE.CylinderGeometry(1.84, 1.84, .1, 128), [new THREE.MeshPhysicalMaterial({ map: strobe, metalness: 1, roughness: .3 }), satin, satin], pc.x, top + .05, pc.z);
  const disc = new THREE.Group(); disc.position.set(pc.x, top + .1, pc.z); root.add(disc);
  const rec = add(new THREE.CylinderGeometry(1.7, 1.7, .03, 160), [black, vinyl, black], 0, .015, 0, disc);
  rec.material[1].map.center.set(.5, .5);
  add(new THREE.CylinderGeometry(.56, .56, .032, 96), [black, new THREE.MeshPhysicalMaterial({ map: label, roughness: .7 }), black], 0, .018, 0, disc);
  add(new THREE.CylinderGeometry(.035, .035, .16, 24), chrome, pc.x, top + .14, pc.z);

  // 톤암 (축을 중심으로 돌릴 수 있게 묶음)
  const pivot = new THREE.Group(); pivot.position.set(1.86, top, -1.32); root.add(pivot);
  add(new THREE.CylinderGeometry(.46, .5, .08, 64), satin, 0, .04, 0, pivot);
  add(new THREE.CylinderGeometry(.24, .24, .2, 48), chrome, 0, .17, 0, pivot);
  add(new THREE.TorusGeometry(.33, .025, 12, 64), chrome, 0, .1, 0, pivot).rotation.x = Math.PI / 2;
  const arm = new THREE.Group(); arm.position.y = .26; pivot.add(arm);
  add(new THREE.CylinderGeometry(.17, .17, .32, 40), black, 0, 0, -.5, arm).rotation.x = Math.PI / 2; // 무게추
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, -.3), new THREE.Vector3(0, 0, .2), new THREE.Vector3(-.12, -.02, 1.75), new THREE.Vector3(-.95, -.08, 2.32)]);
  add(new THREE.TubeGeometry(path, 80, .06, 16), chrome, 0, 0, 0, arm);
  const head = add(new THREE.BoxGeometry(.36, .08, .5), satin, -1.08, -.1, 2.42, arm); head.rotation.y = -.95;
  add(new THREE.BoxGeometry(.18, .1, .2), black, -1.1, -.17, 2.44, arm).rotation.y = -.95;
  add(new THREE.CylinderGeometry(.05, .05, .2, 16), chrome, -.82, -.04, 2.6, arm).rotation.z = Math.PI / 2.4; // 손잡이
  // 받침대, 손잡이들, 슬라이더, 버튼, LED
  add(new THREE.CylinderGeometry(.05, .05, .3, 16), satin, 2.22, top + .15, .72);
  add(new THREE.CylinderGeometry(.26, .28, .14, 48), chrome, 2.2, top + .07, 1.34);
  add(new THREE.BoxGeometry(.1, .02, 1.3), black, 2.3, top + .01, -.02);
  add(new THREE.RoundedBoxGeometry(.32, .1, .2, 4, .04), satin, 2.3, top + .05, .1);
  add(new THREE.RoundedBoxGeometry(.5, .08, .36, 4, .05), black, -2.36, top + .04, 1.58);
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff2a1f, emissiveIntensity: 2 });
  add(new THREE.BoxGeometry(.16, .02, .05), ledMat, -2.36, top + .1, 1.24);
  // 그림자 받는 바닥(투명, 그림자만)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: .35 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.23; floor.receiveShadow = true; scene.add(floor);

  // 판 바꾸기(흑연 판이면 몸체를 어둡게)
  const theme = () => { const g = document.body.classList.contains('graphite'); plinthMat.color.set(g ? 0x3c3c3c : 0xd6d6d3); plinthMat.roughness = g ? .45 : .34; };
  theme(); new MutationObserver(theme).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // 마우스를 따라 살짝 기울기
  let mx = 0, my = 0; addEventListener('mousemove', e => { mx = (e.clientX / innerWidth - .5); my = (e.clientY / innerHeight - .5); });
  host.addEventListener('click', () => document.getElementById('playBtn').click());

  let speed = 1.75, armLift = 0, last = performance.now(), acc = 0;
  (function loop(t) {
    requestAnimationFrame(loop);
    const dt = Math.min(.1, (t - last) / 1000); last = t; acc += dt; if (acc < 1 / 40) return; const step = acc; acc = 0;
    const paused = stage.classList.contains('paused');
    speed += ((paused ? 0 : 1.75) - speed) * Math.min(1, step * (paused ? 1.6 : 2.4)); // 멈출 땐 천천히 감속
    disc.rotation.y -= speed * step;
    armLift += ((paused ? 1 : 0) - armLift) * Math.min(1, step * 3);
    pivot.rotation.y = -.32 * armLift + Math.sin(t / 1100) * .004 * (1 - armLift);
    arm.rotation.x = -.06 * armLift;
    ledMat.emissiveIntensity = paused ? .3 : (Math.sin(t / 380) > -.6 ? 2 : .6);
    root.rotation.x += (my * .03 - root.rotation.x) * .05; root.rotation.z += (-mx * .025 - root.rotation.z) * .05;
    renderer.render(scene, camera);
  })(performance.now());
})();
