"use client";

export default function LocaleError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="wrap prose" style={{ padding: "40px 0" }}>
      <h1>TECHPODIO</h1>
      <p>No hemos podido cargar esta página.</p>
      <button className="btn" type="button" onClick={reset}>Reintentar</button>
    </div>
  );
}
