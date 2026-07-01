// ═══════════════════════════════════════════════════════════════
//  CUSTOMIZE THIS — make it personal before you share the link
// ═══════════════════════════════════════════════════════════════
export const CONFIG = {
  herName: 'you',
  yourName: 'me',
  celebrationTitle: 'She said yes!',
  celebrationSubtitle: 'See you Sunday — I cannot wait!',
  // Set true to skip uploads — click "Go ahead" to pass each mission. Turn off before sharing!
  testMode: false,

  // Image recognition via dev_server.py + Gemini — see README
  imageRecognition: {
    enabled: true,
    apiUrl: '/api/verify-image',
    strict: true,
  },
};

// ═══════════════════════════════════════════════════════════════

import { startCelebration } from './celebration.js';
import { verifyImage } from './imageRecognition.js';
import { getCartoon, getCartoonKey, initStickers } from './cartoons.js';
import {
  setPuzzleDecorations,
  initWelcomeDecorations,
  wrapUploadZone,
  getDecorationTheme,
} from './decorations.js';

const screens = {
  welcome: document.getElementById('welcome-screen'),
  puzzle: document.getElementById('puzzle-screen'),
  celebration: document.getElementById('celebration-screen'),
};

const els = {
  puzzleNumber: document.getElementById('puzzle-number'),
  puzzleNumberBig: document.getElementById('puzzle-number-big'),
  sidebarCartoon: document.getElementById('sidebar-cartoon'),
  puzzleCartoon: document.getElementById('puzzle-cartoon'),
  stepDots: document.getElementById('step-dots'),
  puzzleTitle: document.getElementById('puzzle-title'),
  puzzleDescription: document.getElementById('puzzle-description'),
  puzzleContent: document.getElementById('puzzle-content'),
  puzzleFeedback: document.getElementById('puzzle-feedback'),
  puzzleSubmit: document.getElementById('puzzle-submit'),
  progressFill: document.getElementById('progress-fill'),
  revealArea: document.getElementById('puzzle-reveal-area'),
  chatSender: document.getElementById('chat-sender'),
  chatTitleBubble: document.querySelector('.chat-bubble-title'),
  chatBodyBubble: document.querySelector('.chat-bubble-body'),
};

const STEP_LABELS = ['Dog', 'Cat', 'Flower', 'Cute', 'Yum', 'The ask'];
const revealedPuzzles = new Set();
let isRevealing = false;

