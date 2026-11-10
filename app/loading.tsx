export default function Loading() {
  return (
    <main className="loading-page" aria-busy="true" aria-label="Loading page">
      <div className="loading-skeleton loading-heading" />
      <div className="loading-skeleton loading-copy" />
      <div className="loading-skeleton loading-copy loading-copy-short" />
      <div className="loading-skeleton loading-card" />
    </main>
  );
}
