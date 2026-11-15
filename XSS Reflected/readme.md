# Reflected XSS Vulnerability & Mitigation Demonstration

**Course:** IT-30001 Cyber Security - Web Server Security  
**Vulnerability:** Reflected Cross-Site Scripting (XSS)  
**Variant:** Non-persistent URL-parameter injection with HTML output encoding  
**Author:** Ajay (Roll No. IIT2024037)

## Overview

This folder contains a local demonstration of a Reflected Cross-Site Scripting
(XSS) vulnerability. It simulates a simple search page where the search term
is read from the URL and shown back to the user in the response.

In the vulnerable route, the search term is inserted into the HTML response
without encoding, allowing an attacker to execute JavaScript in the victim's
browser in the context of the application. In the secure route, HTML output
encoding converts dangerous characters into safe HTML entities so the browser
treats the input as text.

## Project Structure

```text
├── app.js          # The Node.js/Express backend with vulnerable and secure routes
├── package.json    # Project metadata and dependencies
├── .gitignore      # Ignores node_modules
├── screenshots/    # Exploit and blocked-attempt screenshots
└── README.md       # This documentation
```

## Prerequisites

- **Node.js** installed on your machine.
- A modern web browser (Chrome or Edge recommended).

## Installation & Setup

1. Clone or download this repository.

2. Open a terminal in the root directory of this folder.

3. Install the required Node dependencies:

   ```bash
   npm install
   ```

## Step-by-Step Workflow

### Phase 1: Start the Application

1. Start the server:

   ```bash
   node app.js
   ```

2. Open `http://localhost:3000` in your browser.

   The home page shows two search forms: **Vulnerable search** (`/search`)
   and **Secure search** (`/search-secure`). The server also sets a simulated
   `session` cookie (`session=abc123secret`) to demonstrate why XSS can
   expose session data. Open the home page first so the cookie exists.

### Phase 2: Demonstrate the Reflected XSS Attack

1. Use the **Vulnerable search** box and first search for `hello`. The page
   shows `Results for: hello`, which is the normal behaviour.

2. Enter the following payload in the search box:

   ```html
   <script>alert(document.cookie)</script>
   ```

   Alternatively, open the crafted URL directly, as a victim would after
   clicking a malicious link:

   ```text
   http://localhost:3000/search?q=<script>alert(document.cookie)</script>
   ```

3. The server reads the `q` parameter and writes it directly into the HTML
   response. Because the input is not encoded, the browser interprets the
   payload as markup and executes the script.

4. An alert displays the simulated session cookie
   (`session=abc123secret`). Use **View Page Source** to confirm that the
   `<script>` tag was inserted unchanged. Nothing is stored on the server:
   the payload exists only in the request and is reflected in the response.

### Phase 3: Demonstrate the Mitigation

1. Go back to the home page and use the **Secure search** box, or open:

   ```text
   http://localhost:3000/search-secure?q=<script>alert(document.cookie)</script>
   ```

2. The `/search-secure` route applies `escapeHtml()` to the input before
   inserting it into the HTML response. Characters such as `<`, `>`, `"`,
   `'` and `&` are converted to safe HTML entities.

3. Submit the same payload. No alert appears, and the payload is displayed
   as visible text. View Page Source shows
   `&lt;script&gt;alert(document.cookie)&lt;/script&gt;`.

4. Take a screenshot of this blocked attempt and save it in the
   `screenshots/` folder.

## Vulnerable Code vs Fixed Code

**Vulnerable (`/search`):**

```javascript
app.get("/search", (req, res) => {
  const q = req.query.q || "";
  res.send(`<h2>Results for: ${q}</h2>`);   // raw input in HTML
});
```

**Fixed (`/search-secure`):**

```javascript
app.get("/search-secure", (req, res) => {
  const q = req.query.q || "";
  res.send(`<h2>Results for: ${escapeHtml(q)}</h2>`);   // encoded output
});
```

## Security Concept

Reflected XSS occurs when an application takes untrusted input from a
request and includes it in the response page without appropriate encoding.
The attacker delivers the payload through a crafted link, so only users who
open that link are affected.

**Root cause:** User input is placed into the HTML response without output
encoding, so the browser cannot distinguish the developer's markup from
attacker-supplied input and executes it as code.

The mitigation implemented here is HTML output encoding. Other mitigations
(theory):

- **Context-aware output encoding:** Encode data according to where it is
  placed (HTML body, attribute, JavaScript, URL).
- **Framework auto-escaping:** Template engines such as Jinja2, React and
  Angular escape output by default.
- **Sanitiser for rich HTML:** Libraries such as DOMPurify remove dangerous
  tags and attributes while keeping safe formatting.
- **Content Security Policy (CSP):** A response header that restricts script
  sources, blocking injected inline scripts as a second layer of defence.
- **HttpOnly cookies:** Stops JavaScript from reading the cookie, limiting
  session theft, but does not prevent XSS itself.
- **Safe DOM sinks:** Use `textContent` instead of `innerHTML` or
  `document.write` in client-side code.

## Ownership

| Member name | Roll number | Category | Variant implemented |
|---|---|---|---|
| Ajay | IIT2024037 | Cross-Site Scripting (XSS) | Reflected XSS |