function chatName() {
  return CONFIG.yourName !== 'me' ? CONFIG.yourName : 'me';
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let typewriterSeq = 0;

function cancelTypewriter() {
  typewriterSeq += 1;
}

function charDelay(ch, base = 30) {
  if (ch === ' ' || ch === '\n') return base * 0.35;
  if ('.!?…'.includes(ch)) return base * 9;
  if (',;:—'.includes(ch)) return base * 3.5;
  return base;
}

function testSubmitLabel() {
  return CONFIG.testMode ? 'Go ahead →' : "let's look at this~ ✨";
}

function nextChallengeLabel() {
  return 'next challenge! →';
}

function showGoAheadButton(onClick) {
  els.puzzleSubmit.textContent = testSubmitLabel();
  els.puzzleSubmit.hidden = false;
  els.puzzleSubmit.disabled = false;
  els.puzzleSubmit.onclick = onClick;
}

function showNextChallengeButton(onClick) {
  els.puzzleSubmit.textContent = nextChallengeLabel();
  els.puzzleSubmit.hidden = false;
  els.puzzleSubmit.disabled = false;
  els.puzzleSubmit.onclick = onClick;
}

function goToCelebration() {
  document.querySelector('.celebration-title').textContent = CONFIG.celebrationTitle;
  document.querySelector('.celebration-subtitle').textContent = CONFIG.celebrationSubtitle;
  showScreen('celebration');
  startCelebration();
}

async function typeInto(textEl, text, seq) {
  if (!textEl) return;
  const chars = [...text];
  textEl.textContent = '';
  textEl.classList.add('is-typing');

  for (let i = 0; i < chars.length; i++) {
    if (seq !== typewriterSeq) {
      textEl.classList.remove('is-typing');
      return;
    }
    textEl.textContent = chars.slice(0, i + 1).join('');
    await delay(charDelay(chars[i]));
  }

  textEl.classList.remove('is-typing');
}

function resetChatBubbles(...elements) {
  elements.forEach((el) => {
    if (!el) return;
    el.classList.remove('chat-visible');
    el.classList.add('chat-pending');
    el.querySelectorAll('.is-typing').forEach((node) => node.classList.remove('is-typing'));
  });
}

async function revealTypedBubble(bubble, textEl, text, seq) {
  if (!bubble || !textEl) return;

  bubble.classList.remove('chat-pending');
  bubble.classList.add('chat-visible');
  textEl.textContent = '';

  await delay(180);
  if (seq !== typewriterSeq) return;

  await typeInto(textEl, text, seq);
  if (seq !== typewriterSeq) return;

  await delay(300);
}

const PHOTO_REACTION_FALLBACKS = {
  dog: 'okay wait that dog is literally the cutest thing ever, those big eyes are making my heart melt and i desperately want to pet them right now',
  cat: 'peak cat energy right here honestly, the whiskers the pose the attitude, this little floof is clearly running the whole house and winning',
  flower: 'those petals look so soft and pretty, the colors are gorgeous and this whole bouquet just gave my whole day a little sunshine boost',
  cute: 'literally the cutest thing i have seen all week, you are giving main character energy and my cheeks are doing that happy cringe thing',
  dish: 'okay now i am officially hungry, that looks delicious and i can almost smell it through the screen, feed me please',
};

const MIN_REACTION_WORDS = 5;

function sanitizeReaction(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  const junk = ['here is the json', "here's the json", 'json requested', 'as requested', '{"'];
  if (junk.some((phrase) => lower.includes(phrase))) return '';
  if (trimmed.split(/\s+/).length < MIN_REACTION_WORDS) return '';
  return trimmed;
}

async function showPhotoReaction(description, mountEl) {
  const clean = sanitizeReaction(description) || (description || '').trim();
  if (!clean || !mountEl) return;

  const row = document.createElement('div');
  row.className = 'photo-reaction-row';

  const avatar = document.createElement('div');
  avatar.className = 'chat-avatar photo-reaction-avatar';
  if (els.puzzleCartoon) {
    avatar.innerHTML = els.puzzleCartoon.innerHTML;
  }

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble chat-bubble-reaction chat-pending';
  const p = document.createElement('p');
  p.className = 'photo-reaction-text';
  bubble.appendChild(p);

  row.append(avatar, bubble);
  mountEl.appendChild(row);
  row.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const seq = typewriterSeq;
  await revealTypedBubble(bubble, p, clean, seq);
}

function setCartoon(el, key) {
  if (el) el.innerHTML = getCartoon(key);
}

let currentPuzzle = 0;
let puzzleState = {};
const uploadedPhotos = [];

const PUZZLES = [
  {
    id: 'photo',
    title: 'mission 1!! 🐕',
    description: 'ok hiiii — first thing. send me a pic of a dog? any dog works. yours, a friend\'s, a random good boy on the street lol',
    emoji: '🐕',
    subject: 'dog',
  },
  {
    id: 'photo',
    title: 'mission 2 🐈',
    description: 'you\'re doing great btw. now… cat pic? grumpy cats count. fluffy cats count. all cats count.',
    emoji: '🐈',
    subject: 'cat',
  },
  {
    id: 'photo',
    title: 'mission 3 🌸',
    description: 'okay flower time~ upload your favorite flower. bonus points if it\'s really pretty petals',
    emoji: '🌸',
    subject: 'flower',
  },
  {
    id: 'photo',
    title: 'mission 4 🥰',
    description: 'this one\'s easy. send something unbearably cute. pet, baby, snack — whatever makes you go awww',
    emoji: '🥰',
    subject: 'cute',
  },
  {
    id: 'photo',
    title: 'mission 5 🍽️',
    description: 'last photo mission!! what\'s your favorite dish? make me hungry pls',
    emoji: '🍽️',
    subject: 'dish',
  },
  {
    id: 'question',
    title: 'ok last one 💕',
    description: 'you actually did all of them… i\'m kinda nervous typing this ngl',
    question: 'would you like to go out with me on sunday? 👀',
    emoji: '♥',
  },
];

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function setFeedback(text, type = '') {
  els.puzzleFeedback.textContent = text;
  els.puzzleFeedback.className = `feedback ${type}`;
}

function updateProgress() {
  const pct = (currentPuzzle / PUZZLES.length) * 100;
  els.progressFill.style.width = `${pct}%`;
  els.puzzleNumber.textContent = currentPuzzle + 1;
  els.puzzleNumberBig.textContent = String(currentPuzzle + 1).padStart(2, '0');

  els.stepDots?.querySelectorAll('.step-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === currentPuzzle);
    dot.classList.toggle('done', i < currentPuzzle);
    dot.classList.toggle('revealed', revealedPuzzles.has(i));
  });

  updateStepDotLabels();
}

