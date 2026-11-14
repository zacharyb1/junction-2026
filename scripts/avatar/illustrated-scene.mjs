/** Original, deterministic vector acting rig for the no-service avatar proof of concept. */
export const illustratedProfiles = {
  ari: {
    label: 'Ari · home office', wall: '#eee9df', recess: '#dce4dc', sky: '#d9e9e6',
    skin: '#e4b695', skinLight: '#f1c6a5', skinShade: '#c58b6b', hair: '#40332e',
    shirt: '#446d69', shirtLight: '#668b83', shirtShade: '#345651', chair: '#bccbc2',
    wood: '#be9873', woodDark: '#9b795b', accent: '#bf8968', glasses: true,
  },
  noor: {
    label: 'Noor · studio', wall: '#e5e1dc', recess: '#ddd8db', sky: '#e8ded5',
    skin: '#b87958', skinLight: '#ce9470', skinShade: '#925c46', hair: '#292c31',
    shirt: '#b36854', shirtLight: '#cd8b72', shirtShade: '#955442', chair: '#b8c1ca',
    wood: '#b1947d', woodDark: '#8c7363', accent: '#788c9a', glasses: false,
  },
};

const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const pulse = (t, start, end) => t <= start || t >= end ? 0 : Math.sin(Math.PI * (t - start) / (end - start)) ** 2;
const fmt = value => Number(value.toFixed(3));
const mix = (a, b, t) => a + (b - a) * t;

