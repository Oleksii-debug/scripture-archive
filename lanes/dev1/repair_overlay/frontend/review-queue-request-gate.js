export function createRequestGenerationGate(isVisible) {
  if (typeof isVisible !== 'function') throw new TypeError('isVisible must be a function');
  let generation = 0;

  return Object.freeze({
    begin() {
      generation += 1;
      return generation;
    },
    invalidate() {
      generation += 1;
      return generation;
    },
    isCurrent(token) {
      return Number.isInteger(token) && token === generation && isVisible() === true;
    },
  });
}
