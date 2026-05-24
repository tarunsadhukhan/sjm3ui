import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#f5f7fa",
          color: "#0c3c60",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "5rem", fontWeight: 700, lineHeight: 1 }}>
            404
          </div>
          <div style={{ fontSize: "1.5rem", marginTop: "0.5rem" }}>
            Not Found
          </div>
          <div
            style={{
              marginTop: "1rem",
              color: "#5f6c7b",
              fontSize: "0.95rem",
              maxWidth: 420,
            }}
          >
            The subdomain or page you requested does not exist.
          </div>
          <Link
            href="/"
            style={{
              display: "inline-block",
              marginTop: "1.5rem",
              padding: "0.5rem 1.25rem",
              borderRadius: 6,
              background: "#3ea6da",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Go Home
          </Link>
        </div>
      </body>
    </html>
  );
}
