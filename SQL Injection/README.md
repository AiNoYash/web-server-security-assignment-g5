# Web Security Laboratory — SQL Injection (Variant 1: Authentication Bypass)

A self-contained, minimal educational web application built with **Python 3**, **FastAPI**, and **SQLite3** demonstrating **SQL Injection (Variant 1: Authentication Bypass)** through unsanitized string interpolation and its definitive mitigation via **Parameterized Queries (Prepared Statements)**.

---

## Table 3: Ownership Declaration

| Member Name | Roll Number | Category | Variant Implemented |
| :--- | :--- | :--- | :--- |
| **Tanishq Garg** | **IIT2024038** | **SQL Injection** | **Variant 1: Authentication Bypass** |
| Yashkumar Kapadiya | IIT2024041 | CSRF | POST-based forged action (auto-submitting form) |
| Abhijeet Jain | IIT2024044 | XSS | Stored XSS |
| Ajay Kathar | IIT2024037 | XSS | Reflected XSS |
| Udaynoor Singh | IIT2024006 | OS Command Injection | In-band |

---

## 1. Project Overview & Architecture

This laboratory module provides a live side-by-side comparison between an insecure and a secure backend authentication endpoint:

- **`POST /login/vulnerable`**: Flawed authentication logic constructing raw SQL statements using direct Python f-string interpolation (`f"SELECT ... '{username}' ..."`).
- **`POST /login/secure`**: Hardened authentication logic using SQLite parameterized queries with `?` place-markers where code and data planes remain strictly separated.
- **`POST /reset`**: Utility endpoint that wipes and restores the seeded SQLite laboratory accounts.
- **`GET /`**: Single-Page Dashboard featuring dual submission forms, interactive viva attack scenario presets, and a **Live Execution Inspector** revealing exact queries executed by the SQLite engine in real-time.

### Modular Project Layout
```
sqli-auth-bypass-module/
├── main.py                  # FastAPI server with vulnerable & secure routes + static mounting
├── index.html               # Clean, semantic, modular HTML markup (~200 lines)
├── requirements.txt         # Minimal dependencies: fastapi, uvicorn
├── test_app.py              # Automated verification test suite
├── app.db                   # SQLite database (auto-created and seeded on startup)
└── static/                  # Modular frontend static assets
    ├── css/
    │   ├── variables.css    # Color tokens, typography, borders, shadows
    │   ├── layout.css       # Container, grid systems, header, layout structure
    │   ├── components.css   # Cards, form inputs, buttons, chips, badges, toasts
    │   ├── inspector.css    # Execution inspector panel & SQL syntax highlighter
    │   └── style.css        # Bundles all modular stylesheets via CSS @import
    └── js/
        ├── api.js           # API service module (login, reset, fetch users)
        ├── inspector.js     # Inspector UI renderer & SQL syntax formatting
        └── app.js           # Main coordinator (event listeners, presets, dual testing)
```

### Seed Database Accounts (`app.db`)
On application startup, a local SQLite database (`app.db`) is automatically initialized and seeded if empty:

| User ID | Username | Password | Role |
| :--- | :--- | :--- | :--- |
| `1` | `admin` | `Sup3rS3cr3tAdmin!2026` | `admin` |
| `2` | `alice` | `alice123` | `user` |

---

## 2. Quick Setup & Execution

### Prerequisites
- Python 3.9+ (tested on Python 3.10, 3.11, 3.12, 3.13)
- `pip` package manager

### Installation Steps

1. **Navigate to the module directory:**
   ```bash
   cd sqli-auth-bypass-module
   ```

2. **Install minimal dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   *(Dependencies: `fastapi` and `uvicorn`. Standard library `sqlite3` is used for zero external database driver overhead).*

3. **Launch the server with live reload:**
   ```bash
   uvicorn main:app --reload
   ```

4. **Access the Laboratory Dashboard:**
   Open your browser and navigate to:
   ```
   http://127.0.0.1:8000/
   ```

---

## 3. Attack Demonstration & Live Viva Walkthrough

### Scenario A: Legitimate Authentication (Baseline)
- **Input:**
  - Username: `alice`
  - Password: `alice123`
- **Result on Both Endpoints:**
  - `POST /login/vulnerable` → `ACCESS GRANTED` (Role: `user`)
  - `POST /login/secure` → `ACCESS GRANTED` (Role: `user`)

