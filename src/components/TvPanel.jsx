import { useState, useEffect } from 'react'
import { MessageSquareText, Moon } from 'lucide-react'

/**
 * Shown on the Now Playing tab while the soundbar is playing TV audio.
 * Draws the TV / soundbar / sub setup and exposes the TV-specific modes.
 */
export default function TvPanel({ config, state, groupMembers, onLog }) {
  const eq = state?.equalizer || {}
  const sub = state?.sub || {}
  const isPlaying = state?.playbackState === 'PLAYING'

  const [speech, setSpeech] = useState(!!eq.speechEnhancement)
  const [night, setNight] = useState(!!eq.nightMode)

  // Follow changes made elsewhere (Sonos app, profiles)
  useEffect(() => { setSpeech(!!eq.speechEnhancement) }, [eq.speechEnhancement])
  useEffect(() => { setNight(!!eq.nightMode) }, [eq.nightMode])

  const send = (command, enabled) => {
    const url = `/sonos-proxy?url=${encodeURIComponent(
      `http://${config.host}:${config.port}/${encodeURIComponent(config.room)}/${command}/${enabled ? 'on' : 'off'}`
    )}`
    fetch(url).catch(() => {})
  }

  const toggleSpeech = (enabled) => {
    onLog?.({ type: 'setting_toggled', action: 'TV Audio', what: 'Speech Enhancement', before: !enabled, after: enabled })
    setSpeech(enabled)
    send('speechenhancement', enabled)
  }

  const toggleNight = (enabled) => {
    onLog?.({ type: 'setting_toggled', action: 'TV Audio', what: 'Night Mode', before: !enabled, after: enabled })
    setNight(enabled)
    send('nightmode', enabled)
  }

  const subOn = sub.enabled === true
  const subGain = typeof sub.gain === 'number' ? sub.gain : 0
  const others = groupMembers.filter(n => n !== config.room)

  return (
    <div className="tv-panel">
      <div className={`tv-stage ${isPlaying ? 'tv-stage--on' : ''}`}>
        <div className="tv-screen">
          <div className="tv-picture" />
          <span className="tv-screen-label">TV</span>
        </div>

        <div className="tv-speakers">
          <div className="tv-arc">
            {isPlaying && (
              <div className="tv-waves" aria-hidden>
                <span /><span /><span />
              </div>
            )}
            <div className="tv-arc-bar" />
            <span className="tv-spk-label">{config.room}</span>
            <span className="tv-spk-meta">
              {[speech && 'Speech', night && 'Night'].filter(Boolean).join(' + ') || 'Standard'}
            </span>
          </div>

          <div className={`tv-sub ${subOn ? 'tv-sub--on' : ''}`}>
            <div className="tv-sub-box"><div className="tv-sub-driver" /></div>
            <span className="tv-spk-label">Sub</span>
            <span className="tv-spk-meta">
              {subOn ? `${subGain > 0 ? '+' : ''}${subGain}` : 'Off'}
            </span>
          </div>
        </div>

        {others.length > 0 && (
          <div className="tv-also">Also playing in {others.join(', ')}</div>
        )}
      </div>

      <div className="tv-modes">
        <div className="quick-slider-row">
          <div className="quick-slider-label">
            <MessageSquareText size={14} strokeWidth={2} />
            <span>Speech Enhancement</span>
          </div>
          <label className="toggle-switch" style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <input type="checkbox" checked={speech} onChange={(e) => toggleSpeech(e.target.checked)} />
            <div className="toggle-track" />
            <div className="toggle-thumb" />
          </label>
        </div>
        <div className="quick-slider-row">
          <div className="quick-slider-label">
            <Moon size={14} strokeWidth={2} />
            <span>Night Mode</span>
          </div>
          <label className="toggle-switch" style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <input type="checkbox" checked={night} onChange={(e) => toggleNight(e.target.checked)} />
            <div className="toggle-track" />
            <div className="toggle-thumb" />
          </label>
        </div>
      </div>
    </div>
  )
}
