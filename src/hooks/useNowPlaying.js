import { useState, useEffect, useRef } from 'react'

const POLL_PLAYING = 5000   // 5s while something is playing
const POLL_IDLE    = 15000  // 15s when stopped/paused

export function useNowPlaying({ config, enabled = true }) {
  const [state, setState] = useState(null)  // null = not yet loaded
  const timerRef = useRef(null)
  const playingRef = useRef(false)

  useEffect(() => {
    if (!enabled || !config?.host) return

    const poll = async () => {
      try {
        const url = `/sonos-proxy?url=${encodeURIComponent(
          `http://${config.host}:${config.port}/${encodeURIComponent(config.room)}/state`
        )}`
        const res = await fetch(url)
        if (!res.ok) return
        const data = await res.json()
        setState(data)
        playingRef.current = data.playbackState === 'PLAYING'
      } catch {
        // keep last known state on error
      } finally {
        const interval = playingRef.current ? POLL_PLAYING : POLL_IDLE
        timerRef.current = setTimeout(poll, interval)
      }
    }

    poll()
    return () => clearTimeout(timerRef.current)
  }, [enabled, config])

  return state
}
