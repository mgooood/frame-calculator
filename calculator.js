/* ════════════════════════════════════════════════
   Frame Calculator — calculator.js
   ════════════════════════════════════════════════ */

'use strict';

/* ─── Constants ──────────────────────────────── */
const GLAZING_CLEARANCE = 1 / 16;  // inches per side — applies to both glass and acrylic
const WASTE_FACTOR    = 1.25;    // 25 % waste for miter cut losses

/* ─── Tooltip content ────────────────────────── */
const TIPS = {
  faceWidth: {
    title: 'Face Width',
    body: [
      'The width of the moulding as seen from the front of the finished frame — measured from the outer edge to the inner edge.',
      'A 2¾" face width means the frame border is 2¾" wide all the way around the opening.',
      'Tip: this is the full width of your raw lumber board (before routing the rabbet).',
    ].join('\n\n'),
    visual: (fw, sT, rD, rO) => makeMouldingSVG(fw || 2.75, sT || 0.75, rD || 0.5, rO || 0.25, 0.125, 0, 0.125, 'faceWidth'),  // glazingThick default
  },
  stockThickness: {
    title: 'Stock Thickness',
    body: [
      'The depth of your raw lumber board from front to back.',
      'Common sizes: 3/4" (actual 0.75") for standard frames, 1" or thicker for chunkier profiles.',
      'After routing the rabbet, the remaining front portion becomes the visible face of your frame.',
    ].join('\n\n'),
    visual: (fw, sT, rD, rO) => makeMouldingSVG(fw || 2.75, sT || 0.75, rD || 0.5, rO || 0.25, 0.125, 0, 0.125, 'stockThickness'),
  },
  rabbetDepth: {
    title: 'Rabbet Depth',
    body: [
      'How deep the L-shaped groove is routed into the inner back corner of the moulding. This creates the ledge where your glazing, artwork, and backing board rest.',
      'Important: the rabbet depth must be at least as deep as your total materials stack (glazing + artwork package + backing). The calculator checks this for you.',
      'Common range: 1/2" – 3/4". Start deeper if you\'re unsure; you can always shim, but can\'t add wood back.',
    ].join('\n\n'),
    visual: (fw, sT, rD, rO) => makeMouldingSVG(fw || 2.75, sT || 0.75, rD || 0.5, rO || 0.25, 0.125, 0, 0.125, 'rabbetDepth'),
  },
  rabbetOverlap: {
    title: 'Rabbet Overlap (the Lip)',
    body: [
      'The width of the lip that remains after routing the rabbet. This lip overlaps the edge of the glazing from the front, holding everything inside the frame.',
      'Standard is 1/4" (0.25"). Going narrower risks the glazing falling through; going wider reduces the visible frame opening slightly.',
      'The frame opening = artwork size + (2 × rabbet overlap), so a 0.25" overlap adds 0.5" to each dimension.',
    ].join('\n\n'),
    visual: (fw, sT, rD, rO) => makeMouldingSVG(fw || 2.75, sT || 0.75, rD || 0.5, rO || 0.25, 0.125, 0, 0.125, 'rabbetOverlap'),
  },
  artPackageThick: {
    title: 'Art Package Thickness',
    body: [
      'The total front-to-back thickness of your mounted artwork — measured with a ruler or calipers. Include every layer:',
      '  • The mat board (if any, and if already mounted)',
      '  • The artwork itself (paper, photo, print)',
      '  • The mounting board it is attached to',
      'Tip: measure the whole assembled stack at once rather than adding up layers individually — it accounts for adhesive, tissue, and other materials.',
    ].join('\n\n'),
    visual: null,
  },
};

/* ─── Fraction table (nearest 1/16") ─────────── */
const FRACS = [
  [0,      '' ],
  [1/16,  '1/16'], [2/16, '1/8'],   [3/16, '3/16'],
  [4/16,  '1/4'],  [5/16, '5/16'],  [6/16, '3/8'],  [7/16, '7/16'],
  [8/16,  '1/2'],  [9/16, '9/16'],  [10/16,'5/8'],   [11/16,'11/16'],
  [12/16, '3/4'],  [13/16,'13/16'], [14/16,'7/8'],   [15/16,'15/16'],
];

