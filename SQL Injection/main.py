import os
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Base directory and SQLite database path
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "app.db"
INDEX_HTML_PATH = BASE_DIR / "index.html"
STATIC_DIR = BASE_DIR / "static"
STATIC_DIR.mkdir(exist_ok=True)


def get_db_connection() -> sqlite3.Connection:
    """Creates a new SQLite database connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(force_reset: bool = False) -> None:
    """Initializes the database schema and seeds default laboratory users if empty or reset."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if force_reset:
            cursor.execute("DROP TABLE IF EXISTS users")

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL
            )
            """
        )

        cursor.execute("SELECT COUNT(*) FROM users")
        count = cursor.fetchone()[0]

        if count == 0:
            # Seed default accounts required for the web security lab
            seed_users = [
                ("admin", "Sup3rS3cr3tAdmin!2026", "admin"),
                ("alice", "alice123", "user"),
            ]
            cursor.executemany(
                "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                seed_users,
            )
            conn.commit()
    finally:
        conn.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler to ensure database is seeded on startup."""
    init_db()
    yield


app = FastAPI(
    title="SQL Injection Demo: Authentication Bypass & Parameterized Mitigation",
    description="Minimal, self-contained educational module demonstrating SQLi auth bypass and parameterized query defense.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for convenience
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static assets directory for modular CSS and JS
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class LoginRequest(BaseModel):
    username: str = ""
    password: str = ""


@app.get("/", response_class=HTMLResponse)
async def serve_dashboard():
    """Serves the interactive laboratory dashboard."""
    if not INDEX_HTML_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="index.html not found. Please ensure index.html exists in the module directory.",
        )
    return HTMLResponse(
        content=INDEX_HTML_PATH.read_text(encoding="utf-8"),
        status_code=status.HTTP_200_OK,
    )


@app.post("/login/vulnerable")
async def login_vulnerable(payload: LoginRequest):
    """
    VULNERABLE IMPLEMENTATION:
    Constructs the SQL SELECT query using direct Python f-string concatenation.
    This allows malicious user input to break out of string literals and alter
    the Boolean logic or structure of the SQL query.
    """
    # Flawed direct string interpolation
    query = (
        f"SELECT id, username, role FROM users "
        f"WHERE username = '{payload.username}' AND password = '{payload.password}'"
    )

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query)
        row = cursor.fetchone()

        if row:
            user_data = {
                "id": row["id"],
                "username": row["username"],
                "role": row["role"],
            }
            return {
                "authenticated": True,
                "user": user_data,
                "query_executed": query,
                "mode": "vulnerable",
                "message": f"Successfully authenticated as '{user_data['username']}' with role '{user_data['role']}'.",
            }
        else:
            return {
                "authenticated": False,
                "user": None,
                "query_executed": query,
                "mode": "vulnerable",
                "message": "Authentication failed. No user record matched the resulting query.",
            }
    except sqlite3.Error as e:
        # Wrap database errors safely so malformed SQL syntax returns a clean HTTP 400 JSON response
        # with the SQLite error message, illustrating why raw errors leak backend details.
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "authenticated": False,
                "user": None,
                "query_executed": query,
                "mode": "vulnerable",
                "error": f"SQLite Syntax / Execution Error: {str(e)}",
                "message": "Malformed SQL statement caused a database exception. This demonstrates error-based SQL leakage.",
            },
        )
    finally:
        conn.close()


@app.post("/login/secure")
async def login_secure(payload: LoginRequest):
    """
    MITIGATED IMPLEMENTATION:
    Uses parameterized queries with SQLite '?' placeholders.
    The database engine compiles and plans the query structure before values are bound.
    User inputs are strictly treated as literal data, completely preventing injection.
    """
    query_template = "SELECT id, username, role FROM users WHERE username = ? AND password = ?"
    bound_params = [payload.username, payload.password]

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query_template, (payload.username, payload.password))
        row = cursor.fetchone()

        if row:
            user_data = {
                "id": row["id"],
                "username": row["username"],
                "role": row["role"],
            }
            return {
                "authenticated": True,
                "user": user_data,
                "query_executed": {
                    "template": query_template,
                    "bound_parameters": bound_params,
                },
                "mode": "secure",
                "message": f"Successfully authenticated as '{user_data['username']}' with role '{user_data['role']}'.",
            }
        else:
            return {
                "authenticated": False,
                "user": None,
                "query_executed": {
                    "template": query_template,
                    "bound_parameters": bound_params,
                },
                "mode": "secure",
                "message": "Authentication failed. User input was treated strictly as literal data; no injection occurred.",
            }
    except sqlite3.Error as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "authenticated": False,
                "user": None,
                "query_executed": {
                    "template": query_template,
                    "bound_parameters": bound_params,
                },
                "mode": "secure",
                "error": f"SQLite Error: {str(e)}",
                "message": "A database error occurred.",
            },
        )
    finally:
        conn.close()


@app.post("/reset")
async def reset_database():
    """Resets the users table and restores the default seeded accounts."""
    init_db(force_reset=True)
    return {
        "status": "success",
        "message": "Database reset successfully. Default accounts ('admin' and 'alice') restored.",
        "seeded_users": [
            {"username": "admin", "role": "admin"},
            {"username": "alice", "role": "user"},
        ],
    }


@app.get("/api/users")
async def list_users():
    """Helper endpoint to view seeded accounts without exposing full plaintext secrets."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, role FROM users ORDER BY id ASC")
        rows = cursor.fetchall()
        return [
            {"id": row["id"], "username": row["username"], "role": row["role"]}
            for row in rows
        ]
    finally:
        conn.close()

