const express = require('express');
const path = require('path');
const { ObjectId } = require('mongodb'); 
const router = express.Router();
const dotenv = require('dotenv');

dotenv.config(); 

// Protected Route Middleware
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    } else {
        return res.redirect('/');
    }
}

// Handle contact form submission
router.post('/submit-contact', isAuthenticated, async (req, res) => {
    const { subject, message } = req.body;
    const userId = req.session.user ? req.session.user.id : null;
    const usersDb = req.app.locals.usersDb;

    // Check if fields are filled
    if (!subject || !message) {
        return res.status(400).json({ status: false, message: 'Both subject and message are required.' });
    }

    try {
        // Fetch user information
        const user = await usersDb.collection('Customers').findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(404).json({ status: false, message: 'User not found' });
        }

        // Create email options with structured body
        const mailOptions = {
            from: `"Cash Crown" <${process.env.EMAIL}>`,
            to: 'support@cashcrown.org', // Team email address
            subject: 'Customer Contact Request',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Customer Contact Request</h2>
                    <hr>
                    <h3>User Information</h3>
                    <p><strong>First Name:</strong> ${user.fname}</p>
                    <p><strong>Last Name:</strong> ${user.lname}</p>
                    <p><strong>Username:</strong> ${user.username}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <hr>
                    <h3>Message Details</h3>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <p><strong>Message:</strong></p>
                    <p>${message}</p>
                </div>
            `
        };

        // Send the email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ status: false, message: 'Internal Server Error' });
            }
            console.log('Email sent:', info.response);
            res.json({ status: true, message: 'Your message has been sent successfully!' });
        });
    } catch (error) {
        console.error('Error processing contact form:', error);
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});

// Route for Storing Email Subscription
router.post('/subscribe', async (req, res) => {
    const email = req.body.email;
    const subscriptionsDb = req.app.locals.subscriptionsDb;

    try {
        const existingEmail = await subscriptionsDb.collection('Customers').findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email already subscribed.' });
        }
        
        await subscriptionsDb.collection('Customers').insertOne({
            email,
            subscribedAt: new Date()
        });

        res.status(201).json({ message: 'Subscription successful!' });
    } catch (error) {
        console.error('Error subscribing email:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Dashboard Route (Protected)
router.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'dashboard.html'));
});

module.exports = router;
