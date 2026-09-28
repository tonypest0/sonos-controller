/**
 * Sonos soundbars (Arc, Beam, Ray) report the TV input (HDMI eARC / optical)
 * as an x-sonos-htastream: transport URI instead of a normal track.
 */
export function isTvAudio(track) {
  return typeof track?.uri === 'string' && track.uri.startsWith('x-sonos-htastream:')
}
