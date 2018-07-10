export function generateTask (length) {
  return Array.from({ length }, (v, k) => ({
    number: k,
    left: Math.random() * 2700,
    top: Math.random() * 900,
    width: Math.random() * 150 + 30,
    dependencies:
      k < length - 1 && Math.random() < 0.1
        ? [Math.floor(Math.random() * (length - 1 - k)) + k + 1]
        : []
  }))
}