function toFraction(val) {
  if (val == null || isNaN(val)) return '—';
  const whole = Math.floor(Math.abs(val));
  const frac  = Math.abs(val) - whole;
  let best = FRACS[0], minDiff = Math.abs(frac);
  for (const [v, s] of FRACS) {
    const d = Math.abs(frac - v);
    if (d < minDiff) { minDiff = d; best = [v, s]; }
  }
  // Round up if closest to 1
  if (Math.abs(frac - 1) < minDiff) {
    return whole + 1 === 0 ? '0"' : `${whole + 1}"`;
  }
  if (whole === 0) return best[1] ? `${best[1]}"` : '0"';
  return best[1] ? `${whole} ${best[1]}"` : `${whole}"`;
}

function toDec(val) {
  if (val == null || isNaN(val)) return '—';
  return parseFloat(val.toFixed(4)).toString() + '"';
}


/* ─── Read form ──────────────────────────────── */
function gv(id) {
  const v = parseFloat(document.getElementById(id)?.value ?? '');
  return isNaN(v) ? null : v;
}

function readInputs() {
  return {
    artW:            gv('artWidth'),
    artH:            gv('artHeight'),
    faceWidth:       gv('faceWidth'),
    stockThick:      gv('stockThickness'),
    rabbetDepth:     gv('rabbetDepth'),
    rabbetOverlap:   gv('rabbetOverlap')    ?? 0.25,
    acrylicThick:    gv('glazingThick')      ?? 0.125,
    artPackageThick: gv('artPackageThick')  ?? 0,
    backingThick:    gv('backingThick')     ?? 0.125,
  };
}


/* ─── Validation ─────────────────────────────── */
function validate(inp) {
  const errs = [];
  if (!inp.artW    || inp.artW <= 0)      errs.push({ id: 'artWidth',       msg: 'Enter artwork width.' });
  if (!inp.artH    || inp.artH <= 0)      errs.push({ id: 'artHeight',      msg: 'Enter artwork height.' });
  if (!inp.faceWidth || inp.faceWidth <= 0)   errs.push({ id: 'faceWidth',  msg: 'Enter face width.' });
  if (!inp.stockThick || inp.stockThick <= 0) errs.push({ id: 'stockThickness', msg: 'Enter stock thickness.' });
  if (!inp.rabbetDepth || inp.rabbetDepth <= 0) errs.push({ id: 'rabbetDepth', msg: 'Enter rabbet depth.' });
  if (inp.rabbetDepth >= inp.stockThick)
    errs.push({ id: 'rabbetDepth', msg: 'Rabbet depth must be less than stock thickness.' });
  if (inp.rabbetOverlap >= inp.faceWidth)
    errs.push({ id: 'rabbetOverlap', msg: 'Rabbet overlap must be less than face width.' });
  return errs;
}

function showErrors(errs) {
  // Clear all
  document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
  document.querySelectorAll('.input-wrap').forEach(el => el.classList.remove('has-error'));
  // Set new
  errs.forEach(({ id, msg }) => {
    const errEl = document.getElementById(`${id}-err`);
    if (errEl) errEl.textContent = msg;
    const input = document.getElementById(id);
    if (input) input.closest('.input-wrap')?.classList.add('has-error');
  });
}


/* ─── Core Calculations ──────────────────────── */
function calculate(inp) {
  const { artW, artH, faceWidth, stockThick, rabbetDepth, rabbetOverlap,
          acrylicThick, artPackageThick, backingThick } = inp;

  // Frame opening: visible hole — artwork size + 2 × lip on each axis
  const frameOpenW = artW + 2 * rabbetOverlap;
  const frameOpenH = artH + 2 * rabbetOverlap;

  // Glazing: cut 1/16" smaller per side than the frame opening (thermal clearance)
  const glazingW = frameOpenW - 2 * GLAZING_CLEARANCE;
  const glazingH = frameOpenH - 2 * GLAZING_CLEARANCE;

  // Outer frame (long-point to long-point for 45° miter)
  const outerW = frameOpenW + 2 * faceWidth;
  const outerH = frameOpenH + 2 * faceWidth;

  // Cut list
  const cutList = [
    { label: 'Top & Bottom', detail: '2 pieces, 45° miter both ends', qty: 2, length: outerW },
    { label: 'Left & Right', detail: '2 pieces, 45° miter both ends', qty: 2, length: outerH },
  ];

  // Materials
  const totalCutIn  = 2 * outerW + 2 * outerH;
  const withWasteIn = totalCutIn * WASTE_FACTOR;
  const linearFt    = withWasteIn / 12;
  // board feet = (thickness × width × total_length_in) / 144
  const boardFt = (stockThick * faceWidth * withWasteIn) / 144;

  // Stack check
  const totalStack = acrylicThick + artPackageThick + backingThick;
  const stackFits  = rabbetDepth >= totalStack;
  const stackGap   = rabbetDepth - totalStack;

  return {
    frameOpenW, frameOpenH,
    glazingW,   glazingH,
    outerW,     outerH,
    cutList,
    totalCutIn, linearFt, boardFt,
    totalStack, stackFits, stackGap,
    glazingThick: acrylicThick, artPackageThick, backingThick,
    rabbetOverlap, rabbetDepth,
  };
}


