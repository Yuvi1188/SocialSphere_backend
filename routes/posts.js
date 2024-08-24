const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const { createPost, getPosts,deletePost } = require('../controllers/postsController');
  
router.post('/createpost', verifyToken, createPost);
router.get('/getposts', getPosts);
router.delete('/deletePost/:postId',verifyToken, deletePost);
module.exports = router;
