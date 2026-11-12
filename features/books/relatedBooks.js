const DEFAULT_LIMIT = 4;

const asTags = (value) => (Array.isArray(value) ? value : []);

const scoreCandidate = (current, candidate) => {
  let score = 0;

  if (
    current.series_name &&
    candidate.series_name === current.series_name
  ) {
    score += 10;
  }

  if (current.author && candidate.author === current.author) {
    score += 6;
  }

  const currentTags = asTags(current.tags);
  const candidateTags = asTags(candidate.tags);
  if (currentTags.length > 0 && candidateTags.length > 0) {
    const currentTagSet = new Set(currentTags);
    score += candidateTags.filter((tag) => currentTagSet.has(tag)).length * 2;
  }

  if (current.category && candidate.category === current.category) {
    score += 1;
  }

  return score;
};

const toTimestamp = (value) => {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

/**
 * Rank published books by how strongly they relate to the current book.
 *
 * Series is the strongest signal, followed by author, shared tags, then
 * category. Candidates with no overlap are dropped so the module never fills
 * space with unrelated books.
 */
export function rankRelatedBooks(current, candidates, limit = DEFAULT_LIMIT) {
  if (!current || !Array.isArray(candidates) || limit <= 0) return [];

  return candidates
    .filter(
      (candidate) =>
        candidate && String(candidate.id) !== String(current.id)
    )
    .map((candidate) => ({
      book: candidate,
      score: scoreCandidate(current, candidate),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        toTimestamp(b.book.published_at) - toTimestamp(a.book.published_at) ||
        Number(b.book.id) - Number(a.book.id)
    )
    .slice(0, limit)
    .map(({ book }) => book);
}
