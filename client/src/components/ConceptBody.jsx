// The shared "explanation" part of every panel card:
// summary, analogy, key-fact chips, extra points and an optional footnote.
export default function ConceptBody({ concept }) {
  return (
    <>
      <p className="summary">{concept.summary}</p>
      <p className="analogy">
        <span className="analogy-icon" aria-hidden="true">💡</span>
        <span>{concept.analogy}</span>
      </p>
      {concept.tags?.length > 0 && (
        <ul className="tags" aria-label="Key facts">
          {concept.tags.map((tag) => <li key={tag}>{tag}</li>)}
        </ul>
      )}
      {concept.points?.length > 0 && (
        <ul className="points">
          {concept.points.map((point) => <li key={point}>{point}</li>)}
        </ul>
      )}
      {concept.footnote && <p className="footnote">{concept.footnote}</p>}
    </>
  );
}
