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

// Route for Fetching Links
router.get('/fetchLinks', async (req, res) => {
    const DataDb = req.app.locals.dataDb;

    try {
        const whatsapp = await DataDb.collection('Links').findOne({ "platform": "whatsapp" });
        const telegram = await DataDb.collection('Links').findOne({ "platform": "telegram" });

        res.status(200).json({ whatsapplink: whatsapp.link, telegramlink: telegram.link });
    } catch (error) {
        console.error('Error fetching links:', error);
        res.status(500).json({ status: false, message: 'Internal server error' });
    }
});

// Route to fetch news
router.get('/getNews', async (req, res) => {
    const DataDb = req.app.locals.dataDb;
    const limit = parseInt(req.query.limit) || 3; // Default limit to 3 if not specified

    try {
        const news = await DataDb.collection('News')
            .find()
            .sort({ newsDate: -1 }) // Sort by latest
            .limit(limit) // Limit the number of items
            .toArray();

        res.status(200).json({ status: true, news });
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({ status: false, message: 'Internal Server Error' });
    }
});




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
