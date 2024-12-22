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


// Route for Storing Email Subscription
router.post('/subscribe', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ status: 'error', message: 'Email is required.' });
    }

    try {
        const usersDb = req.app.locals.usersDb;
        const collection = usersDb.collection('Subscription');

        const existingUser = await collection.findOne({ email });

        if (existingUser) {
            return res.json({ status: 'error', message: 'Email already subscribed.' });
        }

        await collection.insertOne({ email, subscription: true, subscribedAt: new Date() });

        res.json({ status: 'success', message: 'Subscription successful.' });
    } catch (err) {
        console.error('Error during subscription:', err);
        res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
});

// Dashboard Route (Protected)
router.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'dashboard.html'));
});

module.exports = router;
