const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto'); // Built-in Node module for generating random tokens

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'assignment-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { sameSite: false, secure: false } // Still unsafe to allow cross-port testing
}));

let userBalance = 50000;

app.get('/', (req, res) => {
    res.send(`
        <h1>Welcome to Vulnerable Bank</h1>
        <form action="/login" method="POST"><button type="submit">Log In as Yash</button></form>
    `);
});

app.post('/login', (req, res) => {
    req.session.user = 'Yash';
    res.redirect('/dashboard');
});


app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.status(401).send("Unauthorized.");
    
    // Generate a new Anti-CSRF token if one doesn't exist for this session
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    
    res.render('dashboard', { 
        user: req.session.user, 
        balance: userBalance,
        csrfToken: req.session.csrfToken // Pass the token to the frontend
    });
});

// The UNSAFE Transfer (Still here for your demonstration)
app.post('/transfer/unsafe', (req, res) => {
    if (!req.session.user) return res.status(401).send("Unauthorized.");
    userBalance -= parseInt(req.body.amount);
    res.send(`<h2>Transfer Successful!</h2><a href="/dashboard">Back to Dashboard</a>`);
});

// The SAFE Transfer Endpoint (Protected by Anti-CSRF Token)
app.post('/transfer/safe', (req, res) => {
    if (!req.session.user) return res.status(401).send("Unauthorized.");

    // The Defense: Verify the token submitted in the form matches the one in the session
    const submittedToken = req.body.csrfToken;
    const expectedToken = req.session.csrfToken;

    if (!submittedToken || submittedToken !== expectedToken) {
        // If the token is missing or wrong, reject the request!
        return res.status(403).send(`
            <h2 style="color: red;">CSRF Attack Blocked!</h2>
            <p>Invalid or missing Anti-CSRF token.</p>
            <a href="/dashboard">Back to Dashboard</a>
        `);
    }

    // If the token matches, proceed with the transfer
    userBalance -= parseInt(req.body.amount);
    res.send(`<h2>Safe Transfer Successful!</h2><a href="/dashboard">Back to Dashboard</a>`);
});

app.listen(3000, () => console.log('Bank App running at http://localhost:3000'));