---

### Scenario B: Authentication Bypass via Comment Truncation (`admin' --`)
- **Objective:** Log into the administrator account without knowing the password.
- **Input:**
  - Username: `admin' --`
  - Password: `any_arbitrary_password`
- **Vulnerable Endpoint (`POST /login/vulnerable`):**
  - **Constructed SQL:**
    ```sql
    SELECT id, username, role FROM users WHERE username = 'admin' --' AND password = 'any_arbitrary_password'
    ```
  - **Mechanism:** The single quote (`'`) terminates the string literal for `username`. The SQLite comment syntax (`--`) instructs the parser to ignore all remaining text on that line, discarding the password check completely:
    $$\text{Effective Condition: } \text{WHERE username = 'admin'}$$
  - **Outcome:** **ACCESS GRANTED as `admin` (Role: `admin`)**. Authentication completely bypassed.
- **Mitigated Endpoint (`POST /login/secure`):**
  - **Query Template:** `SELECT id, username, role FROM users WHERE username = ? AND password = ?`
  - **Bound Parameters:** `["admin' --", "any_arbitrary_password"]`
  - **Outcome:** **ACCESS DENIED**. The database searches for an exact literal username matching the string `admin' --`, which does not exist.

---

### Scenario C: Universal Tautology Bypass (`' OR '1'='1`)
- **Objective:** Force the `WHERE` clause to evaluate to `TRUE` for every record in the table.
- **Input:**
  - Username: `' OR '1'='1`
  - Password: `' OR '1'='1`
- **Vulnerable Endpoint (`POST /login/vulnerable`):**
  - **Constructed SQL:**
    ```sql
    SELECT id, username, role FROM users WHERE username = '' OR '1'='1' AND password = '' OR '1'='1'
    ```
  - **Mechanism:** The Boolean logic condition evaluates to:
    $$\text{FALSE} \lor (\text{TRUE} \land \text{FALSE}) \lor \text{TRUE} \equiv \text{TRUE}$$
    Since every row in `users` satisfies the predicate, SQLite returns the first row matched in table order (`id = 1`, which is `admin`).
  - **Outcome:** **ACCESS GRANTED as `admin` (Role: `admin`)**.
- **Mitigated Endpoint (`POST /login/secure`):**
  - **Bound Parameters:** `["' OR '1'='1", "' OR '1'='1"]`
  - **Outcome:** **ACCESS DENIED**. Inputs are treated strictly as scalar strings.

---

### Scenario D: Error-Based Syntax Leakage (`admin'`)
- **Objective:** Demonstrate how malformed SQL payloads trigger database errors and how unhandled backend exceptions leak database engine details.
- **Input:**
  - Username: `admin'`
  - Password: `test`
- **Vulnerable Endpoint:**
  - **Constructed SQL:**
    ```sql
    SELECT id, username, role FROM users WHERE username = 'admin'' AND password = 'test'
    ```
  - **HTTP Status:** `400 Bad Request`
  - **Response Payload:**
    ```json
    {
      "authenticated": false,
      "user": null,
      "query_executed": "SELECT id, username, role FROM users WHERE username = 'admin'' AND password = 'test'",
      "mode": "vulnerable",
      "error": "SQLite Syntax / Execution Error: unrecognized token: \"' AND password = 'test'\""
    }
    ```
  - **Viva Note:** Revealing raw database error strings to clients is an information leakage weakness (CWE-209), allowing an attacker to deduce that SQLite is the backend engine and calibrate further SQL injection payloads.

---

## 4. Viva Reference Guide

### 1. Root Cause
- **Code Injection into the SQL Grammar:** The root cause is the conflation of **executable SQL control instructions** and **untrusted user data**.
- When an application uses direct string concatenation (such as Python f-strings) to compose dynamic SQL queries, user input is injected directly into the lexical analyzer stream of the database engine.
- Special metacharacters (primarily the single quote `'` and SQL comment tokens `--` or `/* */`) enable user-supplied data to escape the literal string context and manipulate the Abstract Syntax Tree (AST) of the query.

---

