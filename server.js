const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
const PORT = 3000;
require('dotenv').config();

const mongoUri = process.env.MONGO_URI;
const app = express();

app.enable('trust proxy');


// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files (like HTML, CSS, JS) from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MongoDB Connection
MongoClient.connect(mongoUri)
  .then(client => {
    console.log('Connected to MongoDB');
    
    const usersDb = client.db('Users');
    const DataDb = client.db('Data');

    // Store the database instances in app.locals for access in routes
    app.locals.usersDb = usersDb;
    app.locals.dataDb = DataDb;

    // Import and use the routes
    const routes = require('./routes');
    app.use('/', routes);
  })
  .catch(err => {
    console.error('Could not connect to MongoDB...', err);
    process.exit(1);  // Stop the server if the connection to MongoDB fails
  });


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