/* ─── SVG preview (moulding cross-section) ───── */
// glazingThick / artThick / backingThick: real inches from the form.
// When provided, layers are drawn proportionally to RD and reflect actual inputs.
// highlight: optional string for tooltip highlight mode.
function makeMouldingSVG(fw, sT, rD, rO,
                         glazingThick = 0.125, artThick = 0, backingThick = 0.125,
                         highlight = null) {
  const PAD   = { t: 36, r: 130, b: 52, l: 70 };
  const MAX_W = 240, MAX_H = 150;
  const scale = Math.min(MAX_W / fw, MAX_H / sT) * 0.85;
  const W  = fw * scale;
  const H  = sT * scale;
  const RD = Math.min(rD * scale, H * 0.95);
  const RO = Math.min(rO * scale, W * 0.4);

  const OX = PAD.l, OY = PAD.t;
  const Lx = OX + W - RO;
  const Ly = OY + H - RD;

  // ── Material layer heights ──────────────────────────────────────────────
  const totalStack = glazingThick + artThick + backingThick;
  const hasLayers  = totalStack > 0 && rD > 0;
  const overflow   = hasLayers && totalStack > rD;

  let glazingPx, artPx, backingPx;
  if (hasLayers) {
    // Proportional to RD so layer heights reflect actual input values
    glazingPx = (glazingThick / rD) * RD;
    artPx     = (artThick     / rD) * RD;
    backingPx = (backingThick / rD) * RD;
  } else {
    // Fallback placeholder when no material thicknesses entered yet
    const MIN = Math.max(4, Math.round(RD / 5));
    glazingPx = MIN;
    artPx     = MIN + 2;
    backingPx = MIN;
  }

  // Dynamic viewBox — tight around content, no wasted space
  const VW = Math.round(PAD.l + W + PAD.r);
  const VH = Math.round(PAD.t + H + PAD.b);

  const path = [
    `M ${OX} ${OY}`, `L ${OX+W} ${OY}`, `L ${OX+W} ${Ly}`,
    `L ${Lx} ${Ly}`, `L ${Lx} ${OY+H}`, `L ${OX} ${OY+H}`, `Z`,
  ].join(' ');

  // ── Highlight fills (tooltip mode) ─────────────────────────────────────
  const hl = {
    faceWidth:      'rgba(200,149,42,.25)',
    stockThickness: 'rgba(92,53,32,.15)',
    rabbetDepth:    'rgba(184,48,48,.20)',
    rabbetOverlap:  'rgba(93,122,74,.25)',
  };
  let hlRect = '';
  if (highlight === 'faceWidth') {
    hlRect = `<rect x="${OX}" y="${OY}" width="${W}" height="${H}" fill="${hl.faceWidth}" rx="1"/>`;
  } else if (highlight === 'stockThickness') {
    hlRect = `<rect x="${OX - 14}" y="${OY}" width="4" height="${H}" fill="none" stroke="#7C4A2D" stroke-width="2"/>`;
  }
  const rabbetHl = (highlight === 'rabbetDepth' || highlight === 'rabbetOverlap')
    ? `<rect x="${Lx}" y="${Ly}" width="${RO}" height="${RD}" fill="${highlight === 'rabbetDepth' ? hl.rabbetDepth : hl.rabbetOverlap}" rx="1"/>`
    : '';

  // Layer colors always normal — overflow state is shown via the HTML status chip, not the SVG
  const lAcrylic  = '#A8D8EA', lAcrylicS = '#78B8CC';
  const lArt      = '#E8D5B7', lArtS     = '#C4A882';
  const lBacking  = '#C8B8A8', lBackingS = '#A89888';

  const lc = '#7C4A2D';
  const rc = '#A04040';
  const fs = '10';
  const ff = 'Inter, sans-serif';

  // ── Dimension helpers ───────────────────────────────────────────────────
  const hDim = (x1, x2, y, lbl, color, below = false) => {
    const mx = (x1 + x2) / 2, ty = below ? y + 13 : y - 6;
    return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}" stroke-width="1"/>
            <line x1="${x1}" y1="${y-4}" x2="${x1}" y2="${y+4}" stroke="${color}" stroke-width="1"/>
            <line x1="${x2}" y1="${y-4}" x2="${x2}" y2="${y+4}" stroke="${color}" stroke-width="1"/>
            <text x="${mx}" y="${ty}" text-anchor="middle" font-size="${fs}" fill="${color}" font-family="${ff}" font-weight="600">${lbl}</text>`;
  };
  const vDimRight = (x, y1, y2, lbl, color) => {
    const my = (y1 + y2) / 2;
    return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${color}" stroke-width="1"/>
            <line x1="${x-4}" y1="${y1}" x2="${x+4}" y2="${y1}" stroke="${color}" stroke-width="1"/>
            <line x1="${x-4}" y1="${y2}" x2="${x+4}" y2="${y2}" stroke="${color}" stroke-width="1"/>
            <text x="${x+8}" y="${my}" dominant-baseline="middle" font-size="${fs}" fill="${color}" font-family="${ff}" font-weight="600">${lbl}</text>`;
  };
  const vDimLeft = (bx, y1, y2, lbl, color) => {
    const my = (y1 + y2) / 2, tx = bx - 14;
    return `<line x1="${bx}" y1="${y1}" x2="${bx}" y2="${y2}" stroke="${color}" stroke-width="1"/>
            <line x1="${bx-4}" y1="${y1}" x2="${bx+4}" y2="${y1}" stroke="${color}" stroke-width="1"/>
            <line x1="${bx-4}" y1="${y2}" x2="${bx+4}" y2="${y2}" stroke="${color}" stroke-width="1"/>
            <text x="${tx}" y="${my}" text-anchor="middle" dominant-baseline="middle"
                  font-size="${fs}" fill="${color}" font-family="${ff}" font-weight="600"
                  transform="rotate(-90,${tx},${my})">${lbl}</text>`;
  };

  return `<svg viewBox="0 0 ${VW} ${VH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="g" x="0" y="0" width="8" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(6)">
        <path d="M0 2 Q4 0 8 2" stroke="rgba(139,94,60,.18)" stroke-width=".5" fill="none"/>
      </pattern>
      <linearGradient id="wg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#D8A878"/><stop offset="100%" stop-color="#C08050"/>
      </linearGradient>
    </defs>

    <path d="${path}" fill="url(#wg)" stroke="#8B5E3C" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="${path}" fill="url(#g)"/>
    ${hlRect}
    ${rabbetHl}

    <!-- Material layers — proportional to actual input thicknesses -->
    <rect x="${Lx}" y="${Ly}"                     width="${RO}" height="${glazingPx}" fill="${lAcrylic}" stroke="${lAcrylicS}" stroke-width=".75"/>
    <rect x="${Lx}" y="${Ly + glazingPx}"         width="${RO}" height="${artPx}"    fill="${lArt}"     stroke="${lArtS}"     stroke-width=".75"/>
    <rect x="${Lx}" y="${Ly + glazingPx + artPx}" width="${RO}" height="${backingPx}" fill="${lBacking}" stroke="${lBackingS}" stroke-width=".75"/>

    <!-- Dimension labels -->
    ${hDim(OX, OX+W, OY - 18, `Face: ${toFraction(fw)}`, lc)}
    ${vDimLeft(OX - 28, OY, OY+H, toFraction(sT), lc)}
    ${vDimRight(OX + W + 22, Ly, OY+H, `Depth: ${toFraction(rD)}`, rc)}
    ${hDim(Lx, OX+W, OY+H + 22, `Lip: ${toFraction(rO)}`, rc, true)}
  </svg>`;
}

