const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

// Database configuration
const DB_DIR = path.join(__dirname, 'database');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const ASSIGNMENT_SCORES_FILE = path.join(DB_DIR, 'assignment_scores.json');
const OTPS_FILE = path.join(DB_DIR, 'otps.json');

console.log('📁 Database directory path:', DB_DIR);
console.log('📄 Database files paths:', {
    users: USERS_FILE,
    scores: ASSIGNMENT_SCORES_FILE,
    otps: OTPS_FILE
});

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log('📁 Database directory created:', DB_DIR);
}

// Database utility functions
function readJsonFile(filePath, defaultValue = []) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
        return defaultValue;
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return defaultValue;
    }
}

function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        return false;
    }
}

// Initialize database files if they don't exist
function initializeDatabase() {
    const files = [
        { path: USERS_FILE, default: [] },
        { path: ASSIGNMENT_SCORES_FILE, default: {} },
        { path: OTPS_FILE, default: {} }
    ];
    
    files.forEach(({ path: filePath, default: defaultValue }) => {
        if (!fs.existsSync(filePath)) {
            writeJsonFile(filePath, defaultValue);
            console.log(`📄 Created database file: ${path.basename(filePath)}`);
        }
    });
}

// Initialize database on startup
initializeDatabase();

// Cleanup expired OTPs function
function cleanupExpiredOtps() {
    otps = readJsonFile(OTPS_FILE, {});
    const now = Date.now();
    let cleaned = false;
    
    Object.keys(otps).forEach(email => {
        if (otps[email].expires < now) {
            delete otps[email];
            cleaned = true;
        }
    });
    
    if (cleaned) {
        saveOtps();
        console.log('🧹 Cleaned up expired OTPs');
    }
}

// Cleanup expired OTPs every 5 minutes
setInterval(cleanupExpiredOtps, 5 * 60 * 1000);

// Configure CORS to only allow requests from your Netlify frontend
const corsOptions = {
    origin: ['https://eduverse09.netlify.app', 'http://127.0.0.1:5500']
};

app.use(cors(corsOptions));
app.use(express.json());

// File-based database - data is loaded from files
let users = readJsonFile(USERS_FILE, []);
let assignmentScores = readJsonFile(ASSIGNMENT_SCORES_FILE, {});
let otps = readJsonFile(OTPS_FILE, {});

// Function to save data to files
function saveUsers() {
    return writeJsonFile(USERS_FILE, users);
}

function saveAssignmentScores() {
    return writeJsonFile(ASSIGNMENT_SCORES_FILE, assignmentScores);
}

function saveOtps() {
    return writeJsonFile(OTPS_FILE, otps);
}

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
        console.log(`📤 Attempting to send email to: ${email}`);
        console.log(`📧 Email subject: ${mailOptions.subject}`);
        console.log(`📧 From: ${mailOptions.from}`);
        
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('❌ Error sending assignment results email:', error);
                console.error('❌ Error details:', error.message);
                reject(error);
            } else {
                console.log('✅ Assignment results email sent successfully!');
                console.log('📧 SMTP Response:', info.response);
                console.log('📧 Message ID:', info.messageId);
                console.log('📧 Accepted recipients:', info.accepted);
                console.log('📧 Rejected recipients:', info.rejected);
                resolve(info);
            }
        });
    });
}

//GET endpoint

app.get('/', (req, res) => {
    return res.status(200).json({ message: 'Server is running' });
})

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
    console.log('🧪 Test endpoint hit');
    res.status(200).json({ message: 'Backend is working!', timestamp: new Date().toISOString() });
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
    const { name, email, password, securityQuestion, securityAnswer } = req.body;

    // Reload users from file to ensure we have the latest data
    users = readJsonFile(USERS_FILE, []);

    if (users.find(user => user.email === email)) {
        return res.status(409).json({ message: 'User with that email already exists.' });
    }

    if (password.length < 6 || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return res.status(400).json({ message: 'Password must be at least 6 characters and contain a special symbol.' });
    }

    const newUser = { 
        id: Date.now().toString(), // Add unique ID
        name, 
        email, 
        password,
        securityQuestion: securityQuestion || null,
        securityAnswer: securityAnswer || null,
        createdAt: new Date().toISOString(),
        lastLogin: null
    };
    
    users.push(newUser);

    // Save to file
    if (saveUsers()) {
        console.log('✅ New user signed up and saved to database:', { 
            id: newUser.id, 
            name, 
            email, 
            hasSecurityQuestion: !!securityQuestion,
            securityQuestion: securityQuestion || 'None'
        });
        res.status(201).json({ message: 'User signed up successfully!' });
    } else {
        console.error('❌ Failed to save user to database');
        res.status(500).json({ message: 'Failed to create user account. Please try again.' });
    }
});

