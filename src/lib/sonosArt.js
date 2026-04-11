/**
 * Resolve album art URL for a Sonos track.
 * Prefers albumArtUri via the device's /getaa endpoint (gives per-track art even for
 * YTM liked-songs playlists). Falls back to absoluteAlbumArtUri (CDN) when no deviceBase.
 */
export function resolveArt(track, deviceBase) {
  const relative = track?.albumArtUri
  if (relative && deviceBase) {
    return `/sonos-proxy?url=${encodeURIComponent(`${deviceBase}${relative}`)}`
  }
  const absolute = track?.absoluteAlbumArtUri
  if (absolute?.startsWith('http')) {
    return `/sonos-proxy?url=${encodeURIComponent(absolute)}`
  }
  return null
}
