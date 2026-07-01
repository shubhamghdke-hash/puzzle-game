// Same CDN as cartoons.js — reliable SVG loads
const TWEMOJI = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg';

const THEME_ASSETS = {
  mystery: ['1f381', '1f512', '2753', '2728', '1f4ab'],
  welcome: ['1f495', '1f338', '1f48c', '2728', '1f49d', '1f339'],
  dog: ['1f415', '1f436', '1f9b4', '1f3be', '1f415', '1f436'],
  cat: ['1f408', '1f431', '1f63b', '1f638', '1f63a', '1f63b'],
  flower: ['1f338', '1f339', '1f33c', '1f490', '1f33b', '1f337'],
  cute: ['1f970', '1f60d', '1f496', '1f31f', '1f618', '1f49e'],
  dish: ['1f35d', '1f355', '1f370', '1f60b', '1f35c', '1f961'],
  date: ['1f495', '1f4c5', '1f48c', '1f339', '1f49d', '1f496'],
};

const THEME_FALLBACK = {
  mystery: ['🎁', '🔒', '❓', '✨', '💫'],
  welcome: ['💕', '🌸', '💌', '✨', '💝', '🌹'],
  dog: ['🐕', '🐶', '🦴', '🎾', '🐕', '🐶'],
  cat: ['🐱', '🐈', '😻', '😸', '😺', '😻'],
  flower: ['🌸', '🌹', '🌼', '💐', '🌻', '🌷'],
  cute: ['🥰', '😍', '💖', '🌟', '😘', '💞'],
  dish: ['🍝', '🍕', '🍰', '😋', '🍜', '🥡'],
  date: ['💕', '📅', '💌', '🌹', '💝', '💖'],
};

const THEME_TINTS = {
  mystery: 'rgba(235, 228, 255, 0.45)',
  dog: 'rgba(255, 225, 195, 0.55)',
  cat: 'rgba(225, 215, 245, 0.55)',
  flower: 'rgba(255, 215, 230, 0.55)',
  cute: 'rgba(255, 235, 195, 0.55)',
  dish: 'rgba(255, 220, 195, 0.55)',
  date: 'rgba(255, 200, 220, 0.55)',
  welcome: 'rgba(255, 225, 235, 0.4)',
};

const SIDEBAR_CARD_SLOTS = [
  { left: 4, top: 3 },
  { left: 86, top: 2 },
  { left: 2, top: 28 },
  { left: 90, top: 32 },
  { left: 3, top: 72 },
  { left: 88, top: 68 },
];

const WELCOME_CARD_SLOTS = [
  { left: -2, top: 4 },
  { left: 84, top: 2 },
  { left: -4, top: 58 },
  { left: 86, top: 55 },
];

const WELCOME_HERO_SLOTS = [
  { left: 2, top: 8 },
  { left: 80, top: 6 },
  { left: 4, top: 74 },
  { left: 82, top: 70 },
];

const BORDER_ANIMATIONS = ['border-wiggle', 'border-bounce', 'border-float'];

function twemojiUrl(code) {
  return `${TWEMOJI}/${code}.svg`;
}

function getPool(theme) {
  return THEME_ASSETS[theme] || THEME_ASSETS.mystery;
}

function getFallback(theme) {
  return THEME_FALLBACK[theme] || THEME_FALLBACK.mystery;
}

function createDecoImg(code, fallbackChar, animIndex) {
  const el = document.createElement('div');
  el.className = `frame-deco ${BORDER_ANIMATIONS[animIndex % BORDER_ANIMATIONS.length]}`;
  el.style.animationDelay = `${animIndex * 0.12}s`;

  const img = document.createElement('img');
  img.src = twemojiUrl(code);
  img.alt = '';
  img.draggable = false;
  img.loading = 'eager';
  img.onerror = () => {
    img.remove();
    el.textContent = fallbackChar;
    el.classList.add('frame-deco-emoji');
  };
  el.appendChild(img);

  return el;
}

function createLane(className) {
  const lane = document.createElement('div');
  lane.className = className;
  lane.setAttribute('aria-hidden', 'true');
  return lane;
}

