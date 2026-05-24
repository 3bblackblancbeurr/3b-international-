export function normalizeAnswer(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function onlyLetters(value) {
  return String(value || "").replace(/[^a-zA-ZÀ-ÿ]/g, "");
}

export function shuffleArray(array) {
  const copy = [...array];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

export function checkAnswer(userAnswer, validAnswer) {
  return normalizeAnswer(userAnswer) === normalizeAnswer(validAnswer);
}