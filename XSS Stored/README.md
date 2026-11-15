# Stored XSS Vulnerability & Mitigation Demonstration

**Course:** IT-30001 Cyber Security - Web Server Security  
**Vulnerability:** Stored Cross-Site Scripting (XSS)  
**Variant:** Persistent user-input injection with HTML output encoding  
**Author:** Abhijeet Jain

## Overview

This folder contains a local demonstration of a Stored Cross-Site Scripting
(XSS) vulnerability. It simulates a campus store product-review page where
user-supplied names and comments are stored by the server and rendered for
every visitor.

In Vulnerable Mode, the stored input is inserted into the HTML response
without encoding, allowing an attacker to execute JavaScript in the context
of the application. In Mitigated Mode, context-aware HTML output encoding
converts dangerous characters into safe HTML entities so the browser treats
the input as text.

## Project Structure

```text
├── server.js       # The Node.js/Express backend and review page
├── package.json    # Project metadata and dependencies
└── README.md       # This documentation
```

## Prerequisites

- **Node.js** installed on your machine.
- A modern web browser.

## Installation & Setup

1. Clone or download this repository.

2. Open a terminal in the root directory of this folder.

3. Install the required Node dependencies:

   ```bash
   npm install
   ```

## Step-by-Step Workflow

### Phase 1: Start the Application

1. Start the server from the `XSS VAR1` directory:

   ```bash
   npm start
   ```

2. Open `http://localhost:3000` in your browser.

   The page displays the Campus Store product-review application and starts
   in **Vulnerable Mode**. The server also sets a simulated
   `session_id` cookie to demonstrate why XSS can expose application data.

### Phase 2: Demonstrate the Stored XSS Attack

1. Confirm that the banner shows **VULNERABLE (Raw Unencoded Output)**.

2. Submit a review using the following payload in the **Review Comment**
   field:

   ```html
   <img src="x" onerror="alert('Stored XSS! Stolen Cookie: ' + document.cookie)">
   ```

3. Click **Post Review**.

4. The review is stored in the server-side `comments` array and the page is
   rendered again. Because the input is written directly into the HTML,
   the browser interprets the payload as markup and executes its event
   handler.

5. An alert displays the message and the simulated session cookie. Refreshing
   the page demonstrates the persistent nature of Stored XSS: the payload
   executes again because it remains in the stored review.

### Phase 3: Demonstrate the Mitigation

1. Click **Switch to Mitigated Mode**.

2. The server now applies `encodeHTML()` to each stored author and comment
   before inserting them into the HTML response. Characters such as `<`,
   `>`, `"`, and `'` are converted to safe HTML entities.

3. Submit the same payload again, or refresh the page containing the
   original payload. In Mitigated Mode, the payload appears as visible text
   and is not executed.

4. The green banner confirms that **HTML Output Encoding** is active,
   demonstrating that the stored input is treated as data rather than
   executable HTML.

### Phase 4: Reset the Demonstration

Click **Reset DB** to remove all test reviews and restore the initial
verified-buyer review. The page returns to its initial state while preserving
the currently selected mode.

## Security Concept

Stored XSS occurs when an application saves untrusted input and later
includes it in a page without appropriate encoding. Every user viewing that
page can be affected, even if they did not submit the malicious input.

The primary mitigation shown here is context-aware HTML output encoding.
Applications should also validate input, avoid unsafe HTML construction, and
use a defense-in-depth Content Security Policy where appropriate.