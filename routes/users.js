const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const { isNewUser, register, login, getUserDetails, updateProfile, getSearchResults } = require('../controllers/usersController');
const { getUserProfile } = require('../controllers/profileController')

router.post('/isnewuser', isNewUser);
router.post('/register', register);
router.post('/login', login);
router.post('/getuser', verifyToken, getUserDetails);
router.post('/updateprofile', verifyToken, updateProfile);
router.get('/profile/:userId', verifyToken, getUserProfile);
router.get('/search', verifyToken, getSearchResults);

module.exports = router;