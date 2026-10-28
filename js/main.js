// Mark that JS is running: only then does the CSS hide anything for animation.
// If this script fails to load, nothing is ever hidden and the page reads normally.
document.documentElement.classList.add('anim-ready');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 1. Mobile menu: open and close the nav
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('site-nav');

toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});

nav.addEventListener('click', (e) => {
  if (e.target.closest('a')) {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
  }
});

// 1b. Header: give it a dark backdrop once you've scrolled past the hero,
// so the logo and nav don't sit directly on top of the body text underneath.
const header = document.querySelector('.site-header');
const setHeaderState = () => {
  header.classList.toggle('scrolled', window.scrollY > 40);
};
window.addEventListener('scroll', setHeaderState, { passive: true });
setHeaderState();

// 2. Hero: start the photo settling and the copy fading in as soon as we can.
// Two frames, so the browser paints the zoomed-in starting state first and has
// something to animate from.
const hero = document.querySelector('.hero');
requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('settled')));

// 3. Section titles: stagger the words so they rise one after another
document.querySelectorAll('.rise').forEach((title) => {
  title.querySelectorAll('.w > span').forEach((word, i) => {
    word.style.transitionDelay = (i * 0.07) + 's';
  });
});

// 4. Stats: build each number out of digit strips. A strip holds 0-9 twice, so
// sliding to 10 + the digit gives it a full turn before it lands, like an
// odometer. Non-digits ($, ~, ., M) stay put.
document.querySelectorAll('[data-roll]').forEach((figure) => {
  const text = figure.dataset.roll;
  figure.textContent = '';

  // The strips hold every digit 0-9, so a screen reader would read out the lot.
  // Keep the real figure as hidden text and hide the moving part from assistive tech.
  const spoken = document.createElement('span');
  spoken.className = 'sr-only';
  spoken.textContent = text;
  figure.appendChild(spoken);

  const row = document.createElement('span');
  row.className = 'roll-row';
  row.setAttribute('aria-hidden', 'true');
  figure.appendChild(row);

  [...text].forEach((char, i) => {
    if (!/[0-9]/.test(char)) {
      row.insertAdjacentHTML('beforeend', '<span>' + char + '</span>');
      return;
    }
    const column = document.createElement('span');
    column.className = 'roll';
    let digits = '';
    for (let n = 0; n <= 19; n++) digits += '<i>' + (n % 10) + '</i>';
    column.innerHTML = '<span class="strip">' + digits + '</span>';
    column.querySelector('.strip').style.transitionDelay = (i * 0.1) + 's';
    column.dataset.target = char;
    row.appendChild(column);
  });
});

function roll(figure) {
  figure.querySelectorAll('.roll').forEach((column) => {
    const strip = column.querySelector('.strip');
    // One full turn (10) plus the digit itself, measured in --step from the CSS
    strip.style.transform = 'translateY(calc(var(--step) * -' + (10 + Number(column.dataset.target)) + '))';
  });
}

// 5. Trigger the titles and the numbers as they come into view. Uses scroll
// position rather than IntersectionObserver, which proved unreliable in preview.
const titles = Array.from(document.querySelectorAll('.rise'));
const figures = Array.from(document.querySelectorAll('[data-roll]'));

if (reduceMotion) {
  titles.forEach((el) => el.classList.add('visible'));
  figures.forEach(roll);
} else {
  const inView = (el, fraction) => {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return r.top < vh * fraction && r.bottom > 0;
  };

  const update = () => {
    titles.forEach((el) => {
      if (!el.classList.contains('visible') && inView(el, 0.9)) el.classList.add('visible');
    });
    figures.forEach((el) => {
      if (!el.rolled && inView(el, 0.9)) { el.rolled = true; roll(el); }
    });
    if (titles.every((el) => el.classList.contains('visible')) && figures.every((el) => el.rolled)) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    }
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', update);
  update(); // catch anything already on screen
}

// 6. Contact form: check the fields and show a friendly message.
// This page is front-end only, so the form does not send anything yet.
const form = document.getElementById('contact-form');
const status = form.querySelector('.form-status');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = form.elements.name;
  const email = form.elements.email;
  let valid = true;

  [name, email].forEach((field) => field.classList.remove('invalid'));
  status.classList.remove('error');

  if (!name.value.trim()) { name.classList.add('invalid'); valid = false; }
  if (!email.validity.valid || !email.value.trim()) { email.classList.add('invalid'); valid = false; }

  if (!valid) {
    status.textContent = 'Please enter your name and a valid email address.';
    status.classList.add('error');
    return;
  }

  status.textContent = 'Thank you, ' + name.value.trim() + '. Marci will be in touch soon.';
  form.reset();
});
