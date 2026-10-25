# Creative Portfolio

Yuki's personal portfolio website: design, illustration, UI/UX and development.
Plain HTML, CSS and vanilla JavaScript — no build step.

## Pages
| File | Page |
|---|---|
| `index.html` | Home: hero, floating program icons, marquee, featured work |
| `about.html` | About: intro, photobooth strips, experience/education, software/languages |
| `projects.html` | Projects: museum wall gallery; the shark's fin follows the mouse |
| `contact.html` | Contact: email and socials |
| `case-study-example.html` | Template for a case study (copy it for each project) |
| `case-letsdive.html` | Case study: Let's Dive |

## Structure
```
css/style.css      shared styles + design tokens (colors, fonts, spacing)
css/<page>.css     page-specific styles
js/projects.js     fin-follows-mouse on the Projects page
assets/img/        illustrations (cropped WebP)
assets/icons/      logo + logo mark SVGs
assets/docs/       CV (add yuki-cv.pdf)
```

## Case study rules
- Focus on problem, process and outcome. A recruiter should be able to skim it.
- **Buttons:** "Live demo" and "View code" sit next to the title and repeat under Outcome.
  Delete the one a project doesn't have (in both places). GitHub links always go to
  `github.com/ydsphoenix`.
- **Process:** 4 to 6 numbered zigzag steps, each with one image and one sentence,
  joined by the hand-drawn dashed line. Copy a `<li class="step">` to add a step.
- **Hero:** a short looping GIF beside the title, calm, not full width. Add a still
  `.webp` for reduced motion.
- **Theme:** each case study can set `class="theme-<project>"` on `<body>`. A theme
  only overrides color tokens (see the block in `css/case-study.css`); fonts, borders,
  shadows and buttons stay the portfolio style.

## Run locally
Open `index.html` in a browser, or use the VS Code **Live Server** extension.

## Status
Placeholders still to replace: program icons, project images, photobooth photos,
pushpin, tape strips, picture frames, CV, LinkedIn URL, and all dummy text.
Final colors and fonts are still placeholders in `css/style.css`.
