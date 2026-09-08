/** #rrggbb 를 밝기로 판정해 읽기 쉬운 글씨색을 고른다. */
export function autoTextColor(background: string) {
  const hex = background.replace('#', '')
  if (hex.length !== 6) return '#ffffff'
  const red = parseInt(hex.slice(0, 2), 16)
  const green = parseInt(hex.slice(2, 4), 16)
  const blue = parseInt(hex.slice(4, 6), 16)
  // 사람 눈은 녹색에 가장 민감하다. 가중치를 준 밝기로 판단한다.
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255
  return luminance > 0.6 ? '#1f2733' : '#ffffff'
}

export function textOn(background: string, override?: string) {
  return override || autoTextColor(background)
}
