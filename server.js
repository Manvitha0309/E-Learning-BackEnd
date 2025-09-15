const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

// Configure CORS to only allow requests from your Netlify frontend
const corsOptions = {
    origin: ['https://eduverse09.netlify.app', 'http://127.0.0.1:5500']
};

app.use(cors(corsOptions));
app.use(express.json());

// In-memory "database" to store user data
const users = [];

// In-memory store for OTPs
const otps = {};

// In-memory store for assignment scores
const assignmentScores = {};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'mk7080252@gmail.com', // Replace with your Gmail address
        pass: 'nnwk jyzk yhrk asoq'     // Replace with your 16-character App Password
    }
});

//GET enpoint

app.get('/', (req, res) => {
    return res.status(200).json({ message: 'Server is running' });
})

// API endpoint for user sign-up
app.post('/api/signup', (req, res) => {
    const { name, email, password } = req.body;

    if (users.find(user => user.email === email)) {
        return res.status(409).json({ message: 'User with that email already exists.' });
    }

    if (password.length < 6 || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return res.status(400).json({ message: 'Password must be at least 6 characters and contain a special symbol.' });
    }

    const newUser = { name, email, password };
    users.push(newUser);

    console.log('New user signed up:', newUser);
    res.status(201).json({ message: 'User signed up successfully!' });
});

// API endpoint for user sign-in
app.post('/api/signin', (req, res) => {
    const { email, password } = req.body;

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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otps[email] = { code: otp, expires: Date.now() + 300000 };

    console.log(`Sending OTP ${otp} to ${email}`);

    const mailOptions = {
        from: 'your_email@gmail.com',
        to: email,
        subject: 'Your EduVerse Security Code',
        text: `Your one-time security code is: ${otp}. Do not share this code with anyone.`
    };

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
        delete otps[email];
        res.status(200).json({ message: 'Code verified successfully!' });
    } else {
        res.status(400).json({ message: 'Invalid or expired code.' });
    }
});

// API endpoint to get assignment questions
app.get('/api/assignments/:courseId/:moduleId', (req, res) => {
    const { courseId, moduleId } = req.params;
    const assignmentPath = path.join(__dirname, '..', 'assignments', `${courseId}-${moduleId}.json`);
    
    try {
        if (fs.existsSync(assignmentPath)) {
            const assignmentData = JSON.parse(fs.readFileSync(assignmentPath, 'utf8'));
            res.json(assignmentData);
        } else {
            res.status(404).json({ message: 'Assignment not found' });
        }
    } catch (error) {
        console.error('Error reading assignment file:', error);
        res.status(500).json({ message: 'Error loading assignment' });
    }
});

// API endpoint to submit assignment scores
app.post('/api/assignments/submit-score', (req, res) => {
    const { email, courseId, moduleId, score, totalQuestions, answers } = req.body;
    
    if (!email || !courseId || !moduleId || score === undefined) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const scoreKey = `${email}-${courseId}-${moduleId}`;
    const scoreData = {
        email,
        courseId,
        moduleId,
        score,
        totalQuestions,
        answers,
        timestamp: new Date().toISOString(),
        percentage: Math.round((score / totalQuestions) * 100)
    };
    
    assignmentScores[scoreKey] = scoreData;
    
    console.log('Assignment score submitted:', scoreData);
    res.json({ 
        message: 'Score submitted successfully',
        scoreData: {
            score,
            totalQuestions,
            percentage: scoreData.percentage
        }
    });
});

// API endpoint to get user's assignment scores
app.get('/api/assignments/scores/:email', (req, res) => {
    const { email } = req.params;
    const userScores = Object.values(assignmentScores).filter(score => score.email === email);
    
    res.json({
        email,
        scores: userScores
    });
});

// API endpoint to get all available assignments
app.get('/api/assignments', (req, res) => {
    const assignmentsDir = path.join(__dirname, '..', 'assignments');
    
    try {
        if (fs.existsSync(assignmentsDir)) {
            const files = fs.readdirSync(assignmentsDir).filter(file => file.endsWith('.json'));
            const assignments = files.map(file => {
                const [courseId, moduleId] = file.replace('.json', '').split('-');
                return { courseId, moduleId, fileName: file };
            });
            res.json(assignments);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Error reading assignments directory:', error);
        res.status(500).json({ message: 'Error loading assignments' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

