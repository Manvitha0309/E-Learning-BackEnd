// Import required modules
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

// Initialize the Express application
const app = express();
const port = 3000;

// Middleware to enable CORS and parse JSON bodies
app.use(cors());
app.use(express.json());

// In-memory "database" to store user data
const users = [];

// In-memory store for OTPs
const otps = {};

// Nodemailer transporter setup for sending emails
// You need to replace these with your actual Gmail account and App Password
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'mk7080252@gmail.com', // Replace with your Gmail address
        pass: 'nnwk jyzk yhrk asoq'     // Replace with your 16-character App Password
    }
});

// API endpoint for user sign-up
app.post('/api/signup', (req, res) => {
    const { name, email, password } = req.body;

    // Check if user already exists
    if (users.find(user => user.email === email)) {
        return res.status(409).json({ message: 'User with that email already exists.' });
    }

    // Create new user object
    const newUser = { name, email, password };
    users.push(newUser);

    console.log('New user signed up:', newUser);
    res.status(201).json({ message: 'User signed up successfully!' });
});

// API endpoint for user sign-in
app.post('/api/signin', (req, res) => {
    const { email, password } = req.body;

    // Find user by email and check password
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        console.log('User signed in:', user);
        res.status(200).json({ message: 'Sign in successful!' });
    } else {
        res.status(401).json({ message: 'Invalid email or password.' });
    }
});

// API endpoint to generate and send a security code
app.post('/api/get-security-code', (req, res) => {
    const { email } = req.body;
    
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
    
    // Store the OTP with a timestamp for a 5-minute validity period
    otps[email] = { code: otp, expires: Date.now() + 300000 };
    
    console.log(`Sending OTP ${otp} to ${email}`);

    // Email content
    const mailOptions = {
        from: 'your_email@gmail.com', // Replace with your Gmail address
        to: email, 
        subject: 'Your EduVerse Security Code',
        text: `Your one-time security code is: ${otp}. Do not share this code with anyone.`
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).json({ message: 'Failed to send security code.' });
        }
        console.log('Email sent:', info.response);
        res.status(200).json({ message: 'Security code sent to your email.' });
    });
});

// API endpoint to verify the security code
app.post('/api/verify-security-code', (req, res) => {
    const { email, code } = req.body;
    const storedOtp = otps[email];
    
    if (storedOtp && storedOtp.code === code && storedOtp.expires > Date.now()) {
        delete otps[email]; // Code used, so delete it
        res.status(200).json({ message: 'Code verified successfully!' });
    } else {
        res.status(400).json({ message: 'Invalid or expired code.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
