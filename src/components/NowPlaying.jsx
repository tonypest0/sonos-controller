import { Music2 } from 'lucide-react'

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

export default function NowPlaying({ state }) {
  const isPlaying = state?.playbackState === 'PLAYING'
  const isPaused  = state?.playbackState === 'PAUSED_PLAYBACK'
  const track     = state?.currentTrack

  const hasTrack  = track && (track.title || track.artist)
  const artUri    = track?.absoluteAlbumArtUri || track?.albumArtUri

  // Resolve art through the proxy if it's an absolute http URL to the Sonos device
  const artSrc = artUri
    ? artUri.startsWith('http')
      ? `/sonos-proxy?url=${encodeURIComponent(artUri)}`
      : artUri
    : null

  if (!state) {
    // First load — show skeleton
    return (
      <div className="now-playing-card now-playing-card--skeleton">
        <div className="np-art np-art--skeleton" />
        <div className="np-info">
          <div className="np-skeleton-line" style={{ width: '60%' }} />
          <div className="np-skeleton-line" style={{ width: '40%', marginTop: 6 }} />
        </div>
      </div>
    )
  }

  if (!hasTrack || (!isPlaying && !isPaused)) {
    return (
      <div className="now-playing-card now-playing-card--idle">
        <div className="np-art np-art--idle">
          <Music2 size={22} strokeWidth={1.5} />
        </div>
        <div className="np-info">
          <span className="np-title np-title--idle">Nothing playing</span>
          <span className="np-artist">Sonos is idle</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`now-playing-card${isPlaying ? ' now-playing-card--playing' : ''}`}>
      <div className="np-art">
        {artSrc ? (
          <img src={artSrc} alt="Album art" className="np-art-img" />
        ) : (
          <div className="np-art-placeholder">
            <Music2 size={22} strokeWidth={1.5} />
          </div>
        )}
        {isPlaying && <div className="np-art-overlay"><EqBars /></div>}
      </div>

      <div className="np-info">
        <div className="np-title-row">
          {isPlaying && <EqBars />}
          <span className="np-title">{track.title || 'Unknown track'}</span>
        </div>
        {track.artist && <span className="np-artist">{track.artist}</span>}
        {track.album  && <span className="np-album">{track.album}</span>}
      </div>

      {isPaused && <span className="np-badge">Paused</span>}
    </div>
  )
}
