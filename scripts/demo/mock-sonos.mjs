// Minimal stand-in for node-sonos-http-api, for recording the demo video.
import http from 'http'

const PORT = 5005
const BASE = `http://localhost:${PORT}`

const TRACKS = [
  { title: 'Midnight Drive', artist: 'Neon Harbor', album: 'City Lights', c: ['#ff3d7f', '#7b2ff7'], shape: 'sun' },
  { title: 'Ocean Floor', artist: 'Tidal Echo', album: 'Deep Blue', c: ['#00c6ff', '#0072ff'], shape: 'waves' },
  { title: 'Golden Hour', artist: 'The Amber Room', album: 'Late Summer', c: ['#ffb347', '#ff5e00'], shape: 'circle' },
  { title: 'Evergreen', artist: 'Moss & Stone', album: 'Northern Woods', c: ['#3ddc84', '#0b6e4f'], shape: 'tri' },
  { title: 'Static Bloom', artist: 'Violet Hours', album: 'Signals', c: ['#c471f5', '#fa71cd'], shape: 'rings' },
  { title: 'Paper Planes', artist: 'Juniper Lane', album: 'Weekend Radio', c: ['#f9d423', '#e65c00'], shape: 'sun' },
  { title: 'Low Tide', artist: 'Harbor Lights', album: 'Coastline', c: ['#43cea2', '#185a9d'], shape: 'waves' },
  { title: 'Afterglow', artist: 'Neon Harbor', album: 'City Lights', c: ['#ff6a88', '#ff99ac'], shape: 'circle' },
]

const rooms = {
  'Living Room': { volume: 32, bass: 1, treble: 0, nightMode: false, speech: false, sub: { enabled: true, gain: 2 } },
  'Kitchen': { volume: 24, bass: 0, treble: 0, nightMode: false, speech: false, sub: { enabled: false, gain: 0 } },
}
let grouped = false
let trackNo = 1
let playbackState = 'PLAYING'
let source = 'music' // 'music' | 'tv' — flip with GET /demo/source/tv

const TV_TRACK = { type: 'line_in', uri: 'x-sonos-htastream:RINCON_DEMO000000001400:spdif', title: '', artist: '', album: '' }

function trackObj(i) {
  const t = TRACKS[i]
  return { title: t.title, artist: t.artist, album: t.album, uri: `x-demo:${i}`, absoluteAlbumArtUri: `${BASE}/art/${i}.svg` }
}

function roomState(name) {
  const r = rooms[name]
  return {
    playbackState,
    trackNo,
    currentTrack: source === 'tv' ? TV_TRACK : trackObj(trackNo - 1),
    volume: r.volume,
    equalizer: { bass: r.bass, treble: r.treble, nightMode: r.nightMode, speechEnhancement: r.speech, subEnabled: r.sub.enabled, subGain: r.sub.gain },
    sub: { ...r.sub },
  }
}

function member(name) { return { roomName: name, state: roomState(name) } }

function zones() {
  const lr = member('Living Room')
  if (grouped) {
    const avg = Math.round((rooms['Living Room'].volume + rooms['Kitchen'].volume) / 2)
    return [{ uuid: 'Z1', coordinator: { ...lr, groupState: { volume: avg } }, members: [lr, member('Kitchen')] }]
  }
  return [
    { uuid: 'Z1', coordinator: { ...lr, groupState: { volume: lr.state.volume } }, members: [lr] },
    { uuid: 'Z2', coordinator: { ...member('Kitchen'), groupState: { volume: rooms.Kitchen.volume } }, members: [member('Kitchen')] },
  ]
}

function art(i) {
  const t = TRACKS[i % TRACKS.length]
  const [a, b] = t.c
  const shapes = {
    sun: `<circle cx="300" cy="260" r="130" fill="#fff" opacity=".85"/><rect y="390" width="600" height="210" fill="#000" opacity=".35"/>`,
    waves: [0, 1, 2, 3].map(k => `<path d="M0 ${300 + k * 60} Q150 ${240 + k * 60} 300 ${300 + k * 60} T600 ${300 + k * 60} V600 H0Z" fill="#fff" opacity=".${2 + k}"/>`).join(''),
    circle: `<circle cx="300" cy="300" r="190" fill="none" stroke="#fff" stroke-width="28" opacity=".8"/><circle cx="300" cy="300" r="70" fill="#fff" opacity=".9"/>`,
    tri: `<path d="M300 90 L520 470 H80Z" fill="#fff" opacity=".8"/><path d="M300 230 L420 470 H180Z" fill="#000" opacity=".3"/>`,
    rings: [220, 160, 100, 40].map((r, k) => `<circle cx="300" cy="300" r="${r}" fill="none" stroke="#fff" stroke-width="14" opacity=".${4 + k * 2}"/>`).join(''),
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect width="600" height="600" fill="url(#g)"/>${shapes[t.shape]}
<text x="40" y="560" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="700" fill="#fff" opacity=".9">${t.album.toUpperCase()}</text>
</svg>`
}

function json(res, body) {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

http.createServer((req, res) => {
  const parts = decodeURIComponent(req.url.split('?')[0]).split('/').filter(Boolean)
  if (parts[0] === 'art') {
    res.writeHead(200, { 'Content-Type': 'image/svg+xml' })
    return res.end(art(parseInt(parts[1], 10) || 0))
  }
  if (parts[0] === 'zones') return json(res, zones())
  if (parts[0] === 'demo' && parts[1] === 'source') {
    source = parts[2] === 'tv' ? 'tv' : 'music'
    playbackState = 'PLAYING'
    return json(res, { source })
  }

  const [roomName, cmd, a1, a2] = parts
  const room = rooms[roomName]
  if (!room) { res.writeHead(404); return res.end('{}') }

  switch (cmd) {
    case 'state': return json(res, roomState(roomName))
    case 'queue': return json(res, TRACKS.map((_, i) => trackObj(i)))
    case 'playpause': playbackState = playbackState === 'PLAYING' ? 'PAUSED_PLAYBACK' : 'PLAYING'; break
    case 'play': playbackState = 'PLAYING'; break
    case 'pause': playbackState = 'PAUSED_PLAYBACK'; break
    case 'next': trackNo = trackNo % TRACKS.length + 1; break
    case 'previous': trackNo = trackNo === 1 ? TRACKS.length : trackNo - 1; break
    case 'volume': room.volume = clamp(+a1, 0, 100); break
    case 'groupvolume': rooms['Living Room'].volume = rooms.Kitchen.volume = clamp(+a1, 0, 100); break
    case 'bass': room.bass = clamp(+a1, -10, 10); break
    case 'treble': room.treble = clamp(+a1, -10, 10); break
    case 'nightmode': room.nightMode = a1 === 'on'; break
    case 'speechenhancement': room.speech = a1 === 'on'; break
    case 'sub':
      if (a1 === 'gain') room.sub.gain = clamp(+a2, -15, 15)
      else room.sub.enabled = a1 === 'on'
      break
    case 'subwoofer': room.sub.gain = clamp(+a1, -15, 15); break
    case 'add': grouped = true; break
    case 'leave': grouped = false; break
  }
  json(res, { status: 'success' })
}).listen(PORT, () => console.log(`mock sonos on ${PORT}`))
