// 흑백 선 아이콘 (24×24, 선 굵기는 index.html에서 지정). 앱 로고를 그대로 쓰지 않고 배경 톤에 맞춰 단순하게 다시 그린 것.
window.ICONS = {
  blender: '<circle cx="14.5" cy="13.5" r="6"/><circle cx="14.5" cy="13.5" r="2.3"/><path d="M10 9.2 3 5M9.6 12.6H3.5M10.4 16.6 6 20"/>',
  mixamo: '<circle cx="13.5" cy="4.3" r="1.8"/><path d="M12.6 7.4 11 13.6l3.6 3-1.2 4.6M11 13.6 7.4 20.2M12.2 9.2 8.2 11.6M12.8 9.4l4.4 2.4"/>',
  vroid: '<circle cx="12" cy="10" r="6.5"/><path d="M5.6 9.4c2-3.6 6.4-4.4 9.6-1.6M8.6 10.6v1.2M15.4 10.6v1.2M10.4 14.2c1 .7 2.2.7 3.2 0M7 16.5 5 21M17 16.5l2 4.5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/><path d="M8 10.5h5M8 8h3"/>',
  // 왼쪽 메뉴
  home: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  pen: '<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/>',
  spark: '<path d="M12 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z"/><path d="M19 17v4M17 19h4"/>',
  film: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  wrench: '<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5a4 4 0 0 0-2-2z"/><path d="M15 4l2 2"/>',
  // 글쓰기
  story: '<path d="M3 5.5C5.5 4.5 8.5 4.5 12 6.5c3.5-2 6.5-2 9-1v13c-2.5-1-5.5-1-9 1-3.5-2-6.5-2-9-1z"/><path d="M12 6.5v13"/><path d="M16.5 9.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/>',
  gem: '<path d="M12 2.5 6 7l-1 9 7 5.5 7-5.5-1-9z"/><path d="M12 2.5 10 12l2 9.5M6 7l4 5-5 4M18 7l-8 5"/>',
  notion: '<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M9 16.5V8l6 8.5V8"/>',
  nib: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4"/><path d="M9 17l1.5-5 3.5-3.5 2 2-3.5 3.5z"/>',
  ridi: '<path d="M6 3h11a1 1 0 0 1 1 1v17l-6-3.5L6 21z"/><path d="M10 13V8h2.2a1.6 1.6 0 0 1 0 3.2H10M12.2 11.2 14 13"/>',
  translate: '<path d="M3 5h9M7.5 3v2M5 5c.5 3 2.5 5.5 6 7M10 5c-.5 3-2.5 6-6 8"/><path d="M13 21l4-10 4 10M14.5 17.5h5"/>',
  han: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8 7.5h4M7 9.5h6M10 11a1.8 1.8 0 1 0 0 .01M15.5 7v6M15.5 10h2M8.5 14.5v3h7"/>',
  han2: '<rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke-dasharray="2.5 2"/><path d="M8 7.5h4M7 9.5h6M10 11a1.8 1.8 0 1 0 0 .01M15.5 7v6M15.5 10h2M8.5 14.5v3h7"/>',
  pdf: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M8.5 17v-5h1.5a1.3 1.3 0 0 1 0 2.6H8.5M12.5 12v5h1a2.5 2.5 0 0 0 0-5zM17 12h-1.5v5M15.5 14.5H17"/>',
  // AI
  claude: '<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="M6.5 10l3 2.5-3 2.5M12 15h3"/><path d="M17.5 6.5v3M16 8h3"/>',
  orbit: '<circle cx="12" cy="12" r="3.5"/><ellipse cx="12" cy="12" rx="9.5" ry="4" transform="rotate(-30 12 12)"/><path d="M19 3.5l1.5 1.5L19 6.5"/>',
  knot: '<path d="M12 3.5a4 4 0 0 1 4 4v5l-4 2.3-4-2.3"/><path d="M19.4 8a4 4 0 0 1-1.4 5.4l-4.3 2.5-4-2.3V9"/><path d="M19.4 16a4 4 0 0 1-5.4 1.4l-4.3-2.5"/><path d="M12 20.5a4 4 0 0 1-4-4v-5l4-2.3 4 2.3"/><path d="M4.6 16a4 4 0 0 1 1.4-5.4l4.3-2.5 4 2.3V15"/><path d="M4.6 8A4 4 0 0 1 10 6.6l4.3 2.5"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3"/>',
  tablet: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M10.5 18.5h3"/><path d="M9 9.5c1.6-1.6 4.4-1.6 6 0M10.6 11.6c.8-.8 2-.8 2.8 0"/>',
  cloudpaint: '<path d="M7 18.5h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 10.8 3.9 3.9 0 0 0 7 18.5z"/><path d="M12 11.6c.3 1.3.9 1.9 2.2 2.2-1.3.3-1.9.9-2.2 2.2-.3-1.3-.9-1.9-2.2-2.2 1.3-.3 1.9-.9 2.2-2.2z"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.4-1.3-1.6-1.3-3 0-1.1.9-2 2-2H17a4 4 0 0 0 4-4c0-3.9-4-7-9-7z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
  seCall: '<path d="M4 5h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3.5V15H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><circle cx="16.5" cy="15.5" r="3.2"/><path d="M19 18l2.5 2.5"/>',
  manga: '<rect x="3.5" y="3" width="17" height="18" rx="1.5"/><path d="M3.5 10h17M12 3v7M3.5 15h9l3.5-5"/><path d="M15 18h3"/>',
  obsidian: '<path d="M9.5 2.5 5 9l1.5 7.5 5.5 5 5-4 2-7-5-8z"/><path d="M9.5 2.5 11 11l-4.5 5.5M11 11l6 6.5M11 11l8-.5"/>',
  // 영상
  cut: '<circle cx="6.5" cy="17" r="3"/><circle cx="17.5" cy="17" r="3"/><path d="M8.5 14.8 18 3.5M15.5 14.8 6 3.5"/>',
  cone: '<path d="M9.5 4h5l4 14h-13z"/><path d="M8.3 9h7.4M7 13.5h10"/><path d="M3.5 18h17v2.5h-17z"/>',
  down: '<path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5"/><path d="M4 15v4.5h16V15"/>',
  // 도구
  edge: '<path d="M20.5 13.5A8.5 8.5 0 1 1 12 3.5c4.5 0 8 3 8 7 0 2.5-2 4-4.5 4H9.5"/><path d="M9.5 14.5c0 3 2.5 5 6 4.5"/><path d="M9.5 14.5c0-2.5 2-4.5 5-4.5"/>',
  house: '<path d="M4 11 12 4l8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/><path d="M16 5.5V3.5h2V7"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6"/>',
  plane: '<path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="M21 3 10 13"/>',
  wind: '<path d="M3 9h11a3 3 0 1 0-3-3"/><path d="M3 13h15a3 3 0 1 1-3 3"/><path d="M3 17h7"/>',
  grid: '<rect x="3.5" y="4" width="17" height="16" rx="1.5"/><path d="M3.5 9h17M3.5 14.5h17M9.5 4v16M15 4v16"/>',
  slides: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/><path d="M7 12l3-3 2.5 2 4-4"/>',
  word: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M8.5 11l1.5 6 2-4.5 2 4.5 1.5-6"/>',
  folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>'
};
// 라마 얼굴, 음표
window.ICONS.llama = '<path d="M8 3v5M16 3v5"/><path d="M6.5 10.5C6.5 7.5 9 6 12 6s5.5 1.5 5.5 4.5V17a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4z"/><circle cx="9.5" cy="12" r=".6" fill="currentColor"/><circle cx="14.5" cy="12" r=".6" fill="currentColor"/><path d="M10.5 16.5c1 .7 2 .7 3 0"/>';
window.ICONS.muse = '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/><path d="M9 9l11-2"/>';
// 전원 버튼
window.ICONS.power = '<path d="M12 3v8"/><path d="M6.6 6.6a8 8 0 1 0 10.8 0"/>';
// 강아지 얼굴(처진 귀)
window.ICONS.dog = '<path d="M7 6.5C5 5 3 6 3 8.5c0 2 1 4 2.5 4.5"/><path d="M17 6.5C19 5 21 6 21 8.5c0 2-1 4-2.5 4.5"/><path d="M7 6.5C8.3 5.5 10 5 12 5s3.7.5 5 1.5c1 1.5 1.5 3.5 1.5 6 0 4.5-3 7.5-6.5 7.5s-6.5-3-6.5-7.5c0-2.5.5-4.5 1.5-6z"/><circle cx="9.5" cy="11" r=".6" fill="currentColor"/><circle cx="14.5" cy="11" r=".6" fill="currentColor"/><path d="M11 14.5h2l-1 1.2z"/><path d="M12 15.7v1.3"/>';

window.ICONS.phone = '<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M10.5 18.5h3"/>';

window.ICONS.book = '<path d="M12 7C9.5 5.3 7 5.2 4 5.8v12c3-.6 5.5-.5 8 1.2 2.5-1.7 5-1.8 8-1.2v-12c-3-.6-5.5-.5-8 1.2z"/><path d="M12 7v12"/>';
window.ICONS.qoder = '<circle cx="11" cy="11" r="7"/><path d="M15 15l5 5"/><path d="M9 9.5l-2 1.5 2 1.5M13 9.5l2 1.5-2 1.5"/>';
window.ICONS.insta = '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r=".6" fill="currentColor"/>';
window.ICONS.reactor = '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".9" fill="currentColor"/>';
