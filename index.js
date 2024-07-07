const express = require('express');
const http = require('http');
const cors = require('cors');
const dB = require('./config/mongoose');
const fileUpload = require('express-fileupload');
require('dotenv').config();
const socketHandler = require('./socket');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT;

dB();

 

// Specify CORS options to allow access only from your frontend URL
const corsOptions = {
    origin: 'https://social-sphere-frontend-beige.vercel.app',
    // Additional options like methods, allowedHeaders, etc. can be specified if needed
};

app.use(cors(corsOptions)); // Use CORS middleware with custom options
 // Use CORS middleware with custom options
app.options('*', cors(corsOptions)); // Enable preflight requests for all routes

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use file upload middleware after body parsing middleware
app.use(fileUpload({ limits: { fileSize: 100 * 1024 * 1024 } }));

// Routes
app.use('/', require('./routes'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Initialize Socket.IO
socketHandler(server);

server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
