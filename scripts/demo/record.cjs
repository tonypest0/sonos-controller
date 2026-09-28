// Scripted walkthrough of the controller, recorded with Playwright.
const { chromium } = require('playwright')
const path = require('path')

const W = 430, H = 900
const fs = require('fs')
const OUT = path.join(__dirname, 'shots')

const OVERLAY_JS = () => {
  const style = document.createElement('style')
  style.textContent = `
    #demo-cap{position:fixed;left:14px;right:14px;bottom:84px;z-index:99999;pointer-events:none;
      background:rgba(10,14,16,.9);border:1px solid rgba(0,229,255,.45);border-radius:14px;
      padding:10px 14px;font:600 14px/1.35 -apple-system,Segoe UI,Roboto,sans-serif;color:#fff;
      box-shadow:0 8px 30px rgba(0,0,0,.6);transition:opacity .35s,transform .35s;opacity:0;transform:translateY(8px)}
    #demo-cap.on{opacity:1;transform:none}
    body:has(.modal-sheet) #demo-cap{bottom:auto;top:6px;padding:7px 12px}
    #demo-cap small{display:block;font-weight:400;font-size:12px;color:#9fdfe8;margin-top:2px}
    .demo-tap{position:fixed;z-index:99998;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;
      background:rgba(0,229,255,.35);border:2px solid rgba(0,229,255,.9);pointer-events:none;
      animation:demo-tap .6s ease-out forwards}
    @keyframes demo-tap{from{transform:scale(.4);opacity:1}to{transform:scale(1.5);opacity:0}}
    #demo-finger{position:fixed;z-index:99998;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;
      background:rgba(255,255,255,.28);border:2px solid rgba(255,255,255,.75);pointer-events:none;
      transition:left .35s ease,top .35s ease,opacity .3s;opacity:0}
  `
  document.head.appendChild(style)
  const cap = document.createElement('div'); cap.id = 'demo-cap'; document.body.appendChild(cap)
  const f = document.createElement('div'); f.id = 'demo-finger'; document.body.appendChild(f)
}

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  })
  const page = await ctx.newPage()
  page.on('dialog', d => d.accept())
  const wait = ms => page.waitForTimeout(ms)

  // Capture frames via CDP screencast at full device pixel ratio.
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT)
  const frames = []
  const cdp = await ctx.newCDPSession(page)
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const f = path.join(OUT, `${String(frames.length).padStart(5, '0')}.jpg`)
    fs.writeFileSync(f, Buffer.from(data, 'base64'))
    frames.push({ f, t: metadata.timestamp })
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })

  await page.goto('http://localhost:5173/')
  await page.evaluate(OVERLAY_JS)
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W * 2, maxHeight: H * 2, everyNthFrame: 1 })

  const caption = async (title, sub = '') => {
    await page.evaluate(([t, s]) => {
      const c = document.getElementById('demo-cap')
      c.classList.remove('on')
      setTimeout(() => { c.innerHTML = t + (s ? `<small>${s}</small>` : ''); c.classList.add('on') }, 200)
    }, [title, sub])
    await wait(450)
  }
  const hideCaption = () => page.evaluate(() => document.getElementById('demo-cap').classList.remove('on'))

  const moveFinger = async (x, y) => {
    await page.evaluate(([x, y]) => {
      const f = document.getElementById('demo-finger')
      f.style.opacity = 1; f.style.left = x + 'px'; f.style.top = y + 'px'
    }, [x, y])
    await page.mouse.move(x, y)
    await wait(400)
  }
  const tapFx = (x, y) => page.evaluate(([x, y]) => {
    const d = document.createElement('div'); d.className = 'demo-tap'
    d.style.left = x + 'px'; d.style.top = y + 'px'
    document.body.appendChild(d); setTimeout(() => d.remove(), 700)
  }, [x, y])

  const tap = async (locator, pause = 900) => {
    const el = typeof locator === 'string' ? page.locator(locator).first() : locator
    await el.scrollIntoViewIfNeeded()
    const b = await el.boundingBox()
    const x = b.x + b.width / 2, y = b.y + b.height / 2
    await moveFinger(x, y)
    await tapFx(x, y)
    await page.mouse.click(x, y)
    await wait(pause)
  }

  // Drag a range input from its current value to `to`.
  const drag = async (locator, to, pause = 800) => {
    const el = typeof locator === 'string' ? page.locator(locator).first() : locator
    await el.scrollIntoViewIfNeeded()
    const b = await el.boundingBox()
    const { min, max, value } = await el.evaluate(i => ({ min: +i.min, max: +i.max, value: +i.value }))
    const thumb = 10
    const px = v => b.x + thumb + ((v - min) / (max - min)) * (b.width - thumb * 2)
    const y = b.y + b.height / 2
    await moveFinger(px(value), y)
    await page.mouse.down()
    const steps = 18
    for (let i = 1; i <= steps; i++) {
      const v = value + ((to - value) * i) / steps
      const x = px(v)
      await page.evaluate(([x, y]) => {
        const f = document.getElementById('demo-finger')
        f.style.transition = 'opacity .3s'; f.style.left = x + 'px'; f.style.top = y + 'px'
      }, [x, y])
      await page.mouse.move(x, y)
      await wait(35)
    }
    await wait(250)
    await page.mouse.up()
    await page.evaluate(() => { document.getElementById('demo-finger').style.transition = '' })
    await wait(pause)
  }

  const typeInto = async (locator, text) => {
    await tap(locator, 200)
    await page.keyboard.press('Control+A')
    await page.keyboard.type(text, { delay: 55 })
    await wait(400)
  }

  const scrollContent = async (y) => {
    await page.evaluate(y => {
      const m = document.querySelector('.app-content')
      ;(m.scrollHeight > m.clientHeight ? m : document.scrollingElement).scrollTo({ top: y, behavior: 'smooth' })
    }, y)
    await wait(700)
  }

  // ---- 1. Intro / Now Playing ----
  await wait(1500)
  await caption('Arc Controller', 'A local web app for controlling Sonos from any phone or browser')
  await wait(2600)
  await caption('Now Playing', 'Track, artist, album and art update live from the speaker')
  await wait(2200)
  await caption('Transport controls', 'Skip, go back, pause and resume without the Sonos app')
  await tap('.now-playing-card [aria-label="Next"]', 1800)
  await tap('.now-playing-card [aria-label="Next"]', 1800)
  await tap('.now-playing-card [aria-label="Pause"]', 400)
  await page.locator('.now-playing-card [aria-label="Play"]').waitFor()
  await wait(1400)
  await tap('.now-playing-card [aria-label="Play"]', 400)
  await page.locator('.now-playing-card [aria-label="Pause"]').waitFor()
  await wait(1000)

  // ---- 2. Queue ----
  await caption('Queue', 'See what is coming up next')
  await tap('[aria-label="Toggle queue"]', 2600)
  await tap('[aria-label="Toggle queue"]', 800)

  // ---- 3. Expanded Now Playing ----
  await caption('Full-screen player', 'Background colours are pulled from the album art')
  await tap('[aria-label="Expand now playing"]', 2600)
  await tap('.npx-controls [aria-label="Next"]', 2400)
  await tap('.npx-controls [aria-label="Next"]', 2400)
  await tap('.npx-close', 900)

  // ---- 4. Live Controls ----
  await caption('Live Controls', 'Fine-tune volume and EQ in real time')
  const liveRow = label => page.locator('.quick-slider-row', { has: page.locator('.quick-slider-label', { hasText: new RegExp(`^${label}$`) }) }).locator('input[type=range]')
  await drag(liveRow('Volume'), 48)
  await drag(liveRow('Bass'), 5)
  await drag(liveRow('Treble'), -2)
  await caption('Subwoofer', 'Toggle the sub and set its gain on the fly')
  await drag(liveRow('Sub Gain'), 7)
  await tap(page.locator('.quick-slider-row', { hasText: 'Subwoofer' }).locator('.toggle-switch'), 1000)
  await tap(page.locator('.quick-slider-row', { hasText: 'Subwoofer' }).locator('.toggle-switch'), 900)

  // ---- 5. Grouping ----
  await caption('Speaker grouping', 'Group rooms in one tap; the header shows who is playing together')
  await tap('.quick-group-btn', 2200)
  await scrollContent(9999)
  await caption('Per-speaker volume', 'When grouped, each speaker gets its own slider')
  await drag(liveRow('Kitchen'), 40)
  await drag(liveRow('Group Vol'), 45, 1000)
  await tap('.quick-group-btn', 1800)
  await scrollContent(0)

  // ---- 6. Profiles ----
  await caption('Sound Profiles', 'Save volume, EQ, sub, night mode and speech settings')
  await tap('.nav-tab:has-text("Profiles")', 2000)
  await caption('Apply a profile in one tap')
  await tap(page.locator('.profile-card', { hasText: 'Movie Night' }).locator('.apply-btn'), 2400)
  await caption('New profile', 'Create your own, e.g. for late-night dialogue')
  await tap('.add-btn:has-text("New")', 900)
  await typeInto('.modal-sheet input.form-input', 'Late Night TV')
  const edRow = label => page.locator('.modal-sheet .slider-group', { has: page.locator('.slider-label', { hasText: new RegExp(`^${label}$`) }) }).locator('input[type=range]').first()
  await drag(edRow('Volume'), 22, 400)
  await drag(edRow('Treble'), 3, 400)
  await tap(page.locator('.modal-sheet .toggle-row', { hasText: 'Night Mode' }).locator('.toggle-switch').first(), 500)
  await tap(page.locator('.modal-sheet .toggle-row', { hasText: 'Speech Enhancement' }).locator('.toggle-switch').first(), 700)
  await tap('.modal-sheet .btn-primary', 1800)
  await scrollContent(9999)
  await wait(800)
  await tap(page.locator('.profile-card', { hasText: 'Late Night TV' }).locator('.apply-btn'), 2200)
  await scrollContent(0)
  await caption('Capture', 'Snapshot the speaker’s current settings into a new profile')
  await tap('.add-btn:has-text("Capture")', 2200)
  await tap('.modal-sheet .btn-secondary', 800)

  // ---- 7. Schedule ----
  await caption('Scheduling', 'Apply profiles automatically at set times and days')
  await tap('.nav-tab:has-text("Schedule")', 1200)
  await tap('.scheduler-header .add-btn', 900)
  await page.locator('.settings-card select.form-input').selectOption({ label: 'Late Night TV' })
  await wait(700)
  await tap('.day-chip >> nth=0', 350)
  await tap('.day-chip >> nth=6', 600)
  await page.locator('.settings-card input[type=time]').fill('22:30')
  await wait(700)
  await tap('.btn-primary:has-text("Add Schedule")', 2600)

  // ---- 8. Settings ----
  await caption('Settings', 'Connection, session-start volume and the activity log')
  await tap('.nav-tab:has-text("Settings")', 1200)
  await tap('button:has-text("Test Connection")', 1800)
  await tap(page.locator('.settings-card', { hasText: 'Auto-set volume' }).locator('.toggle-switch').first(), 1200)
  await caption('Activity log', 'Every change is recorded with before / after values')
  await page.locator('.settings-section', { hasText: 'Activity Log' }).scrollIntoViewIfNeeded()
  await wait(3500)
  await scrollContent(0)

  // ---- Outro ----
  await caption('Arc Controller', 'Runs as an always-on local service on macOS or Windows')
  await tap('.nav-tab:has-text("Now Playing")', 3200)
  await hideCaption()
  await wait(800)

  await cdp.send('Page.stopScreencast')
  // ffmpeg concat list with real per-frame durations
  let list = ''
  frames.forEach((fr, i) => {
    const d = i < frames.length - 1 ? frames[i + 1].t - fr.t : 0.5
    list += `file '${fr.f}'\nduration ${d.toFixed(4)}\n`
  })
  list += `file '${frames[frames.length - 1].f}'\n`
  fs.writeFileSync(path.join(__dirname, 'frames.txt'), list)
  console.log(frames.length, 'frames', (frames.at(-1).t - frames[0].t).toFixed(1), 's')
  await ctx.close()
  await browser.close()
}

main().catch(e => { console.error(e); process.exit(1) })