function fillLane(lane, theme, count, startIndex = 0) {
  const codes = getPool(theme);
  const fallbacks = getFallback(theme);
  for (let i = 0; i < count; i++) {
    const idx = (startIndex + i) % codes.length;
    lane.appendChild(createDecoImg(codes[idx], fallbacks[idx], startIndex + i));
  }
}

export function wrapUploadZone(zone, theme) {
  const frame = document.createElement('div');
  frame.className = 'upload-frame';

  const topLane = createLane('frame-lane frame-lane-top');
  const midRow = document.createElement('div');
  midRow.className = 'frame-middle';
  const leftLane = createLane('frame-lane frame-lane-side frame-lane-left');
  const rightLane = createLane('frame-lane frame-lane-side frame-lane-right');
  const bottomLane = createLane('frame-lane frame-lane-bottom');

  fillLane(topLane, theme, 4, 0);
  fillLane(leftLane, theme, 2, 4);
  fillLane(rightLane, theme, 2, 6);
  fillLane(bottomLane, theme, 4, 2);

  midRow.append(leftLane, zone, rightLane);
  frame.append(topLane, midRow, bottomLane);

  return frame;
}

function createSidebarDeco(code, fallbackChar, slot, sizeRange, index) {
  const el = document.createElement('div');
  el.className = `theme-deco theme-deco-icon sidebar-float-deco ${BORDER_ANIMATIONS[index % BORDER_ANIMATIONS.length]}`;

  const img = document.createElement('img');
  img.src = twemojiUrl(code);
  img.alt = '';
  img.draggable = false;
  img.loading = 'lazy';
  img.onerror = () => {
    img.remove();
    el.textContent = fallbackChar;
    el.classList.add('sidebar-float-emoji');
  };
  el.appendChild(img);

  const size = sizeRange.min + Math.random() * (sizeRange.max - sizeRange.min);
  const rot = -20 + Math.random() * 40;
  el.style.left = `${slot.left}%`;
  el.style.top = `${slot.top}%`;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.setProperty('--deco-rot', `${rot}deg`);
  el.style.setProperty('--deco-duration', `${5 + Math.random() * 4}s`);
  el.style.setProperty('--deco-delay', `${index * 0.35}s`);
  el.style.opacity = 0.38 + Math.random() * 0.18;

  return el;
}

function decorateSidebarCard(theme) {
  fillContainer(
    document.getElementById('sidebar-card-decorations'),
    theme,
    6,
    SIDEBAR_CARD_SLOTS,
    { min: 34, max: 46 },
  );
}

function fillContainer(container, theme, count, slots, sizeRange) {
  if (!container) return;
  container.innerHTML = '';
  const codes = getPool(theme);
  const fallbacks = getFallback(theme);

  for (let i = 0; i < count; i++) {
    const idx = i % codes.length;
    container.appendChild(createSidebarDeco(codes[idx], fallbacks[idx], slots[i % slots.length], sizeRange, i));
  }
}

export function getDecorationTheme(puzzle) {
  if (!puzzle) return 'mystery';
  if (puzzle.id === 'question') return 'date';
  return puzzle.subject || 'mystery';
}

export function applyThemeTint(theme) {
  const card = document.querySelector('.puzzle-card');
  if (card) {
    card.style.setProperty('--theme-tint', THEME_TINTS[theme] || 'transparent');
    card.dataset.theme = theme;
  }
}

export function setPuzzleDecorations(puzzle) {
  const theme = getDecorationTheme(puzzle);
  applyThemeTint(theme);
  decorateSidebarCard(theme);
}

export function setMysteryDecorations() {
  applyThemeTint('mystery');
  decorateSidebarCard('mystery');
}

export function initWelcomeDecorations() {
  fillContainer(document.getElementById('welcome-decorations'), 'welcome', 4, WELCOME_CARD_SLOTS, { min: 64, max: 88 });
  fillContainer(document.getElementById('welcome-hero-decorations'), 'welcome', 4, WELCOME_HERO_SLOTS, { min: 80, max: 110 });
}
