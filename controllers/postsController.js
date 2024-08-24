const fs = require('fs');
const path = require('path');
const Post = require('../models/post');
const cloudinary = require('../config/cloudinary');

module.exports.getPosts = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const perPage = 10;

    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage)
            .populate('user', 'username fullName _id')
            .populate({
                path: 'comments.user',
                select: 'username userImgUrl'
            })
            .populate({
                path: 'likes',
                select: 'username userImgUrl'
            });

        const totalPosts = await Post.countDocuments();
        const hasMore = totalPosts > page * perPage;

        res.status(200).json({ posts, hasMore, page });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports.createPost = async (req, res) => {
    const { caption, userId } = req.body;
    const { file: postFile } = req.files;

    try {
        let mediaUrl;
        let isReel = false;

        if (postFile) {
            const tempDir = path.join(__dirname, '..', 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir);
            }

            const filePath = path.join(tempDir, postFile.name);

            try {
                await postFile.mv(filePath);

                const fileExtension = path.extname(postFile.name).toLowerCase();
                const mimeType = postFile.mimetype.toLowerCase();

                const videoExtensions = ['.mp4', '.mov', '.avi'];
                const videoMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];

                if (videoExtensions.includes(fileExtension) || videoMimeTypes.includes(mimeType)) {
                    isReel = true;
                }

                const uploadedFile = await cloudinary.uploader.upload(filePath, {
                    folder: isReel ? 'reels' : 'posts',
                    resource_type: isReel ? 'video' : 'auto',
                });

                fs.unlinkSync(filePath);

                mediaUrl = {
                    public_id: uploadedFile.public_id,
                    url: uploadedFile.url
                };
            } catch (error) {
                console.error("Error uploading file:", error);
                return res.status(500).json({ message: "Internal server error" });
            }
        }

        const newPost = new Post({
            user: userId,
            mediaUrl,
            caption,
            isReel
        });

        await newPost.save();

        await newPost.populate('user', 'username fullName');

        return res.status(201).json({ post: newPost });
    } catch (error) {
        console.error("Error creating post:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Delete Post Controller
module.exports.deletePost = async (req, res) => {
    const { postId } = req.params;
     

    const { userId } = req.body;
     // Assuming you have user authentication and `req.user` is populated

    try {
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Check if the user is authorized to delete the post (optional, based on your auth logic

        // Delete media from Cloudinary
        if (post.mediaUrl && post.mediaUrl.public_id) {
            await cloudinary.uploader.destroy(post.mediaUrl.public_id, { resource_type: post.isReel ? 'video' : 'image' });
        }

        // Delete the post from the database
        await Post.findByIdAndDelete(postId);  // Use this method to delete the post

        return res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error("Error deleting post:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