function updateStepDotLabels() {
  els.stepDots?.querySelectorAll('.step-dot').forEach((dot, i) => {
    const label = dot.querySelector('.step-dot-label');
    if (!label) return;
    if (revealedPuzzles.has(i)) {
      label.textContent = STEP_LABELS[i];
    } else {
      label.textContent = '???';
    }
  });
}

async function showPuzzle(puzzle, index) {
  isRevealing = true;
  cancelTypewriter();
  const seq = typewriterSeq;

  try {
    els.puzzleContent.innerHTML = '';
    els.puzzleFeedback.textContent = '';
    els.puzzleSubmit.hidden = true;

    setCartoon(els.sidebarCartoon, getCartoonKey(puzzle));
    setCartoon(els.puzzleCartoon, getCartoonKey(puzzle));

    if (els.chatSender) els.chatSender.textContent = chatName();
    els.puzzleTitle.textContent = '';
    els.puzzleDescription.textContent = '';

    resetChatBubbles(els.chatTitleBubble, els.chatBodyBubble);
    els.puzzleContent.querySelectorAll('.photo-reaction-row').forEach((el) => el.remove());
    await delay(120);
    if (seq !== typewriterSeq) return;

    await revealTypedBubble(els.chatTitleBubble, els.puzzleTitle, puzzle.title, seq);
    if (seq !== typewriterSeq) return;
    await revealTypedBubble(els.chatBodyBubble, els.puzzleDescription, puzzle.description, seq);
    if (seq !== typewriterSeq) return;

    revealedPuzzles.add(index);
    updateStepDotLabels();
    setPuzzleDecorations(puzzle);

    if (puzzle.id === 'photo') {
      renderPhotoUpload(puzzle);
    } else {
      await renderQuestion(puzzle);
    }
  } finally {
    isRevealing = false;
  }
}

function puzzleComplete() {
  if (isRevealing) return;
  els.puzzleSubmit.hidden = true;
  setFeedback('', '');

  currentPuzzle++;
  if (currentPuzzle < PUZZLES.length) {
    loadPuzzle(currentPuzzle);
  }
}

function loadPuzzle(index) {
  const puzzle = PUZZLES[index];
  puzzleState = {};
  updateProgress();

  els.puzzleSubmit.textContent = testSubmitLabel();
  els.puzzleSubmit.onclick = null;

  showPuzzle(puzzle, index);
}

