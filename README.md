# Square Dodger

Square Dodger is a lightweight arcade survival game built for the browser.
Players dodge falling blocks, earn credits, unlock skins, and try to beat their best score on desktop or mobile.

Built by `swiiish.x / Olawale`.

## Features

- Fast arcade gameplay with progressive difficulty
- Mobile-friendly touch controls
- Persistent high score, credits, and unlocked skins
- Simple sound effects and visual polish
- Built-in playtest feedback links for friends
- Static-file setup that can be deployed easily on GitHub Pages

## Files

- `index.html` contains the full layout, styling, and metadata
- `script.js` contains the gameplay logic, effects, audio, and progression systems

## Run Locally

You can open `index.html` directly in a browser, or serve the folder with any simple static server.

## Deploy To GitHub Pages

1. Push this folder to a public GitHub repository.
2. In the GitHub repository, open `Settings` > `Pages`.
3. Set `Source` to `Deploy from a branch`.
4. Choose the `main` branch and the `/ (root)` folder, then save.
5. GitHub will publish the site as a static page with no build command needed.

Live URL:

- `https://walekadir.github.io/squaredodger/`

## Deploy To Netlify

1. Log in to Netlify and choose `Add new site` > `Import an existing project`.
2. Select GitHub and connect the `walekadir/squaredodger` repository.
3. Netlify should detect it as a static site automatically.
4. Keep the publish directory as `.` and leave the build command empty.
5. Click deploy.

This repo includes a `netlify.toml`, so Netlify will use the right static publish settings automatically.

## Controls

### Desktop

- `Left` / `A`: move left
- `Right` / `D`: move right
- `Space` / `Up` / `W`: jump
- `P`: pause
- `Enter`: start a new run from menu or game over

### Mobile

- Use the on-screen `Left`, `Jump`, and `Right` controls

## Share Notes

The page already includes Open Graph and Twitter metadata plus a custom preview card in `social-preview.svg` and a share-friendly PNG fallback in `social-preview.png`.