### 2. Implemented Mitigation: Parameterized Queries
- **Separation of Code and Data Planes:** Parameterized queries (prepared statements) solve SQL injection at the architectural level by enforcing a two-phase execution lifecycle:
  1. **Compilation Phase:** The database engine parses, analyzes, and compiles the SQL statement containing parameter place-markers (`?`) into an immutable execution plan *before* receiving any user input.
  2. **Binding Phase:** The user-supplied inputs are transmitted across the database protocol strictly as typed literal values.
- Even if the input contains SQL keywords (`OR`, `AND`, `UNION`, `DROP`) or delimiters (`'`, `--`, `;`), the engine treats them solely as raw byte/character sequences. The syntax tree of the compiled statement cannot be modified by the values bound to it.

```python
# Insecure: Code and data are intermixed in a single string
query = f"SELECT * FROM users WHERE username = '{username}'"

# Secure: Code is fixed; data is bound as an isolated literal tuple
cursor.execute("SELECT * FROM users WHERE username = ? AND password = ?", (username, password))
```

---

### 3. Other Mitigations (Theory & Defense-in-Depth)

While parameterized queries represent the primary, indispensable defense against SQL injection, production systems must implement multiple layers of defense-in-depth:

#### A. Allow-List Input Validation
- **Concept:** Enforce strict validation rules (data type, character sets, length, and format) on incoming data *before* it reaches data-access layers.
- **Example:** A username field should only allow alphanumeric characters and underscores (`^[a-zA-Z0-9_]{3,20}$`).
- **Role in Defense:** Input validation rejects obvious attack strings early and limits unexpected character encoding anomalies. However, it is **never a replacement** for parameterization, as legitimate data may legitimately include apostrophes (e.g., names like `O'Connor`).

#### B. Principle of Least Privilege (Database Level)
- **Concept:** The web application should connect to the database engine using an account that possesses only the minimal privileges strictly necessary for its intended tasks.
- **Application:**
  - The web application user should not possess database administrative privileges (`SUPERUSER`, `DBA`, `GRANT OPTION`).
  - Read-only operations should query via accounts granted only `SELECT` privileges.
  - Drop table (`DROP`), alter schema (`ALTER`), and file read/write (`LOAD DATA INFILE`, `xp_cmdshell`) privileges must be strictly revoked from application-tier accounts to contain blast radius in the event of an injection vulnerability.

#### C. Safe Error Handling & Masking (Preventing Information Leakage)
- **Concept:** Application tiers must never expose raw database error messages, stack traces, or schema information to client interfaces or untrusted networks.
- **Application:**
  - Catch all database exceptions (`sqlite3.Error`, `psycopg2.Error`, etc.) within backend service handlers.
  - Log diagnostic details securely to internal server logs for debugging.
  - Return generic, uniform error responses to the client (e.g., `"Invalid username or password"` or `"An internal processing error occurred"`), denying attackers the diagnostic feedback needed for error-based or fingerprinting reconnaissance (CWE-209).

---

## 5. API Reference Summary

| Method | Endpoint | Description | Request Body | Response Highlights |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Serves dashboard UI | None | `HTMLResponse` |
| `POST` | `/login/vulnerable` | Unsanitized f-string login | `{"username": "...", "password": "..."}` | `authenticated`, `user`, `query_executed`, `mode` |
| `POST` | `/login/secure` | Parameterized query login | `{"username": "...", "password": "..."}` | `authenticated`, `user`, `query_executed.template`, `bound_parameters` |
| `POST` | `/reset` | Restores default database seed | None | Status message & restored accounts |
| `GET` | `/api/users` | Lists current database records | None | Array of `{id, username, role}` |

---

## 6. Verification Checklist for Lab Viva

- [x] Self-contained in `sqli-auth-bypass-module` folder.
- [x] Minimal dependencies (`fastapi`, `uvicorn`, built-in `sqlite3`).
- [x] Pre-seeded accounts: `admin` (`Sup3rS3cr3tAdmin!2026`, role: `admin`) and `alice` (`alice123`, role: `user`).
- [x] Separate endpoints: `/login/vulnerable` and `/login/secure`.
- [x] Database errors safely wrapped (HTTP 400 with SQLite message) without crashing server.
- [x] Clean single-page dashboard at `GET /` with live execution inspector.
- [x] Reset database button at `POST /reset`.
- [x] Table 3 Ownership Declaration pre-filled.
- [x] Viva reference guide detailing Root Cause, Implemented Mitigation, and Defense-in-Depth.