function renderPreview(inp) {
  const panel = document.getElementById('previewDiagram');
  if (!panel) return;

  const fw = inp.faceWidth    || 0;
  const sT = inp.stockThick   || 0;
  const rD = inp.rabbetDepth  || 0;
  const rO = inp.rabbetOverlap ?? 0.25;

  if (!fw || !sT) {
    panel.innerHTML = `<div class="preview-empty">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
        <path d="M8 8 L40 8 L40 32 L32 32 L32 48 L8 48 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none" opacity="0.3"/>
      </svg>
      <p>Enter your wood dimensions<br>above to see the moulding<br>cross-section here.</p>
    </div>`;
    return;
  }

  const glazingThick    = inp.glazingThick    ?? 0.125;
  const artPackageThick = inp.artPackageThick ?? 0;
  const backingThick    = inp.backingThick    ?? 0.125;
  const effectiveRD     = rD || 0.5;

  panel.innerHTML = makeMouldingSVG(
    fw, sT, effectiveRD, rO,
    glazingThick, artPackageThick, backingThick
  );

  // ── Stack status chip ──────────────────────────────────────────────────
  const chip = document.getElementById('stackStatus');
  if (chip) {
    const totalStack = glazingThick + artPackageThick + backingThick;
    const hasStack   = totalStack > 0;
    chip.hidden = !hasStack;
    if (hasStack) {
      const over = totalStack > effectiveRD;
      const diff = Math.abs(totalStack - effectiveRD);
      chip.className = `stack-status ${over ? 'stack-error' : 'stack-ok'}`;
      chip.textContent = over
        ? `⚠ Materials stack (${toFraction(totalStack)}) exceeds rabbet depth by ${toFraction(diff)} — increase rabbet depth or reduce materials`
        : `✓ Stack fits — ${toFraction(diff)} of rabbet depth remaining`;
    }
  }
}


