# mywebapps notes

## iOS home-screen web apps: filling the whole screen

With `apple-mobile-web-app-status-bar-style` set to `black-translucent` (content under the status bar),
recent iOS lays the page out **shorter than the screen by the status bar height**
(measured on iPhone 16 Pro: `screen.height` 874, `innerHeight` 812, `env(safe-area-inset-top)` 62).
Anything `position:fixed` — and even the page background image — stops at 812, leaving a strip
at the bottom painted only with the page background color.

What does NOT work (all tried):
- Fixed layers with `bottom:0`, `100dvh`/`100vh`, negative `bottom` overhang
- A CSS/JS `--gap` that extends fixed layers by `screen.height - innerHeight`
- Putting the artwork on the `html` background (canvas)
- Switching to `default`: no bottom strip, but the top status bar becomes a solid band (not full screen)

What works (apps/gta6):
- No fixed layers. Layers are `position:absolute` inside `body{position:relative}`.
- In standalone portrait, set the body height to the real screen height:
  `if(navigator.standalone && screen.height>screen.width && innerHeight>innerWidth)`
  `document.documentElement.style.setProperty('--H', screen.height+'px')`, with
  `body{height:var(--H,100dvh);overflow:hidden}`; update on `resize`.
- Block scrolling: `html{overscroll-behavior:none}` and
  `addEventListener('touchmove', e=>e.preventDefault(), {passive:false})`.

Debugging tip: measure on the device first. Show `screen`, `innerHeight`, `clientHeight`,
`visualViewport.height`, and the safe-area insets behind a visible button (triple-tap zooms on iOS).
Simulated runs in Playwright do not reproduce this bug.
