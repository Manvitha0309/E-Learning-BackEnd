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

// Function to send assignment results email
async function sendAssignmentResultsEmail(scoreData) {
    const { email, courseId, moduleId, score, totalQuestions, percentage, answers, questions, timestamp } = scoreData;
    
    // Format course and module names
    const courseNames = {
        'webdev': 'Web Development',
        'datascience': 'Data Science',
        'cns': 'Computer Networks & Security',
        'uiux': 'UI/UX Design',
        'mobiledev': 'Mobile Development',
        'digitalmarketing': 'Digital Marketing'
    };
    
    const moduleNames = {
        'module1': 'Module 1',
        'module2': 'Module 2',
        'module3': 'Module 3',
        'module4': 'Module 4'
    };
    
    const courseName = courseNames[courseId] || courseId;
    const moduleName = moduleNames[moduleId] || moduleId;
    
    // Create detailed results HTML
    let detailedResults = '';
    if (questions && answers) {
        detailedResults = questions.map((question, index) => {
            const userAnswer = answers[index];
            const userAnswerText = (userAnswer >= 0 && userAnswer < question.options.length) 
                ? question.options[userAnswer] 
                : 'Not answered';
            const correctAnswerText = question.options[question.correctAnswer];
            const isCorrect = userAnswer === question.correctAnswer;
            
            return `
                <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: ${isCorrect ? '#f0fdf4' : '#fef2f2'};">
                    <h4 style="color: #374151; margin-bottom: 10px;">Question ${index + 1}: ${question.question}</h4>
                    <p style="margin: 5px 0;"><strong>Your Answer:</strong> <span style="color: ${isCorrect ? '#059669' : '#dc2626'};">${userAnswerText}</span></p>
                    <p style="margin: 5px 0;"><strong>Correct Answer:</strong> <span style="color: #059669;">${correctAnswerText}</span></p>
                    <p style="margin: 5px 0; color: #2563eb;"><strong>Explanation:</strong> ${question.explanation}</p>
                </div>
            `;
        }).join('');
    }
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Assignment Results - EduVerse</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
                <h1 style="color: white; margin: 0; font-size: 28px;">EduVerse</h1>
                <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Assignment Results</p>
            </div>
            
            <div style="background-color: #f9fafb; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
                <h2 style="color: #1f2937; margin-top: 0;">Assignment Completed Successfully!</h2>
                <p style="font-size: 16px; margin-bottom: 20px;">Congratulations on completing your assignment. Here are your results:</p>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                    <h3 style="color: #1f2937; margin-top: 0;">${courseName} - ${moduleName}</h3>
                    <div style="display: flex; justify-content: space-between; margin: 15px 0;">
                        <div style="text-align: center;">
                            <div style="font-size: 32px; font-weight: bold; color: #3b82f6;">${score}/${totalQuestions}</div>
                            <div style="color: #6b7280; font-size: 14px;">Questions Correct</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 32px; font-weight: bold; color: ${percentage >= 70 ? '#059669' : percentage >= 50 ? '#d97706' : '#dc2626'};">${percentage}%</div>
                            <div style="color: #6b7280; font-size: 14px;">Overall Score</div>
                        </div>
                    </div>
                    <p style="text-align: center; margin: 15px 0 0 0; font-size: 14px; color: #6b7280;">
                        Submitted on: ${new Date(timestamp).toLocaleString()}
                    </p>
                </div>
            </div>
            
            ${detailedResults ? `
            <div style="margin-bottom: 25px;">
                <h3 style="color: #1f2937; margin-bottom: 20px;">Detailed Results</h3>
                ${detailedResults}
            </div>
            ` : ''}
            
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <h4 style="color: #1e40af; margin-top: 0;">What's Next?</h4>
                <p style="margin-bottom: 10px;">• Review the explanations for questions you got wrong</p>
                <p style="margin-bottom: 10px;">• Practice more to improve your understanding</p>
                <p style="margin-bottom: 0;">• Continue with the next module when you're ready</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    Thank you for using EduVerse!<br>
                    Keep learning and growing! 🚀
                </p>
            </div>
        </body>
        </html>
    `;
    
    const textContent = `
        EduVerse - Assignment Results
        
        Assignment: ${courseName} - ${moduleName}
        Score: ${score}/${totalQuestions} (${percentage}%)
        Submitted: ${new Date(timestamp).toLocaleString()}
        
        ${percentage >= 70 ? 'Excellent work! You passed the assignment.' : 
          percentage >= 50 ? 'Good effort! Consider reviewing the material.' : 
          'Keep studying! Review the explanations and try again.'}
        
        Thank you for using EduVerse!
    `;
    
    const mailOptions = {
        from: 'mk7080252@gmail.com',
        to: email,
        subject: `Assignment Results - ${courseName} ${moduleName} (${percentage}%)`,
        text: textContent,
        html: htmlContent
    };
    
    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending assignment results email:', error);
                reject(error);
            } else {
                console.log('Assignment results email sent:', info.response);
                resolve(info);
            }
        });
    });
}

//GET endpoint

app.get('/', (req, res) => {
    return res.status(200).json({ message: 'Server is running' });
})

// Test endpoint for email functionality
app.post('/api/test-email', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }
    
    try {
        const testScoreData = {
            email: email,
            courseId: 'webdev',
            moduleId: 'module1',
            score: 8,
            totalQuestions: 10,
            percentage: 80,
            answers: [0, 1, 2, 0, 1, 2, 0, 1, 2, 0],
            questions: [
                {
                    question: "What does HTML stand for?",
                    options: ["Hyper Text Markup Language", "High-level Text Management Language", "Hyperlink and Text Markup Language", "Home Tool Markup Language"],
                    correctAnswer: 0,
                    explanation: "HTML stands for Hyper Text Markup Language, which is used to structure content on the web."
                }
            ],
            timestamp: new Date().toISOString()
        };
        
        await sendAssignmentResultsEmail(testScoreData);
        res.json({ message: 'Test email sent successfully!' });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.status(500).json({ message: 'Failed to send test email', error: error.message });
    }
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
app.post('/api/assignments/submit-score', async (req, res) => {
    const { email, courseId, moduleId, score, totalQuestions, answers, questions } = req.body;
    
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
        questions,
        timestamp: new Date().toISOString(),
        percentage: Math.round((score / totalQuestions) * 100)
    };
    
    assignmentScores[scoreKey] = scoreData;
    
    console.log('Assignment score submitted:', scoreData);
    
    // Send email with assignment results
    try {
        await sendAssignmentResultsEmail(scoreData);
        res.json({ 
            message: 'Score submitted successfully and results sent to your email',
            scoreData: {
                score,
                totalQuestions,
                percentage: scoreData.percentage
            },
            emailSent: true
        });
    } catch (emailError) {
        console.error('Error sending email:', emailError);
        res.json({ 
            message: 'Score submitted successfully, but failed to send email',
            scoreData: {
                score,
                totalQuestions,
                percentage: scoreData.percentage
            },
            emailSent: false,
            emailError: 'Failed to send results email'
        });
    }
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