// API endpoint for user sign-in
app.post('/api/signin', (req, res) => {
    const { email, password } = req.body;

    // Reload users from file to ensure we have the latest data
    users = readJsonFile(USERS_FILE, []);

    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        // Update last login time
        user.lastLogin = new Date().toISOString();
        saveUsers();
        
        console.log('✅ User signed in:', { id: user.id, name: user.name, email: user.email });
        res.status(200).json({ 
            message: 'Sign in successful!',
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } else {
        console.log('❌ Failed sign-in attempt for email:', email);
        res.status(401).json({ message: 'Invalid email or password.' });
    }
});

// API endpoint to generate and send a security code
app.post('/api/get-security-code', (req, res) => {
    console.log('📧 GET SECURITY CODE endpoint hit');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    
    const { email } = req.body;

    // Reload OTPs from file
    otps = readJsonFile(OTPS_FILE, {});

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otps[email] = { 
        code: otp, 
        expires: Date.now() + 300000, // 5 minutes
        createdAt: new Date().toISOString()
    };

    // Save OTPs to file
    if (saveOtps()) {
        console.log(`✅ OTP saved to database for: ${email}`);
    } else {
        console.error(`❌ Failed to save OTP to database for: ${email}`);
    }

    console.log(`📧 Sending OTP ${otp} to ${email}`);

    const mailOptions = {
        from: 'mk7080252@gmail.com',
        to: email,
        subject: 'Your EduVerse Security Code',
        text: `Your one-time security code is: ${otp}. Do not share this code with anyone. This code expires in 5 minutes.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('❌ Error sending OTP email:', error);
            console.error('❌ Error details:', error.message);
            return res.status(500).json({ message: 'Failed to send security code.' });
        }
        console.log('✅ OTP email sent successfully:', info.response);
        console.log('✅ Sending 200 response to frontend');
        res.status(200).json({ message: 'Security code sent to your email.' });
    });
});

// API endpoint to verify the security code
app.post('/api/verify-security-code', (req, res) => {
    const { email, code } = req.body;
    
    // Reload OTPs from file
    otps = readJsonFile(OTPS_FILE, {});
    console.log(`🔍 Looking for OTP for email: ${email}`);
    console.log(`📋 Current OTPs in database:`, Object.keys(otps));
    const storedOtp = otps[email];

    if (storedOtp && storedOtp.code === code && storedOtp.expires > Date.now()) {
        // Remove the used OTP
        delete otps[email];
        saveOtps();
        
        console.log(`✅ OTP verified successfully for: ${email}`);
        res.status(200).json({ message: 'Code verified successfully!' });
    } else {
        console.log(`❌ Invalid or expired OTP attempt for: ${email}`);
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
    
    // Reload assignment scores from file
    assignmentScores = readJsonFile(ASSIGNMENT_SCORES_FILE, {});
    assignmentScores[scoreKey] = scoreData;
    
    // Save assignment scores to file
    saveAssignmentScores();
    
    console.log('✅ Assignment score submitted and saved to database:', scoreData);
    
    // Send email with assignment results
    try {
        console.log(`📧 Sending assignment results email to: ${email}`);
        console.log(`📊 Assignment details: ${courseId}-${moduleId}, Score: ${score}/${totalQuestions} (${scoreData.percentage}%)`);
        
        await sendAssignmentResultsEmail(scoreData);
        
        console.log(`✅ Assignment results email sent successfully to: ${email}`);
        
        // Format course and module names for logging
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
        
        console.log(`📧 Email subject: Assignment Results - ${courseNames[courseId] || courseId} ${moduleNames[moduleId] || moduleId} (${scoreData.percentage}%)`);
        
        res.json({ 
            message: `Score submitted successfully and results sent to ${email}`,
            scoreData: {
                score,
                totalQuestions,
                percentage: scoreData.percentage
            },
            emailSent: true,
            emailAddress: email
        });
    } catch (emailError) {
        console.error('❌ Error sending email:', emailError);
        console.log(`📧 Failed to send email to: ${email}`);
        
        res.json({ 
            message: 'Score submitted successfully, but failed to send email',
            scoreData: {
                score,
                totalQuestions,
                percentage: scoreData.percentage
            },
            emailSent: false,
            emailError: 'Failed to send results email',
            emailAddress: email
        });
    }
});

// API endpoint to get user's security question
app.get('/api/user/security-question/:email', (req, res) => {
    const { email } = req.params;
    
    // Reload users from file
    users = readJsonFile(USERS_FILE, []);
    const user = users.find(u => u.email === email);
    
    if (user && user.securityQuestion) {
        console.log(`🔍 Retrieved security question for: ${email}`);
        res.json({
            email: user.email,
            securityQuestion: user.securityQuestion,
            questionText: getSecurityQuestionText(user.securityQuestion)
        });
    } else {
        console.log(`❌ No security question found for: ${email}`);
        res.status(404).json({ message: 'Security question not found for this user.' });
    }
});

// Helper function to get security question text
function getSecurityQuestionText(questionKey) {
    const questions = {
        'pet': 'What was the name of your first pet?',
        'city': 'What city were you born in?',
        'mother': 'What is your mother\'s maiden name?'
    };
    return questions[questionKey] || 'Unknown question';
}

// API endpoint to verify security answer
app.post('/api/user/verify-security-answer', (req, res) => {
    const { email, securityAnswer } = req.body;
    
    // Reload users from file
    users = readJsonFile(USERS_FILE, []);
    const user = users.find(u => u.email === email);
    
    if (user && user.securityAnswer && user.securityAnswer.toLowerCase() === securityAnswer.toLowerCase()) {
        console.log(`✅ Security answer verified for: ${email}`);
        res.json({ message: 'Security answer verified successfully!' });
    } else {
        console.log(`❌ Invalid security answer for: ${email}`);
        res.status(400).json({ message: 'Invalid security answer.' });
    }
});

// API endpoint to update user's security question (for existing users)
app.post('/api/user/update-security-question', (req, res) => {
    const { email, securityQuestion, securityAnswer } = req.body;
    
    // Reload users from file
    users = readJsonFile(USERS_FILE, []);
    const userIndex = users.findIndex(u => u.email === email);
    
    if (userIndex !== -1) {
        users[userIndex].securityQuestion = securityQuestion;
        users[userIndex].securityAnswer = securityAnswer;
        users[userIndex].updatedAt = new Date().toISOString();
        
        if (saveUsers()) {
            console.log(`✅ Security question updated for: ${email}`);
            res.json({ message: 'Security question updated successfully!' });
        } else {
            console.error(`❌ Failed to save security question for: ${email}`);
            res.status(500).json({ message: 'Failed to update security question.' });
        }
    } else {
        console.log(`❌ User not found: ${email}`);
        res.status(404).json({ message: 'User not found.' });
    }
});

// API endpoint to get user's assignment scores
app.get('/api/assignments/scores/:email', (req, res) => {
    const { email } = req.params;
    
    // Reload assignment scores from file
    assignmentScores = readJsonFile(ASSIGNMENT_SCORES_FILE, {});
    const userScores = Object.values(assignmentScores).filter(score => score.email === email);
    
    console.log(`📊 Retrieved ${userScores.length} scores for user: ${email}`);
    
    res.json({
        email,
        scores: userScores
    });
});

// API endpoint to check if user has already taken a specific assignment
app.get('/api/assignments/check-completion/:email/:courseId/:moduleId', (req, res) => {
    const { email, courseId, moduleId } = req.params;
    const key = `${email}-${courseId}-${moduleId}`;
    
    console.log('🔍 Checking assignment completion for:', { email, courseId, moduleId, key });
    
    // Reload assignment scores from file
    assignmentScores = readJsonFile(ASSIGNMENT_SCORES_FILE, {});
    
    if (assignmentScores[key]) {
        console.log('✅ Assignment already completed:', assignmentScores[key]);
        res.json({ 
            completed: true, 
            score: assignmentScores[key].score,
            totalQuestions: assignmentScores[key].totalQuestions,
            percentage: assignmentScores[key].percentage,
            timestamp: assignmentScores[key].timestamp
        });
    } else {
        console.log('❌ Assignment not completed yet');
        res.json({ completed: false });
    }
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

// Database management endpoints (for development/admin purposes)
app.get('/api/admin/database/stats', (req, res) => {
    const users = readJsonFile(USERS_FILE, []);
    const assignmentScores = readJsonFile(ASSIGNMENT_SCORES_FILE, {});
    const otps = readJsonFile(OTPS_FILE, {});
    
    const stats = {
        users: {
            total: users.length,
            recent: users.filter(user => {
                const createdAt = new Date(user.createdAt);
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return createdAt > weekAgo;
            }).length,
            withSecurityQuestions: users.filter(user => user.securityQuestion).length
        },
        assignmentScores: {
            total: Object.keys(assignmentScores).length,
            uniqueUsers: new Set(Object.values(assignmentScores).map(score => score.email)).size
        },
        otps: {
            active: Object.keys(otps).length,
            expired: Object.values(otps).filter(otp => otp.expires < Date.now()).length
        }
    };
    
    res.json(stats);
});

app.get('/api/admin/database/backup', (req, res) => {
    const backup = {
        timestamp: new Date().toISOString(),
        users: readJsonFile(USERS_FILE, []),
        assignmentScores: readJsonFile(ASSIGNMENT_SCORES_FILE, {}),
        otps: readJsonFile(OTPS_FILE, {})
    };
    
    res.json(backup);
});

app.listen(port, () => {
    console.log(`🚀 Server listening at http://localhost:${port}`);
    console.log(`📁 Database directory: ${DB_DIR}`);
    console.log(`📄 Database files initialized successfully`);
});

