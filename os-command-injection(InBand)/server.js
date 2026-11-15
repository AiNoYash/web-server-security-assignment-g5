const express = require("express");
const path = require("path");
const os = require("os");
const net = require("net");
const { exec } = require("child_process");
const { execFile } = require("child_process");

const app = express();
const PORT = 3000;

// Safety: this educational server listens only on localhost.
app.listen(PORT, "127.0.0.1", () => {
  console.log(`OS Command Injection Lab running at http://127.0.0.1:${PORT}`);
  console.log("Local-only lab. Do not expose this server to a network.");
});

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

function pingArguments(ip) {
  // Windows uses -n; Linux/macOS use -c.
  return process.platform === "win32" ? ["-n", "1", ip] : ["-c", "1", ip];
}

/*
  INTENTIONALLY VULNERABLE ROUTE
 */
app.post("/api/vulnerable/ping", (req, res) => {
  const ip = String(req.body.ip ?? "");
  const flag = process.platform === "win32" ? "-n" : "-c";
  const command = `ping ${flag} 1 ${ip}`;

  exec(command, { timeout: 5000, windowsHide: true }, (error, stdout, stderr) => {
    res.json({
      mode: "vulnerable",
      command,
      output: [stdout, stderr, error && !stdout && !stderr ? error.message : ""]
        .filter(Boolean).join("\n").trim()
    });
  });
});

/*
  SECURED ROUTE:
 */
app.post("/api/secure/ping", (req, res) => {
  const ip = String(req.body.ip ?? "").trim();

  if (net.isIP(ip) !== 4) {
    return res.status(400).json({
      mode: "secured",
      error: "Rejected: enter a valid IPv4 address only."
    });
  }

  execFile("ping", pingArguments(ip), {
    timeout: 5000,
    windowsHide: true
  }, (error, stdout, stderr) => {
    res.json({
      mode: "secured",
      output: [stdout, stderr, error && !stdout && !stderr ? error.message : ""]
        .filter(Boolean).join("\n").trim()
    });
  });
});