/* ─── Results rendering ──────────────────────── */
function icon(path, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" aria-hidden="true">${path}</svg>`;
}

const ICONS = {
  frameOpen: icon(`<rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.5"/><rect x="6" y="6" width="8" height="8" stroke="currentColor" stroke-width="1.5"/>`),
  acrylic:   icon(`<rect x="2" y="5" width="16" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><line x1="5.5" y1="5" x2="5.5" y2="15" stroke="currentColor" stroke-width="1" opacity=".5"/><line x1="14.5" y1="5" x2="14.5" y2="15" stroke="currentColor" stroke-width="1" opacity=".5"/>`),
  outer:     icon(`<rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2"/>`),
  cutList:   icon(`<path d="M2 6H18M2 10H18M2 14H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`),
  rabbet:    icon(`<path d="M3 3H11V11H17V17H3V3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`),
  stack:     icon(`<rect x="2" y="5.5" width="16" height="3" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="2" y="10" width="16" height="3" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="2" y="14.5" width="16" height="3" rx="1" stroke="currentColor" stroke-width="1.5"/>`),
  materials: icon(`<path d="M2 17L10 3L18 17H2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`),
  check:     `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  x:         `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
};

function card(iconHtml, title, sub, body, extra = '') {
  return `<div class="result-card ${extra}">
    <div class="card-header">
      <div class="card-icon">${iconHtml}</div>
      <div>
        <div class="card-title">${title}</div>
        ${sub ? `<div class="card-sub">${sub}</div>` : ''}
      </div>
    </div>
    ${body}
  </div>`;
}

function dimWH(w, h) {
  return `<div class="dim-block">
    <div class="dim-item">
      <span class="dim-label">Width</span>
      <span class="dim-frac">${toFraction(w)}</span>
      <span class="dim-dec">${toDec(w)}</span>
    </div>
    <span class="dim-times" aria-hidden="true">×</span>
    <div class="dim-item">
      <span class="dim-label">Height</span>
      <span class="dim-frac">${toFraction(h)}</span>
      <span class="dim-dec">${toDec(h)}</span>
    </div>
  </div>`;
}

