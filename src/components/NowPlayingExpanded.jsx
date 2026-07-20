import { useEffect, useRef, useState } from 'react'
import { X, Music2, SkipBack, SkipForward, Play, Pause } from 'lucide-react'
import { useAlbumColors } from '../lib/useAlbumColors'

function EqBars() {
  return (
    <span className="np-eq" aria-hidden>
      <span className="np-eq-bar" style={{ '--d': '0ms' }} />
      <span className="np-eq-bar" style={{ '--d': '150ms' }} />
      <span className="np-eq-bar" style={{ '--d': '75ms' }} />
      <span className="np-eq-bar" style={{ '--d': '225ms' }} />
    </span>
  )
}

export default function NowPlayingExpanded({ state, config, artSrc, onClose, onTransportAction }) {
  const colors = useAlbumColors(artSrc)
  const track = state?.currentTrack
  const isPlaying = state?.playbackState === 'PLAYING'
  const isPaused = state?.playbackState === 'PAUSED_PLAYBACK'

  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const timersRef = useRef([])

  const send = async (action) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      const room = encodeURIComponent(config.room)
      await fetch(`/sonos-proxy?url=${encodeURIComponent(`http://${config.host}:${config.port}/${room}/${action}`)}`)
      const isTrackChange = action === 'next' || action === 'previous'
      timersRef.current.push(setTimeout(onTransportAction, isTrackChange ? 500 : 400))
      if (isTrackChange) timersRef.current.push(setTimeout(onTransportAction, 1500))
    } catch {}
    busyRef.current = false
    setBusy(false)
  }

  useEffect(() => () => timersRef.current.forEach(clearTimeout), [])

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Escape to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Build gradient from extracted colors
  const c1 = colors?.[0]
  const c2 = colors?.[1] ?? c1
  const gradient = c1
    ? `radial-gradient(ellipse 120% 60% at 20% 10%, rgba(${c1.r},${c1.g},${c1.b},0.45) 0%, transparent 65%),
       radial-gradient(ellipse 100% 50% at 80% 90%, rgba(${c2.r},${c2.g},${c2.b},0.35) 0%, transparent 60%),
       #050505`
    : '#050505'

  return (
    <div className="npx-overlay" onClick={onClose}>
      {/* Animated gradient background */}
      <div
        className="npx-bg"
        style={{ background: gradient }}
      />

      <div className="npx-sheet" onClick={e => e.stopPropagation()}>
        {/* Drag handle / close */}
        <button className="npx-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {/* Album art */}
        <div className="npx-art-wrap">
          {artSrc
            ? <img src={artSrc} alt="Album art" className="npx-art" />
            : <div className="npx-art-placeholder"><Music2 size={64} strokeWidth={1} /></div>
          }
          {isPlaying && (
            <div className="npx-art-eq">
              <EqBars />
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="npx-info">
          <div className="npx-title">{track?.title || 'Unknown track'}</div>
          {track?.artist && <div className="npx-artist">{track.artist}</div>}
          {track?.album  && <div className="npx-album">{track.album}</div>}
          {isPaused && <div className="npx-status">Paused</div>}
        </div>

        {/* Transport controls */}
        {config?.host && (
          <div className="npx-controls">
            <button
              className="npx-ctrl npx-ctrl--secondary"
              onClick={() => send('previous')}
              disabled={busy}
              aria-label="Previous"
            >
              <SkipBack size={28} />
            </button>
            <button
              className="npx-ctrl npx-ctrl--primary"
              onClick={() => send('playpause')}
              disabled={busy}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={32} /> : <Play size={32} />}
            </button>
            <button
              className="npx-ctrl npx-ctrl--secondary"
              onClick={() => send('next')}
              disabled={busy}
              aria-label="Next"
            >
              <SkipForward size={28} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
