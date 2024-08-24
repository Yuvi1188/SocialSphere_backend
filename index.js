const express = require('express');
const http = require('http');
const cors = require('cors');
const dB = require('./config/mongoose');
const fileUpload = require('express-fileupload');
require('dotenv').config();
const socketHandler = require('./socket');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 8000; // Default to 8000 if PORT is not provided

dB();

// CORS middleware to allow all origins
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use file upload middleware after body parsing middleware
app.use(fileUpload({ limits: { fileSize: 200 * 1024 * 1024 } }));

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
    console.log(`Server is running on port ${port}`);
});