function dimPair(w, labelW, h, labelH) {
  return `<div class="dim-pair">
    <div class="dim-item">
      <span class="dim-label">${labelW}</span>
      <span class="dim-frac">${toFraction(w)}</span>
      <span class="dim-dec">${toDec(w)}</span>
    </div>
    <span class="dim-times" aria-hidden="true">×</span>
    <div class="dim-item">
      <span class="dim-label">${labelH}</span>
      <span class="dim-frac">${toFraction(h)}</span>
      <span class="dim-dec">${toDec(h)}</span>
    </div>
  </div>`;
}

function renderResults(result) {
  const {
    frameOpenW, frameOpenH, glazingW, glazingH, outerW, outerH,
    cutList, totalCutIn, linearFt, boardFt,
    totalStack, stackFits, stackGap,
    glazingThick, artPackageThick, backingThick,
    rabbetOverlap, rabbetDepth,
  } = result;

  /* Card 1 — Frame Opening */
  const c1 = card(ICONS.frameOpen, 'Frame Opening', 'The visible hole in the front of your frame',
    dimWH(frameOpenW, frameOpenH));

  /* Card 2 — Glazing Cut Size */
  const c2 = card(ICONS.acrylic, 'Glazing Cut Size', '1/16" clearance per side — allows for thermal movement',
    dimWH(glazingW, glazingH));

  /* Card 3 — Outer Frame Size */
  const c3 = card(ICONS.outer, 'Outer Frame Size', 'Long-point to long-point across the finished frame',
    dimWH(outerW, outerH));

  /* Card 4 — Cut List */
  const cutItems = cutList.map(item => `
    <div class="cut-item">
      <div class="cut-qty" aria-label="${item.qty} pieces">×${item.qty}</div>
      <div class="cut-info">
        <strong>${item.label}</strong>
        <span>${item.detail}</span>
      </div>
      <div class="cut-dim">
        <span class="cut-dim-frac">${toFraction(item.length)}</span>
        <span class="cut-dim-dec">${toDec(item.length)}</span>
      </div>
    </div>`).join('');

  const c4 = card(ICONS.cutList, 'Cut List', '4 pieces total — all 45° miter cuts', `
    <div class="cut-list">
      ${cutItems}
      <p class="cut-note">Dimensions are long-point to long-point (outside of the miter). Make sure your saw is set to exactly 45° — check with a square before cutting all four pieces.</p>
    </div>`, 'full-width');

  /* Card 5 — Rabbet to Route */
  const c5 = card(ICONS.rabbet, 'Rabbet to Route', 'Route on the inner-back corner of every moulding piece',
    dimPair(rabbetOverlap, 'Width (lip)', rabbetDepth, 'Depth'));

  /* Card 6 — Stack Check */
  const stackRows = [
    { label: 'Glazing', val: glazingThick, color: 'var(--clr-glazing)' },
    artPackageThick > 0
      ? { label: 'Art Package (mat + art + mount)', val: artPackageThick, color: 'var(--clr-art)' }
      : null,
    { label: 'Backing Board', val: backingThick, color: 'var(--clr-backing)' },
  ].filter(Boolean);

  const stackLayersHtml = stackRows.map(r => `
    <div class="stack-row">
      <div class="stack-swatch" style="background:${r.color}"></div>
      <span class="stack-name">${r.label}</span>
      <span class="stack-val">${toFraction(r.val)}</span>
    </div>`).join('');

  const verdict = stackFits
    ? `<div class="stack-verdict pass">${ICONS.check} Your rabbet (${toFraction(rabbetDepth)}) fits the stack with <strong>${toFraction(stackGap)}</strong> to spare. Good to go.</div>`
    : `<div class="stack-verdict fail">${ICONS.x} Stack is <strong>${toFraction(Math.abs(stackGap))}</strong> too thick for your rabbet. Increase rabbet depth to at least <strong>${toFraction(totalStack)}</strong>.</div>`;

  const c6 = card(ICONS.stack, 'Rabbet Stack Check', 'Verify your materials fit inside the rabbet', `
    <div>
      <div class="stack-layers">
        ${stackLayersHtml}
        <div class="stack-total-row">
          <span>Total stack</span>
          <span style="font-family:var(--font-mono);font-weight:var(--fw-bold)">${toFraction(totalStack)}</span>
        </div>
      </div>
      ${verdict}
    </div>`);

  /* Card 7 — Materials Estimate */
  const netFt = (totalCutIn / 12).toFixed(2);
  const c7 = card(ICONS.materials, 'Materials Estimate', 'Includes 25% waste for miter cut losses', `
    <div class="materials-rows">
      <div class="materials-row">
        <span class="mat-label">Net cut length (no waste)</span>
        <span class="mat-val">${netFt} lin ft</span>
      </div>
      <div class="materials-row">
        <span class="mat-label">Buy at least (with 25% waste)</span>
        <span class="mat-val">${linearFt.toFixed(2)} lin ft</span>
      </div>
      <div class="materials-row">
        <span class="mat-label">Board feet required</span>
        <span class="mat-val">${boardFt.toFixed(2)} bd ft</span>
      </div>
    </div>
    <p class="mat-note">Board feet = (thickness × face width × length) ÷ 144. Buy a bit extra for setup cuts and test pieces.</p>`);

  document.getElementById('resultsContent').innerHTML = c1 + c2 + c3 + c4 + c5 + c6 + c7;
}


