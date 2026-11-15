const isWindows = navigator.userAgent.toLowerCase().includes("windows");
document.getElementById("payload-hint").textContent = isWindows
  ? "Local Windows test payload: 127.0.0.1 & whoami"
  : "Local Linux/macOS test payload: 127.0.0.1; whoami";

async function submit(url, inputId, outputId) {
  const output = document.getElementById(outputId);
  output.textContent = "Running…";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip: document.getElementById(inputId).value })
    });
    const data = await response.json();
    output.textContent = data.error || data.output || "(No output returned)";
    if (data.command) output.textContent = `Executed command:\n${data.command}\n\n${output.textContent}`;
    if (!response.ok) output.textContent = `HTTP ${response.status}\n${output.textContent}`;
  } catch (error) {
    output.textContent = `Request failed: ${error.message}`;
  }
}

document.getElementById("run-vulnerable").addEventListener("click", () =>
  submit("/api/vulnerable/ping", "vuln-ip", "vuln-output"));
document.getElementById("run-secure").addEventListener("click", () =>
  submit("/api/secure/ping", "secure-ip", "secure-output"));
