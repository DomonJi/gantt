export function generateTask (length) {
  return Array.from({ length }, (v, k) => ({
    number: k,
    left: Math.random() * 5700,
    top: Math.random() * 700,
    width: Math.random() * 200 + 50,
    dependencies:
      k < length - 1 && Math.random() < 0.02
        ? [Math.floor(Math.random() * (length - 1 - k)) + k + 1]
        : []
  }))
}