/* ─── Tooltip system ─────────────────────────── */
function openTooltip(key, inp) {
  const tip = TIPS[key];
  if (!tip) return;

  document.getElementById('tipTitle').textContent = tip.title;
  document.getElementById('tipBody').textContent  = tip.body;

  const visual = document.getElementById('tipVisual');
  if (tip.visual) {
    visual.innerHTML = tip.visual(inp.faceWidth, inp.stockThick, inp.rabbetDepth, inp.rabbetOverlap);
    visual.removeAttribute('hidden');
  } else {
    visual.innerHTML = '';
    visual.setAttribute('hidden', '');
  }

  const modal   = document.getElementById('tooltipModal');
  const overlay = document.getElementById('tooltipOverlay');
  modal.removeAttribute('hidden');
  overlay.removeAttribute('hidden');
  document.getElementById('tipClose').focus();
  document.body.style.overflow = 'hidden';
}

function closeTooltip() {
  document.getElementById('tooltipModal').setAttribute('hidden', '');
  document.getElementById('tooltipOverlay').setAttribute('hidden', '');
  document.body.style.overflow = '';
  // Return focus to the button that opened it
  if (lastFocusedHelpBtn) { lastFocusedHelpBtn.focus(); lastFocusedHelpBtn = null; }
}

let lastFocusedHelpBtn = null;


/* ─── Event wiring ───────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const form     = document.getElementById('calcForm');
  const results  = document.getElementById('results');

  /* Live preview — update on any input change */
  form.addEventListener('input', () => {
    renderPreview(readInputs());
  });

  /* Form submit */
  form.addEventListener('submit', e => {
    e.preventDefault();
    const inp  = readInputs();
    const errs = validate(inp);
    showErrors(errs);
    if (errs.length) {
      // Focus first bad field
      document.getElementById(errs[0].id)?.focus();
      return;
    }
    showErrors([]); // clear
    const result = calculate(inp);
    renderResults(result);
    results.removeAttribute('hidden');
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* Reset — hide results, clear preview */
  form.addEventListener('reset', () => {
    setTimeout(() => {
      showErrors([]);
      results.setAttribute('hidden', '');
      renderPreview({});
    }, 0);
  });

  /* Help buttons */
  document.querySelectorAll('.help-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      lastFocusedHelpBtn = btn;
      openTooltip(btn.dataset.tip, readInputs());
    });
  });

  /* Tooltip close button */
  document.getElementById('tipClose')?.addEventListener('click', closeTooltip);

  /* Close tooltip on backdrop click */
  document.getElementById('tooltipOverlay')?.addEventListener('click', closeTooltip);

  /* Close tooltip on Escape */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('tooltipModal');
      if (!modal.hidden) closeTooltip();
    }
  });

  /* Trap focus inside tooltip */
  document.getElementById('tooltipModal')?.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const modal      = document.getElementById('tooltipModal');
    const focusable  = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first      = focusable[0];
    const last       = focusable[focusable.length - 1];
    if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    }
  });

  /* Initial preview render with defaults already in the form */
  renderPreview(readInputs());
});