/** Each clip meets exactly the same front/desk pose at its endpoints. */
export function renderIllustration(profile, clip, progress) {
  const p = illustratedProfiles[profile];
  if (!p) throw new Error(`Unknown illustrated profile: ${profile}`);
  const t = clamp(progress);
  const loop = !['to-desk', 'to-front'].includes(clip);
  const turn = clip === 'to-desk' ? ease(t) : clip === 'to-front' ? 1 - ease(t) : clip.startsWith('working') ? 1 : 0;
  const envelope = loop ? Math.sin(Math.PI * t) ** 2 : 0;
  const breath = -2.1 * Math.sin(2 * Math.PI * t) * envelope;
  const nod = clip === 'listening' ? pulse(t, .14, .72) : 0;
  const think = clip === 'thinking' ? pulse(t, .12, .87) : 0;
  const gesture = clip === 'speaking' ? pulse(t, .12, .77) : 0;
  const typing = clip === 'working-a' ? envelope : 0;
  const trackpad = clip === 'working-b' ? envelope : 0;
  const blink = pulse(t, .28, .36) + pulse(t, .81, .87) * (clip === 'listening' ? 1 : 0);
  const mouth = clip === 'speaking' ? envelope * (.4 + .6 * Math.sin(t * Math.PI * 11) ** 2) : 0;
  const look = turn * 5 + think * -4;
  const headX = 335 + turn * 20;
  const headY = 165 + breath + nod * 5 + turn * 7;
  const headTilt = nod * 3.2 + think * -5.5 + turn * 7;
  const wristL = { x: mix(304, 454, turn) - gesture * 21 + think * 22, y: 357 - gesture * 63 - think * 112 - typing * (2 + Math.sin(t * 43) * 2) };
  const wristR = { x: mix(390, 510, turn) - trackpad * 15, y: 356 - typing * (2 + Math.sin(t * 43 + 2) * 2) - trackpad * 3 };
  const shoulderL = { x: 279 + turn * 20, y: 277 + breath };
  const shoulderR = { x: 392 - turn * 5, y: 277 + breath };
  const elbowL = { x: 259 + turn * 85, y: 327 - gesture * 9 - think * 16 };
  const elbowR = { x: 415 + turn * 24, y: 329 };
  const arm = (shoulder, elbow, wrist) => `<path d="M${fmt(shoulder.x)} ${fmt(shoulder.y)} Q${fmt(elbow.x)} ${fmt(elbow.y - 13)} ${fmt(elbow.x)} ${fmt(elbow.y)}" fill="none" stroke="${p.shirtShade}" stroke-width="35" stroke-linecap="round"/><path d="M${fmt(shoulder.x - 3)} ${fmt(shoulder.y)} Q${fmt(elbow.x - 4)} ${fmt(elbow.y - 13)} ${fmt(elbow.x - 1)} ${fmt(elbow.y)}" fill="none" stroke="url(#shirt)" stroke-width="29" stroke-linecap="round"/><path d="M${fmt(elbow.x)} ${fmt(elbow.y)} Q${fmt((elbow.x + wrist.x) / 2)} ${fmt(wrist.y + 4)} ${fmt(wrist.x)} ${fmt(wrist.y)}" fill="none" stroke="${p.skin}" stroke-width="18" stroke-linecap="round"/><path d="M${fmt(elbow.x)} ${fmt(elbow.y - 3)} Q${fmt((elbow.x + wrist.x) / 2)} ${fmt(wrist.y)} ${fmt(wrist.x)} ${fmt(wrist.y - 2)}" fill="none" stroke="${p.skinLight}" stroke-width="9" stroke-linecap="round"/>`;
  const hand = (wrist, tilt = 0) => `<g transform="translate(${fmt(wrist.x)} ${fmt(wrist.y)}) rotate(${fmt(tilt)})"><path d="M-11 -6 C-4 -11 5 -10 13 -6 L23 -1 Q27 3 22 6 L4 7 Q-7 8 -13 2Z" fill="${p.skinLight}"/><path d="M3 6L18 6M9 2L23 3M12 -2L23 0" stroke="${p.skinShade}" stroke-opacity=".5" fill="none" stroke-linecap="round" stroke-width="1.2"/><path d="M-7 -5 Q-4 -14 2 -12 L10 -7" fill="${p.skin}"/></g>`;
  const eye = (x, opacity = 1) => `<g transform="translate(${x} 2) scale(1 ${fmt(1 - blink * .93)})" opacity="${opacity}"><path d="M-10 0Q0 -7 10 0Q0 6 -10 0" fill="#f7f0e6"/><ellipse cx="${fmt(look)}" cy="-.2" rx="3.7" ry="4" fill="#454439"/><circle cx="${fmt(look)}" cy="-.3" r="1.9" fill="#252a29"/><circle cx="${fmt(look - 1)}" cy="-1.6" r="1.1" fill="#fff"/><path d="M-10 0Q0 -7 10 0" fill="none" stroke="${p.hair}" stroke-width="1.5" stroke-linecap="round"/></g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="wall" x2="0" y2="1"><stop stop-color="${p.wall}"/><stop offset="1" stop-color="${p.recess}"/></linearGradient>
    <linearGradient id="skin" x1="0" x2="1" y2=".3"><stop stop-color="${p.skinLight}"/><stop offset=".65" stop-color="${p.skin}"/><stop offset="1" stop-color="${p.skinShade}"/></linearGradient>
    <linearGradient id="shirt" x1="0" x2="1" y2=".5"><stop stop-color="${p.shirtLight}"/><stop offset=".55" stop-color="${p.shirt}"/><stop offset="1" stop-color="${p.shirtShade}"/></linearGradient>
    <linearGradient id="screen" x2=".8" y2="1"><stop stop-color="#77858a"/><stop offset="1" stop-color="#4f5e65"/></linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#wall)"/>
  <path d="M0 332H800" stroke="#c9c7bd" stroke-width="2"/>
  <rect x="42" y="37" width="173" height="231" rx="3" fill="#d1d3c7"/>
  <rect x="49" y="44" width="159" height="217" fill="${p.sky}"/>
  <path d="M50 222Q87 125 122 193Q160 105 208 172V261H50Z" fill="#abbfaf" opacity=".52"/>
  <path d="M50 240Q98 196 139 229Q179 177 208 205V261H50Z" fill="#a0b6a3" opacity=".5"/>
  <path d="M126 44V261M49 152H208" stroke="#f7f2e6" stroke-width="8"/>
  <rect x="37" y="263" width="184" height="10" rx="2" fill="#f7f2e6"/>
  <path d="M208 44L265 262H208Z" fill="#fff9dc" opacity=".16"/>
  <rect x="573" y="64" width="158" height="105" rx="2" fill="#c3b7a5"/>
  <rect x="580" y="71" width="144" height="91" fill="#f0e9dc"/>
  <path d="M589 149Q635 76 678 122L714 149Z" fill="${p.accent}" opacity=".8"/>
  <circle cx="682" cy="96" r="14" fill="#d7bc89"/>
  <path d="M572 215H745" stroke="${p.woodDark}" stroke-width="9"/>
  <rect x="589" y="180" width="13" height="31" rx="1" fill="#8a9d93"/><rect x="605" y="169" width="17" height="42" rx="1" fill="#ba9079"/><rect x="626" y="178" width="11" height="33" rx="1" fill="#c8bb9e"/><rect x="641" y="172" width="14" height="39" rx="1" fill="#7e929c"/>
  <path d="M705 208V171M705 183Q678 185 682 162Q706 159 705 183M706 180Q729 174 722 155Q700 157 706 180" stroke="#7c957b" stroke-width="3" fill="#9cae8b"/><path d="M692 195H718L715 211H695Z" fill="#c7b29d"/>
  <rect x="258" y="230" width="155" height="144" rx="43" fill="${p.chair}"/><path d="M267 300V272Q267 240 294 240H382" fill="none" stroke="#fff" stroke-opacity=".23" stroke-width="3"/>
  <ellipse cx="344" cy="376" rx="115" ry="15" fill="#5d5e54" opacity=".13"/>
  ${profile === 'noor' ? `<path d="M282 154Q271 98 311 83Q361 58 389 104Q409 141 395 244L365 268H291Q275 212 282 154Z" fill="${p.hair}"/>` : ''}
  <g transform="translate(${fmt(turn * 7)} ${fmt(breath)})">
    <path d="M277 265Q286 244 314 243L359 242Q387 245 399 269L417 372H254Z" fill="url(#shirt)"/>
    <path d="M308 241L317 218H354L365 243Q339 272 308 241Z" fill="${p.skin}"/>
    <path d="M319 217L354 218V233Q337 245 315 232Z" fill="${p.skinShade}" opacity=".65"/>
    <path d="M307 243Q337 264 367 242" fill="none" stroke="${p.shirtShade}" stroke-width="7"/>
    <path d="M307 240Q337 261 367 239" fill="none" stroke="${p.shirtLight}" stroke-width="4"/>
    <path d="M289 284L277 363M384 282L395 363" stroke="${p.shirtShade}" stroke-width="2" opacity=".45"/>
    <path d="M312 297Q323 332 314 366M361 318L370 366" stroke="${p.shirtLight}" stroke-width="2" opacity=".18"/>
  </g>
  <g transform="translate(${fmt(headX)} ${fmt(headY)}) rotate(${fmt(headTilt)}) scale(${fmt(1 - turn * .1)} 1)">
    <ellipse cx="-45" cy="7" rx="10" ry="17" fill="${p.skin}"/>
    <ellipse cx="45" cy="7" rx="9" ry="16" fill="${p.skinShade}" opacity="${fmt(1 - turn * .75)}"/>
    <path d="M-7 -67Q37 -67 46 -27L44 19Q39 53 8 65Q-27 61 -41 30L-47 -14Q-47 -57 -7 -67Z" fill="url(#skin)"/>
    <path d="M-43 10Q-38 2 -35 9L-36 20" fill="none" stroke="${p.skinShade}" stroke-width="2"/>
    ${profile === 'ari' ? `<path d="M-46 -3Q-59 -41 -33 -67Q-7 -86 27 -69Q52 -59 50 -20L40 -7L36 -38Q12 -34 -11 -51Q-24 -28 -40 -25L-39 5Z" fill="${p.hair}"/><path d="M-31 -55Q-4 -70 25 -55" stroke="#695044" stroke-width="5" stroke-linecap="round" fill="none" opacity=".65"/>` : `<path d="M-48 4Q-60 -28 -35 -66Q-13 -88 23 -74Q57 -63 50 -16L41 22Q31 3 36 -38Q3 -29 -14 -57Q-38 -42 -36 -2L-38 31Z" fill="${p.hair}"/><path d="M-31 -53Q-43 -22 -40 -1M17 -63Q43 -56 43 -30" fill="none" stroke="#46474c" stroke-width="4" stroke-linecap="round"/>`}
    <g transform="translate(${fmt(turn * 14)} ${fmt(nod * 1.5)})">
      <path d="M-31 -13Q-22 -18 -12 -14M11 -15Q22 -18 31 -11" stroke="${p.hair}" stroke-width="3" stroke-linecap="round" fill="none"/>
      ${eye(-22, fmt(1 - turn * .3))}${eye(23)}
      ${p.glasses ? `<g fill="none" stroke="#645345" stroke-width="2.5"><rect x="-37" y="-9" width="31" height="22" rx="8"/><rect x="7" y="-9" width="31" height="22" rx="8"/><path d="M-6 -1Q0 -5 7 -1M-38 -2L-46 -8M38 -2L45 -9"/></g>` : ''}
      <path d="M2 2L${fmt(6 + turn * 6)} 22Q0 27 -5 22" stroke="${p.skinShade}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M-14 38Q1 ${fmt(45 + mouth * 4)} 17 36" stroke="#8d5447" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="2" cy="39" rx="${fmt(9 + mouth * 2)}" ry="${fmt(mouth * 5)}" fill="#713f36"/>
      <path d="M-10 50Q1 53 12 49" stroke="${p.skinShade}" stroke-width="1.5" fill="none" opacity=".45"/>
    </g>
    ${profile === 'noor' ? `<circle cx="-43" cy="29" r="4" fill="#d8bb76"/><circle cx="-43" cy="29" r="2.6" fill="${p.skinShade}"/>` : ''}
  </g>
  <path d="M0 351Q394 336 800 350V450H0Z" fill="${p.wood}"/>
  <path d="M0 396H800V450H0Z" fill="${p.woodDark}"/>
  <path d="M0 397H800" stroke="#e3c6a2" stroke-opacity=".5" stroke-width="3"/>
  <path d="M20 372Q150 363 212 369M583 384Q670 378 780 382" fill="none" stroke="${p.woodDark}" stroke-opacity=".3" stroke-width="2"/>
  <ellipse cx="103" cy="365" rx="28" ry="6" fill="#876e58" opacity=".2"/>
  <path d="M81 323H119V355Q101 367 83 354Z" fill="#eee6d7"/><path d="M119 329Q138 328 132 343Q129 349 119 347" stroke="#eee6d7" stroke-width="7" fill="none"/><ellipse cx="100" cy="323" rx="19" ry="5" fill="#d6c7b6"/>
  <path d="M164 355L221 350L243 369L183 374Z" fill="#e5dfcf"/><path d="M180 358L215 355M186 363L222 360" stroke="#b4bbaf" stroke-width="1.5"/>
  ${arm(shoulderL, elbowL, wristL)}${arm(shoulderR, elbowR, wristR)}
  <path d="M423 362L560 348L610 374L462 388Z" fill="#9fa9ac"/><path d="M446 363L551 355L582 371L469 381Z" fill="#66777d"/><path d="M460 363L565 372M475 360L582 369M469 360L486 379M489 359L507 377M510 357L529 376M531 356L550 374" stroke="#abb6b9" stroke-width="1.3" opacity=".75"/>
  ${hand(wristL, -gesture * 24 - think * 55)}${hand(wristR, trackpad * -7)}
  <path d="M509 257L635 269Q641 269 640 276L620 369L488 355Z" fill="#a6b0b2"/>
  <path d="M511 260L634 272L615 364L492 352Z" fill="url(#screen)"/>
  <path d="M513 263L631 274L628 286L510 275Z" fill="#a5b3b6" opacity=".13"/>
  <ellipse cx="562" cy="312" rx="10" ry="12" transform="rotate(10 562 312)" fill="#b6c0c0" opacity=".7"/>
  <path d="M487 355L620 369L610 374L479 360Z" fill="#c4cccb"/>
  </svg>`;
}
