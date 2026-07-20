import { useState, useEffect, useRef } from 'react'

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h * 360, s, l]
}

function extractColors(img) {
  const canvas = document.createElement('canvas')
  const SIZE = 24
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, SIZE, SIZE)
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE)

  // Bin saturated pixels into 24 hue buckets
  const BUCKETS = 24
  const buckets = Array.from({ length: BUCKETS }, () => ({ r: 0, g: 0, b: 0, count: 0 }))

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
    if (a < 128) continue
    const [h, s, l] = rgbToHsl(r, g, b)
    // Skip near-grays, near-black, and near-white
    if (s < 0.15 || l < 0.08 || l > 0.92) continue
    const idx = Math.floor(h / (360 / BUCKETS)) % BUCKETS
    buckets[idx].r += r
    buckets[idx].g += g
    buckets[idx].b += b
    buckets[idx].count++
  }

  // Pick the top 2 hue buckets that are at least 3 hue-slots apart
  const sorted = buckets
    .map((b, i) => ({ ...b, i }))
    .filter(b => b.count > 0)
    .sort((a, b) => b.count - a.count)

  const picks = []
  for (const bucket of sorted) {
    const tooClose = picks.some(p => {
      const diff = Math.abs(p.i - bucket.i)
      return Math.min(diff, BUCKETS - diff) < 3
    })
    if (!tooClose) picks.push(bucket)
    if (picks.length >= 2) break
  }

  if (picks.length === 0) return null
  if (picks.length === 1) picks.push(picks[0])

  return picks.map(c => ({
    r: Math.round(c.r / c.count),
    g: Math.round(c.g / c.count),
    b: Math.round(c.b / c.count),
  }))
}

/**
 * Returns [{r,g,b}, {r,g,b}] for the two dominant colors in the image,
 * or null while loading / if extraction fails.
 */
export function useAlbumColors(artSrc) {
  const [colors, setColors] = useState(null)
  const prevSrcRef = useRef(null)

  useEffect(() => {
    if (!artSrc) { setColors(null); prevSrcRef.current = null; return }
    if (artSrc === prevSrcRef.current) return
    prevSrcRef.current = artSrc

    const img = new Image()
    // Same-origin proxy — crossOrigin not needed, but set for canvas taint safety
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try { setColors(extractColors(img)) }
      catch { setColors(null) }
    }
    img.onerror = () => setColors(null)
    img.src = artSrc
  }, [artSrc])

  return colors
}