function renderPhotoUpload(puzzle) {
  const photoWrap = document.createElement('div');
  photoWrap.className = 'photo-upload';

  const zone = document.createElement('label');
  zone.className = 'upload-zone';
  zone.innerHTML = `
    <div class="upload-zone-inner">
      <div class="upload-cartoon-doodle">📸</div>
      <span class="upload-text">Tap to snap a photo!</span>
      <span class="upload-hint">or drag & drop here~</span>
    </div>
  `;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.hidden = true;

  const preview = document.createElement('div');
  preview.className = 'photo-preview';
  preview.hidden = true;
  preview.innerHTML = `
    <div class="polaroid-frame">
      <div class="polaroid-tape polaroid-tape-left" aria-hidden="true"></div>
      <div class="polaroid-tape polaroid-tape-right" aria-hidden="true"></div>
      <div class="polaroid-sticker" aria-hidden="true">✨</div>
      <div class="polaroid-photo">
        <img alt="" />
        <div class="polaroid-shimmer" aria-hidden="true"></div>
      </div>
      <p class="polaroid-caption">Perfect shot!</p>
    </div>
    <div class="preview-actions">
      <span class="preview-badge">Photo captured 💕</span>
      <button type="button" class="btn-change-photo">↩ Pick a different one</button>
    </div>
  `;

  const previewImg = preview.querySelector('img');
  const polaroidFrame = preview.querySelector('.polaroid-frame');
  const changeBtn = preview.querySelector('.btn-change-photo');

  zone.appendChild(input);
  const frame = wrapUploadZone(zone, getDecorationTheme(puzzle));
  photoWrap.append(frame, preview);
  els.puzzleContent.appendChild(photoWrap);

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setFeedback('Please pick an image file (JPG or PNG works best).', 'error');
      return;
    }

    if (puzzleState.objectUrl) {
      URL.revokeObjectURL(puzzleState.objectUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    puzzleState.file = file;
    puzzleState.objectUrl = objectUrl;

    previewImg.onload = () => {
      polaroidFrame.classList.add('polaroid-loaded');
      setFeedback('');
    };
    previewImg.onerror = () => {
      setFeedback('Hmm, that file didn\'t load — try a JPG or PNG!', 'error');
      polaroidFrame.classList.remove('polaroid-loaded');
    };
    previewImg.src = objectUrl;

    zone.hidden = true;
    preview.hidden = false;
    preview.classList.add('preview-visible');
  }

  input.addEventListener('change', () => {
    if (input.files[0]) handleFile(input.files[0]);
  });

  changeBtn.addEventListener('click', () => {
    input.value = '';
    zone.hidden = false;
    preview.hidden = true;
    preview.classList.remove('preview-visible');
    polaroidFrame.classList.remove('polaroid-loaded');
    previewImg.removeAttribute('src');
    puzzleState.file = null;
    if (puzzleState.objectUrl) {
      URL.revokeObjectURL(puzzleState.objectUrl);
      puzzleState.objectUrl = null;
    }
  });

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  showGoAheadButton(async () => {
    if (!puzzleState.file && !CONFIG.testMode) {
      setFeedback('Oops — pick a photo first!', 'error');
      return;
    }

    let reactionText = PHOTO_REACTION_FALLBACKS[puzzle.subject] || 'okay i love this one so much, you picked something really sweet and it totally made me smile';

    if (puzzleState.file && !CONFIG.testMode) {
      const prevLabel = els.puzzleSubmit.textContent;
      els.puzzleSubmit.disabled = true;
      els.puzzleSubmit.textContent = 'peeking at your pic…';
      setFeedback('one sec, let me look~', '');

      const result = await verifyImage(
        puzzleState.file,
        puzzle.subject,
        CONFIG.imageRecognition,
      );

      els.puzzleSubmit.disabled = false;
      els.puzzleSubmit.textContent = prevLabel;

      if (!result.ok) {
        setFeedback(result.message || "That doesn't look quite right — try another?", 'error');
        return;
      }

      const fromGemini = sanitizeReaction(result.description);
      if (fromGemini) reactionText = fromGemini;
    }

    if (puzzleState.file) {
      uploadedPhotos.push({
        subject: puzzle.subject,
        file: puzzleState.file,
        url: puzzleState.objectUrl,
      });
    }

    els.puzzleSubmit.hidden = true;
    setFeedback('', '');

    await showPhotoReaction(reactionText, photoWrap);

    setFeedback('ready for the next one? tap below~', 'success');
    showNextChallengeButton(() => {
      puzzleComplete();
    });
    els.puzzleSubmit.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

async function renderQuestion(puzzle) {
  els.progressFill.style.width = '100%';

  const wrap = document.createElement('div');
  wrap.className = 'question-puzzle';

  const question = document.createElement('div');
  question.className = 'chat-bubble chat-bubble-question chat-pending';

  const buttons = document.createElement('div');
  buttons.className = 'question-buttons question-buttons-hidden';

  const yesBtn = document.createElement('button');
  yesBtn.type = 'button';
  yesBtn.className = 'btn btn-yes btn-playful';
  yesBtn.textContent = 'Yes!! 🎉';

  const noBtn = document.createElement('button');
  noBtn.type = 'button';
  noBtn.className = 'btn btn-no';
  noBtn.textContent = 'Hmm… no';

  yesBtn.addEventListener('click', () => goToCelebration());

  noBtn.addEventListener('mouseenter', () => moveNoButton(noBtn, buttons));
  noBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    moveNoButton(noBtn, buttons);
  }, { passive: false });
  noBtn.addEventListener('click', (e) => {
    e.preventDefault();
    moveNoButton(noBtn, buttons);
  });

  buttons.append(yesBtn, noBtn);
  wrap.append(question, buttons);
  els.puzzleContent.appendChild(wrap);

  const seq = typewriterSeq;
  await revealTypedBubble(question, question, puzzle.question, seq);
  if (seq !== typewriterSeq) return;

  if (CONFIG.testMode) {
    showGoAheadButton(() => goToCelebration());
    return;
  }

  buttons.classList.remove('question-buttons-hidden');
  buttons.classList.add('question-buttons-visible');
}

function moveNoButton(noBtn, container) {
  const maxX = Math.max(container.clientWidth - noBtn.offsetWidth, 0);
  const maxY = Math.max(container.clientHeight - noBtn.offsetHeight, 0);
  const x = maxX > 0 ? Math.random() * maxX : 0;
  const y = maxY > 0 ? Math.random() * maxY : 0;
  noBtn.style.position = 'absolute';
  noBtn.style.left = `${x}px`;
  noBtn.style.top = `${y}px`;
}

function initFloatingHearts() {
  const container = document.getElementById('hearts-container');
  if (!container) return;

  for (let i = 0; i < 18; i++) {
    const heart = document.createElement('span');
    heart.className = 'floating-heart';
    heart.textContent = ['💕', '💖', '💗', '♥', '✨'][Math.floor(Math.random() * 5)];
    heart.style.left = `${Math.random() * 100}%`;
    heart.style.fontSize = `${0.8 + Math.random() * 1.4}rem`;
    heart.style.animationDuration = `${12 + Math.random() * 18}s`;
    heart.style.animationDelay = `${Math.random() * 15}s`;
    container.appendChild(heart);
  }
}

function initStepDots() {
  if (!els.stepDots) return;

  els.stepDots.innerHTML = '';

  PUZZLES.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'step-dot';
    dot.innerHTML = `<span class="step-dot-marker"></span><span class="step-dot-label">???</span>`;
    els.stepDots.appendChild(dot);
  });
}

