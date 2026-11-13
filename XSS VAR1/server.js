import express from "express"
const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));

// Server-side persistent storage
let comments = [
    {
        id: 1,
        author: "Alice (Verified Buyer)",
        text: "Great product! Shipped to campus right on time.",
        timestamp: "10:15 AM"
    }
];

let isMitigated = false;

function encodeHTML(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

app.get('/', (req, res) => {
    // simulated session cookie
    res.setHeader('Set-Cookie', 'session_id=secA_auth_token_987654321; Path=/');

    const commentsHTML = comments.map(c => {
        const safeAuthor = isMitigated ? encodeHTML(c.author) : c.author;
        const safeText = isMitigated ? encodeHTML(c.text) : c.text;

        return `
            <div class="comment-card">
                <div class="comment-header">
                    <strong>${safeAuthor}</strong>
                    <span class="time">${c.timestamp}</span>
                </div>
                <div class="comment-body">${safeText}</div>
            </div>
        `;
    }).join('');

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Stored XSS Demo</title>
            <style>
                body { font-family: system-ui, sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1rem; background: #f8fafc; color: #0f172a; }
                .banner { padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
                .vuln { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }
                .safe { background: #dcfce7; border: 1px solid #22c55e; color: #166534; }
                .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 1.5rem; }
                input, textarea { width: 100%; padding: 0.6rem; margin-top: 0.4rem; margin-bottom: 1rem; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; font-family: inherit; }
                button { background: #2563eb; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 4px; cursor: pointer; font-weight: 600; }
                button.secondary { background: #475569; }
                button.danger { background: #dc2626; }
                .comment-card { background: white; padding: 1rem; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 0.75rem; }
                .comment-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; }
                .time { color: #64748b; }
                code { background: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.85rem; }
            </style>
        </head>
        <body>
            <h2>Campus Store — Product Reviews (Stored XSS Demo)</h2>
            
            <div class="banner ${isMitigated ? "safe" : "vuln"}">
                <div>
                    <strong>Current Mode: ${isMitigated ? "MITIGATED (HTML Output Encoding Active)" : "VULNERABLE (Raw Unencoded Output)"}</strong>
                </div>
                <form method="POST" action="/toggle-mode" style="margin:0;">
                    <button type="submit" class="secondary">Switch to ${isMitigated ? "Vulnerable" : "Mitigated"} Mode</button>
                </form>
            </div>

            <div class="card">
                <h3>Leave a Review</h3>
                <form method="POST" action="/comments">
                    <label>Your Name</label>
                    <input type="text" name="author" required placeholder="e.g., Attacker" />
                    <label>Review Comment</label>
                    <textarea name="text" rows="3" required placeholder="Enter review or XSS payload..."></textarea>
                    <button type="submit">Post Review</button>
                </form>
                <div style="margin-top: 0.75rem; font-size: 0.85rem; color: #475569;">
                    <strong>Test Payload:</strong> <code>&lt;img src="x" onerror="alert('Stored XSS! Stolen Cookie: ' + document.cookie)"&gt;</code>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="margin: 0;">Customer Reviews (${comments.length})</h3>
                <form method="POST" action="/reset" style="margin:0;">
                    <button type="submit" class="danger">Reset DB</button>
                </form>
            </div>

            ${commentsHTML}
        </body>
        </html>
    `);
});

app.post('/comments', (req, res) => {
    const { author, text } = req.body;
    comments.push({
        id: comments.length + 1,
        author: author || "Anonymous",
        text: text || "",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    res.redirect('/');
});

app.post('/toggle-mode', (req, res) => {
    isMitigated = !isMitigated;
    res.redirect('/');
});

app.post('/reset', (req, res) => {
    comments = [comments[0]];
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});