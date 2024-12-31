const express = require('express');
const path = require('path');
const { ObjectId } = require('mongodb');
const router = express.Router();
const dotenv = require('dotenv');
const multer = require('multer');

dotenv.config();

// Set storage engine
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'public/uploads/payments')); // Specify the upload directory
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Save file with unique name
    }
});

// Initialize multer
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Validate file type
        const fileTypes = /jpeg|jpg|png/;
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = fileTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed (JPEG, JPG, PNG)'));
        }
    }
}).single('paymentScreenshot'); // Field name from the form

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

// Route for Registering Premium User
router.post('/premiumRegistration', upload, async (req, res) => {
    const DataDb = req.app.locals.dataDb;

    try {
        // Extract data from the request body
        const {
            fullName,
            phoneNumber,
            contactMethod,
            email,
            referralSource,
            friendName,
            plan,
            transactionID
        } = req.body;

        // Validate required fields
        if (!fullName || !phoneNumber || !contactMethod || !email || !referralSource || !plan || !transactionID || !req.file) {
            return res.status(400).json({ status: false, message: 'All required fields and payment screenshot must be provided' });
        }

        // Save the registration data
        const registrationData = {
            fullName,
            phoneNumber,
            contactMethod,
            email,
            referralSource,
            friendName: referralSource === 'friend' ? friendName : null,
            plan,
            transactionID,
            screenshotPath: `/uploads/${req.file.filename}`, // Path to the uploaded file
            createdAt: new Date(),
            status: 'Pending'
        };

        // Insert the data into the database
        const result = await DataDb.collection('Payments').insertOne(registrationData);

        res.status(200).json({
            status: true,
            message: 'Registration submitted successfully',
            data: { registrationId: result.insertedId }
        });
    } catch (error) {
        console.error('Error handling premium registration:', error);
        res.status(500).json({ status: false, message: 'Internal server error' });
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
