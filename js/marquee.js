// Wavy marquee (Home): two ribbons that follow a sine wave, with the words
// running along the wave (SVG <textPath>).
// - Each ribbon is drawn twice with the same wave: a thick ink stroke (the outline)
//   and a slightly thinner coloured stroke on top (the fill).
// - The wave is rebuilt in real pixels on resize, so the text never gets squashed.
// - Words are repeated until they cover the whole ribbon; moving startOffset by
//   exactly one copy of the words makes the loop seamless.
// - A ribbon with data-icons="a.svg|b.svg" carries icons instead of words: each icon
//   sits in a little white bubble and is placed on the wave every frame.
// - Scrolling speeds the ribbons up (scrolling up reverses them), like before.
// - Reduced motion: the ribbons stay wavy but nothing moves.

// Wrapped in { } so this file's variables don't clash with the other scripts.
{
  const svg = document.querySelector('.wave-marquee');

  if (svg) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SVG_NS = 'http://www.w3.org/2000/svg';

    const rows = [...svg.querySelectorAll('.wave')].map((g) => ({
      g,
      paths: g.querySelectorAll('path'),
      text: g.querySelector('text'),
      textPath: g.querySelector('textPath'),
      words: g.dataset.words ? g.dataset.words.split('|') : [],
      icons: g.dataset.icons ? g.dataset.icons.split('|') : null,
      iconNodes: [],
      speed: parseFloat(g.dataset.speed) || 0.5,
      offset: 0,
      copyLength: 0,
    }));

    let width = 0;
    let amp = 0;        // wave height (px), from --wave-amp in css/home.css
    let wavelength = 0; // length of one wave (px), from --wave-length
    let phase = 0;      // shifts the wave sideways so the ribbon flows

    const cssNumber = (name) => parseFloat(getComputedStyle(svg).getPropertyValue(name)) || 0;

    // Centre line of a ribbon: y = centerY + amp * sin(...), sampled every 8px.
    // It starts one wavelength left of the screen and ends one wavelength right of it,
    // so the ends of the ribbon are never visible.
    const wavePath = (centerY) => {
      let d = '';
      for (let x = -wavelength; x <= width + wavelength; x += 8) {
        const y = centerY + amp * Math.sin((x / wavelength) * Math.PI * 2 + phase);
        d += `${d ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return d;
    };

    // Fill a <textPath> with the words, each followed by a small ✦.
    const fillWords = (row, copies) => {
      row.textPath.textContent = '';
      for (let i = 0; i < copies; i++) {
        row.words.forEach((word) => {
          row.textPath.append(`${word}   `);
          const star = document.createElementNS(SVG_NS, 'tspan');
          star.setAttribute('class', 'wave__star');
          star.textContent = '✦';
          row.textPath.append(star, '   ');
        });
      }
    };

    // Build the icon bubbles for an icon ribbon: enough copies to cover the whole path.
    const buildIcons = (row, pathLength) => {
      const size = parseFloat(getComputedStyle(row.g).getPropertyValue('--icon-size')) || 34;
      const gap = parseFloat(getComputedStyle(row.g).getPropertyValue('--icon-gap')) || 96;
      row.iconNodes.forEach((n) => n.remove());
      row.iconNodes = [];
      row.gap = gap;
      row.copyLength = row.icons.length * gap;          // one full set of icons
      const count = Math.ceil(pathLength / gap) + row.icons.length;
      for (let i = 0; i < count; i++) {
        const node = document.createElementNS(SVG_NS, 'g');
        node.setAttribute('class', 'wave__icon');
        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('r', size / 2);
        const img = document.createElementNS(SVG_NS, 'image');
        const inner = size * 0.62;
        img.setAttribute('href', row.icons[i % row.icons.length]);
        img.setAttribute('x', -inner / 2);
        img.setAttribute('y', -inner / 2);
        img.setAttribute('width', inner);
        img.setAttribute('height', inner);
        node.append(circle, img);
        row.g.append(node);
        row.iconNodes.push(node);
      }
    };

    // Put every icon on the wave at its distance along the path.
    const placeIcons = (row) => {
      const path = row.paths[0];
      const total = path.getTotalLength();
      row.iconNodes.forEach((node, i) => {
        const s = i * row.gap - row.offset;
        if (s < 0 || s > total) { node.setAttribute('visibility', 'hidden'); return; }
        const p = path.getPointAtLength(s);
        node.setAttribute('visibility', 'visible');
        node.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      });
    };

    const layout = () => {
      width = svg.clientWidth || window.innerWidth;
      amp = cssNumber('--wave-amp');
      wavelength = cssNumber('--wave-length');
      const gap = cssNumber('--wave-gap');      // distance between the two ribbon centres
      const top = cssNumber('--wave-top');      // centre of the first ribbon
      const height = top + gap + amp + cssNumber('--wave-bottom');

      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.style.height = `${height}px`;

      rows.forEach((row, i) => {
        row.centerY = top + i * gap;
        const d = wavePath(row.centerY);
        row.paths.forEach((p) => p.setAttribute('d', d));

        if (row.icons) {
          buildIcons(row, row.paths[0].getTotalLength());
          placeIcons(row);
          return;
        }

        // Measure one copy of the words, then repeat them to cover the ribbon twice over.
        fillWords(row, 1);
        row.copyLength = row.text.getComputedTextLength();
        const pathLength = row.paths[0].getTotalLength();
        fillWords(row, Math.ceil(pathLength / row.copyLength) + 2);
        // The path starts off-screen, so starting the words up to one copy early is invisible.
        row.textPath.setAttribute('startOffset', (-row.offset).toFixed(1));
      });
    };

    // Wait for the display font, otherwise the measured word length is wrong.
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
      layout();
      svg.classList.add('is-ready');
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layout, 150);
    });

    if (!reduceMotion) {
      let boost = 0;
      let direction = 1;
      let lastScroll = window.scrollY;

      window.addEventListener('scroll', () => {
        const delta = window.scrollY - lastScroll;
        lastScroll = window.scrollY;
        direction = delta >= 0 ? 1 : -1;               // scrolling up reverses the ribbons
        boost = Math.min(boost + Math.abs(delta) * 0.15, 14);
      }, { passive: true });

      const tick = () => {
        if (width && rows[0].copyLength) {
          phase += 0.008 * (1 + boost * 0.3);           // the wave itself flows slowly
          rows.forEach((row) => {
            const d = wavePath(row.centerY);
            row.paths.forEach((p) => p.setAttribute('d', d));

            const len = row.copyLength;
            row.offset += row.speed * (1 + boost) * direction;
            row.offset = ((row.offset % len) + len) % len;   // wrap around seamlessly
            if (row.icons) placeIcons(row);
            else row.textPath.setAttribute('startOffset', (-row.offset).toFixed(1));
          });
          boost *= 0.92;                                     // scroll boost fades out
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }
}
