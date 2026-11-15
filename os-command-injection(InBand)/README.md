# OS Command Injection Lab — In-band Variant

A local-only educational demonstration for the Web Server Security assignment.

## Chosen variant

**OS command injection — Variant 1: In-band (command output returned).**

The vulnerable endpoint uses `exec()` and concatenates user input into a shell command. The secured endpoint validates an IPv4 address and uses `execFile()` with a separate argument array.

## Requirements

- Node.js 18 or newer
- npm
- Windows, Linux, or macOS

## Run

```bash
npm install
npm start
```

Open **http://127.0.0.1:3000** in your browser.

Stop the server with `Ctrl+C`.

## Demonstration

1. In the vulnerable panel, use `127.0.0.1` first to show normal ping output.
2. For a local Windows server, use `127.0.0.1 & whoami`.
3. For a local Linux/macOS server, use `127.0.0.1; whoami`.
4. Show that the response includes the output of the extra command (for example, the current OS username).
5. Copy the exact same test string into the secured panel.
6. Show that it is rejected as an invalid IPv4 address.

The command-separator example is platform-specific. The app's hint shows the expected example based on the browser platform; if the browser and server run on different operating systems, use the server's operating system.

## Code locations

- `server.js` — vulnerable and secured API routes.
- `public/index.html` — user interface.
- `public/app.js` — browser requests.
- `public/styles.css` — styling.

## Root cause

The vulnerable route concatenates untrusted user input into a command string and passes it to `exec()`, which invokes a shell. Shell metacharacters in the input can therefore change the command being executed.

## Implemented mitigation

The secured route:
1. Uses `net.isIP()` to allow only valid IPv4 input.
2. Uses `execFile()` with a program name and argument array, avoiding shell interpretation.

## Other mitigations to explain in the viva

- **Avoid the shell:** use APIs that invoke a program directly rather than passing a command string to a shell.
- **Argument-vector execution:** pass executable arguments separately instead of concatenating them into one string.
- **Allow-list validation:** accept only expected input formats and values.
- **Least privilege:** run the application with only the operating-system permissions it needs.

## Safety

The server binds to `127.0.0.1` only. Keep it local. Do not deploy this intentionally vulnerable application, expose it to a network, or test systems you do not own. The vulnerable route is included solely for the controlled coursework demonstration.
