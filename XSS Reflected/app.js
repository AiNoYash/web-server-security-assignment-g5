const express = require("express");
const app = express();

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

app.get("/", (req, res) => {
  res.cookie("session", "abc123secret"); // fake session cookie
  res.send(`
    <h1>Reflected XSS Demo</h1>
    <h3>Vulnerable search</h3>
    <form action="/search" method="GET">
      <input name="q" /><button>Search</button>
    </form>
    <h3>Secure search</h3>
    <form action="/search-secure" method="GET">
      <input name="q" /><button>Search</button>
    </form>
  `);
});

// VULNERABLE
app.get("/search", (req, res) => {
  const q = req.query.q || "";
  res.send(`<h2>Results for: ${q}</h2>`);
});

// FIXED (output encoding)
app.get("/search-secure", (req, res) => {
  const q = req.query.q || "";
  res.send(`<h2>Results for: ${escapeHtml(q)}</h2>`);
});

app.listen(3000, () => console.log("Running on http://localhost:3000"));


// search= <script>alert(document.cookie)</script>
