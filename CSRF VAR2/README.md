# CSRF Vulnerability & Mitigation Demonstration

**Course:** IT-30001 Cyber Security - Web Server Security
**Vulnerability:** Cross-Site Request Forgery (CSRF) **Variant:**
POST-based forged action (auto-submitting form) **Author:** Yash

## Overview

This folder contains a local demonstration of a Cross-Site Request
Forgery (CSRF) attack. It simulates a vulnerable banking application and
an external malicious website. The project demonstrates how an attacker
can leverage an active session cookie to forge a state-changing POST
request, and how to effectively mitigate this using an Anti-CSRF
Synchronizer Token.

## Project Structure

``` text
├── attacker-site/
│   └── index.html       # The malicious "Free iPhone" site with the auto-submitting hidden form
├── views/
│   └── dashboard.ejs    # The bank dashboard containing both unsafe and safe transfer forms
├── server.js            # The Node.js/Express backend for the banking application
└── package.json         # Project dependencies
```

## Prerequisites

-   **Node.js** installed on your machine.
-   A modern web browser.

## Installation & Setup

1.  Clone or download this repository.

2.  Open a terminal in the root directory of this folder.

3.  Install the required Node dependencies:

    Bash

        npm install

## Step-by-Step Workflow

### Phase 1: Environment Startup & Authentication

1.  **Start the Bank Application:** In your terminal, run the following
    command from the root directory:

    Bash

        node server.js

    *The bank is now running on `http://localhost:3000`.*

2.  **Start the Attacker Application:** Open a *second* terminal window,
    navigate into the `attacker-site` folder, and start a local web
    server on port 4000:

    Bash

        cd attacker-site
        npx serve -p 4000

    *The malicious site is now running on `http://localhost:4000`.*

3.  **Establish a Session:** Open your web browser, navigate to
    `http://localhost:3000`, and click **Log In as Yash**. This
    establishes your active session cookie with the bank. Take note of
    your current balance on the dashboard.

### Phase 2: The Attack (Unsafe Mode)

This phase demonstrates how the browser automatically attaches the
session cookie to cross-origin requests, acting as a "confused deputy."

1.  Ensure you are currently logged into the Bank App.
2.  Open a new tab in the same browser and navigate to the attacker's
    site: `http://localhost:4000`.
3.  The page will display a fake "You Won a Free iPhone!" message. In
    the background, a hidden form automatically submits a POST request
    to `http://localhost:3000/transfer/unsafe` targeting a hidden
    iframe.
4.  Return to your Bank App tab and refresh the dashboard. You will see
    that \$9,999 has been deducted from your balance without your
    consent.

### Phase 3: The Mitigation (Safe Mode)

This phase demonstrates how an Anti-CSRF Synchronizer Token blocks the
forged request by verifying the intent of the sender.

1.  Open `attacker-site/index.html` in your code editor.

2.  Change the hidden form's `action` URL to target the protected
    endpoint:

    HTML

    ``` xml
    <form id="steal-money-form" action="http://localhost:3000/transfer/safe" method="POST" target="stealth-frame" style="display: none;">
    ```

3.  Save the file and refresh the attacker site
    (`http://localhost:4000`) in your browser.

4.  The background request fires again, but this time it hits the
    `/transfer/safe` endpoint. Because the attacker's hidden form does
    not (and cannot) contain the dynamically generated `csrfToken`
    secret, the server rejects the action.

5.  Check your Bank App dashboard. Your balance remains unchanged,
    proving the mitigation successfully neutralized the CSRF attack.
