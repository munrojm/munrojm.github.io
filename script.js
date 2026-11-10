const root = document.documentElement;
const themeToggle = document.querySelector('.theme-toggle');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

function isDark() {
  return root.dataset.theme ? root.dataset.theme === 'dark' : systemTheme.matches;
}

function updateThemeButton() {
  const dark = isDark();
  themeToggle.dataset.dark = String(dark);
  themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  document.querySelector('meta[name="theme-color"]').content = dark ? '#1c201d' : '#faf9f6';
}

themeToggle.hidden = false;
themeToggle.addEventListener('click', () => {
  const theme = isDark() ? 'light' : 'dark';
  root.dataset.theme = theme;
  try { localStorage.setItem('munro-theme', theme); } catch {}
  updateThemeButton();
});
systemTheme.addEventListener('change', updateThemeButton);
updateThemeButton();
document.querySelector('#year').textContent = new Date().getFullYear();

const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)');
let active = null;
let closeTimer;

function positionNote() {
  if (!active) return;
  const { trigger, note } = active;
  const bounds = trigger.getBoundingClientRect();
  const padding = 16;
  const gap = 10;
  const width = note.offsetWidth;
  const height = note.offsetHeight;
  const viewportHeight = window.innerHeight;
  const left = Math.max(padding, Math.min(bounds.left, window.innerWidth - width - padding));
  const fitsBelow = bounds.bottom + gap + height <= viewportHeight - padding;
  const top = fitsBelow ? bounds.bottom + gap : Math.max(padding, bounds.top - height - gap);
  note.style.left = `${left}px`;
  note.style.top = `${top}px`;
}

function closeNote({ restoreFocus = false } = {}) {
  clearTimeout(closeTimer);
  if (!active) return;
  const { trigger, note } = active;
  const focusWasInside = note.contains(document.activeElement);
  note.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  active = null;
  if (restoreFocus || focusWasInside) trigger.focus({ preventScroll: true });
}

function openNote(trigger, note, pinned = false) {
  clearTimeout(closeTimer);
  if (active?.trigger === trigger) {
    active.pinned ||= pinned;
    return;
  }
  closeNote();
  note.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  active = { trigger, note, pinned };
  positionNote();
}

function scheduleClose() {
  if (active?.pinned) return;
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    if (active?.note.contains(document.activeElement)) return;
    closeNote();
  }, 180);
}

document.querySelectorAll('[data-note]').forEach((link) => {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = link.className;
  trigger.innerHTML = link.innerHTML;
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  const note = document.getElementById(link.dataset.note);
  trigger.setAttribute('aria-controls', note.id);
  link.replaceWith(trigger);

  trigger.addEventListener('pointerenter', () => {
    if (hoverCapable.matches) openNote(trigger, note);
  });
  trigger.addEventListener('pointerleave', scheduleClose);
  trigger.addEventListener('click', () => {
    if (active?.trigger === trigger && active.pinned) closeNote();
    else openNote(trigger, note, true);
  });
  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openNote(trigger, note, true);
      note.querySelector('a').focus();
    }
  });
  note.addEventListener('pointerenter', () => clearTimeout(closeTimer));
  note.addEventListener('pointerleave', scheduleClose);
  note.querySelector('.note-close').addEventListener('click', () => closeNote({ restoreFocus: true }));
  const wrap = trigger.closest('.annotation-wrap');
  wrap.addEventListener('focusout', (event) => {
    if (!wrap.contains(event.relatedTarget) && active?.trigger === trigger) closeNote();
  });
});

document.addEventListener('pointerdown', (event) => {
  if (active && !active.note.contains(event.target) && !active.trigger.contains(event.target)) closeNote();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && active) {
    event.preventDefault();
    closeNote({ restoreFocus: true });
  }
});
window.addEventListener('resize', positionNote);
window.addEventListener('scroll', () => {
  if (!active) return;
  const bounds = active.trigger.getBoundingClientRect();
  if (bounds.bottom < 0 || bounds.top > window.innerHeight) closeNote();
  else positionNote();
}, { passive: true });
