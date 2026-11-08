export function mapsUrl(lat: number, lon: number) {
  return `https://maps.google.com/?q=${lat.toFixed(6)},${lon.toFixed(6)}`
}

export function locationText(lat: number, lon: number, accuracy: number, id: boolean) {
  const head = id ? 'Saya butuh bantuan. Lokasi saya:' : 'I need help. My location:'
  const acc = id ? `Akurasi GPS ± ${Math.round(accuracy)} m` : `GPS accuracy ± ${Math.round(accuracy)} m`
  return `${head}\n${mapsUrl(lat, lon)}\n${lat.toFixed(6)}, ${lon.toFixed(6)}\n${acc}`
}

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`
