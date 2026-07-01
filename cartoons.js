const TWEMOJI = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg';

const STICKERS = ['💕', '✨', '🌸', '⭐', '💖', '🦋', '🍓', '☁️'];

function emojiScene(code, decorations = '') {
  return `
    <svg viewBox="0 0 200 200" class="cartoon-svg" aria-hidden="true">
      <ellipse cx="100" cy="178" rx="48" ry="9" fill="#f8d0dc" opacity="0.5"/>
      ${decorations}
      <image href="${TWEMOJI}/${code}.svg" x="40" y="35" width="120" height="120"/>
    </svg>`;
}

function svgScene(content) {
  return `
    <svg viewBox="0 0 200 200" class="cartoon-svg" aria-hidden="true">
      <ellipse cx="100" cy="178" rx="48" ry="9" fill="#f8d0dc" opacity="0.35"/>
      ${content}
    </svg>`;
}

const THEMES = {
  welcome: svgScene(`
    <g class="cartoon-wiggle">
      <circle cx="78" cy="108" r="38" fill="#FFD93D" stroke="#3d2a35" stroke-width="3"/>
      <ellipse cx="78" cy="124" rx="24" ry="18" fill="#FFF5E0" stroke="#3d2a35" stroke-width="3"/>
      <circle cx="68" cy="102" r="5" fill="#3d2a35"/><circle cx="88" cy="102" r="5" fill="#3d2a35"/>
      <path d="M72 114 Q78 120 84 114" fill="none" stroke="#3d2a35" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="58" cy="108" rx="7" ry="4" fill="#FF9EB5" opacity="0.6"/>
      <ellipse cx="98" cy="108" rx="7" ry="4" fill="#FF9EB5" opacity="0.6"/>
    </g>
    <g class="cartoon-wiggle-delay">
      <circle cx="128" cy="104" r="36" fill="#FF9EB5" stroke="#3d2a35" stroke-width="3"/>
      <ellipse cx="128" cy="118" rx="22" ry="17" fill="#FFF0F5" stroke="#3d2a35" stroke-width="3"/>
      <circle cx="118" cy="98" r="5" fill="#3d2a35"/><circle cx="138" cy="98" r="5" fill="#3d2a35"/>
      <path d="M122 110 Q128 116 134 110" fill="none" stroke="#3d2a35" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="110" cy="104" rx="6" ry="4" fill="#FF6B9D" opacity="0.5"/>
      <ellipse cx="146" cy="104" rx="6" ry="4" fill="#FF6B9D" opacity="0.5"/>
    </g>
    <g class="cartoon-bounce">
      <path d="M100 52 C84 32 112 28 100 48 C88 28 116 32 100 52 Z" fill="#FF6B9D" stroke="#3d2a35" stroke-width="3"/>
    </g>
    <text x="38" y="52" font-size="20">✨</text>
    <text x="158" y="58" font-size="18">💕</text>
    <text x="30" y="165" font-size="18">🌸</text>
  `),

  mystery: svgScene(`
    <g class="cartoon-wiggle">
      <rect x="45" y="65" width="110" height="88" rx="14" fill="#FFD93D" stroke="#3d2a35" stroke-width="3"/>
      <path d="M45 80 L100 118 L155 80" fill="#F4B800" stroke="#3d2a35" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="100" cy="118" r="24" fill="white" stroke="#3d2a35" stroke-width="3"/>
      <text x="100" y="128" text-anchor="middle" font-size="32" font-weight="bold" fill="#3d2a35" font-family="sans-serif">?</text>
    </g>
    <text x="155" y="58" font-size="22" class="cartoon-bounce">🔒</text>
    <text x="28" y="72" font-size="20">✨</text>
  `),

  dog: emojiScene('1f415', `
    <text x="148" y="58" font-size="18" class="cartoon-bounce">🦴</text>
    <text x="38" y="62" font-size="14" font-weight="bold" fill="#3d2a35" font-family="Fredoka, sans-serif">woof!</text>
  `),

  cat: emojiScene('1f408', `
    <text x="155" y="55" font-size="16" class="cartoon-wiggle">🐾</text>
    <text x="32" y="58" font-size="14" font-weight="bold" fill="#3d2a35" font-family="Fredoka, sans-serif">meow~</text>
  `),

  flower: emojiScene('1f338', `
    <g class="cartoon-spin-slow" style="transform-origin: 100px 50px">
      <text x="42" y="48" font-size="16">🌸</text>
      <text x="148" y="44" font-size="16">🌷</text>
    </g>
  `),

  cute: emojiScene('1f970', `
    <g class="cartoon-bounce">
      <text x="28" y="55" font-size="22">✨</text>
      <text x="155" y="60" font-size="20">💖</text>
      <text x="160" y="145" font-size="18">⭐</text>
    </g>
  `),

  dish: emojiScene('1f35d', `
    <text x="148" y="55" font-size="20" class="cartoon-bounce">😋</text>
    <text x="30" y="58" font-size="16">🍴</text>
  `),

  date: svgScene(`
    <g class="cartoon-wiggle">
      <image href="${TWEMOJI}/1f495.svg" x="55" y="40" width="90" height="90"/>
      <rect x="118" y="95" width="52" height="48" rx="8" fill="white" stroke="#3d2a35" stroke-width="2.5"/>
      <rect x="118" y="95" width="52" height="14" rx="8" fill="#FF6B9D" stroke="#3d2a35" stroke-width="2.5"/>
      <text x="144" y="132" text-anchor="middle" font-size="13" font-weight="bold" fill="#3d2a35" font-family="sans-serif">SUN</text>
    </g>
    <text x="30" y="60" font-size="20" class="cartoon-bounce">💌</text>
    <text x="162" y="72" font-size="18">📅</text>
  `),
};

export function getCartoon(key) {
  return THEMES[key] || THEMES.welcome;
}

export function getCartoonKey(puzzle) {
  const map = { dog: 'dog', cat: 'cat', flower: 'flower', cute: 'cute', dish: 'dish' };
  if (puzzle.id === 'question') return 'date';
  return map[puzzle.subject] || 'welcome';
}

export function createStickerEl() {
  const sticker = document.createElement('div');
  sticker.className = 'sticker-float';
  sticker.textContent = STICKERS[Math.floor(Math.random() * STICKERS.length)];
  sticker.style.left = `${5 + Math.random() * 90}%`;
  sticker.style.top = `${5 + Math.random() * 90}%`;
  sticker.style.animationDelay = `${Math.random() * 5}s`;
  sticker.style.animationDuration = `${4 + Math.random() * 4}s`;
  const rot = -20 + Math.random() * 40;
  sticker.style.setProperty('--sticker-rot', `${rot}deg`);
  return sticker;
}

export function initStickers(container, count = 8) {
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    container.appendChild(createStickerEl());
  }
}
