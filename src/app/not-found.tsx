import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap prose" style={{ padding: "48px 0" }}>
      <p className="kicker">404</p>
      <h1>TECHPODIO</h1>
      <p>Esa página no existe. / That page does not exist.</p>
      <Link className="btn" href="/es">Inicio</Link>
    </div>
  );
}
