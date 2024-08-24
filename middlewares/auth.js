const jwt = require('jsonwebtoken');

// Middleware function to verify JWT token
module.exports.verifyToken = function (req, res, next) {
    // Get token from request headers
    const token = req.headers['authorization'];
  
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }
    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).json({ message: 'Failed to authenticate token' });
        }
        // Store decoded token in request object for further use
        req.body.userId = decoded.userId;
        next();
    });
}