function initWelcomeCartoons() {
  setCartoon(document.getElementById('welcome-cartoon'), 'welcome');
  setCartoon(document.getElementById('welcome-chat-avatar'), 'welcome');
}

async function initWelcomeChat() {
  const sender = document.getElementById('welcome-sender');
  const afterChat = document.getElementById('welcome-after-chat');
  const bubbles = document.querySelectorAll('#welcome-messages .chat-bubble');
  const titleEl = bubbles[0]?.querySelector('h1');
  const subtitleEl = document.getElementById('welcome-subtitle');
  const hintEl = bubbles[2]?.querySelector('p');

  const messages = [
    { bubble: bubbles[0], el: titleEl, text: titleEl?.textContent || '' },
    { bubble: bubbles[1], el: subtitleEl, text: subtitleEl?.textContent || '' },
    { bubble: bubbles[2], el: hintEl, text: hintEl?.textContent || '' },
  ];

  if (sender) sender.textContent = chatName();
  cancelTypewriter();
  const seq = typewriterSeq;
  resetChatBubbles(...bubbles);

  await delay(300);
  for (const { bubble, el, text } of messages) {
    if (seq !== typewriterSeq) return;
    await revealTypedBubble(bubble, el, text, seq);
  }

  if (seq !== typewriterSeq) return;
  if (afterChat) {
    afterChat.classList.remove('welcome-after-chat-hidden');
    afterChat.classList.add('welcome-after-chat-visible');
  }
}

const welcomeSubtitle = document.getElementById('welcome-subtitle');
if (CONFIG.herName !== 'you' || CONFIG.yourName !== 'me') {
  welcomeSubtitle.textContent = `${CONFIG.yourName} made this just for ${CONFIG.herName}~`;
}

initFloatingHearts();
initStepDots();
initStickers(document.getElementById('stickers-bg'), 8);
initWelcomeCartoons();
initWelcomeDecorations();
initWelcomeChat();

document.getElementById('start-btn').addEventListener('click', () => {
  showScreen('puzzle');
  loadPuzzle(0);
});
