const socketIo = require('socket.io');
const User = require('./models/user'); // Import User model
const Message = require('./models/message');
const Chat = require('./models/chat');
const Post = require('./models/post');
const cloudinary = require('cloudinary').v2;

const socketHandler = (server) => {
    const io = socketIo(server, {
        cors: {
            origin: 'http://localhost:5173',
        },
    });

    const onlineUsers = {};

    const updateLastActive = async (userId) => {
        await User.findByIdAndUpdate(userId, { lastActive: new Date() });
    };

    io.on('connection', (socket) => {
        socket.on('userConnected', (userId) => {
            onlineUsers[userId] = socket.id;
            io.emit('userStatusUpdate', { userId, status: 'online' });
        });

        socket.on('joinChat', (chatId) => {
            socket.join(chatId);
        });

        socket.on('leaveChat', async ({ chatId, userId }) => {
            socket.leave(chatId);
            await updateLastActive(userId);
            io.emit('userStatusUpdate', { userId, status: 'offline', lastActive: new Date() });
        });

        socket.on('messages/sendmessage', async ({ chatId, messageData }) => {
            try {
                const newMessage = new Message(messageData);
                if (messageData.document) {
                    const uploadResult = await cloudinary.uploader.upload(messageData.document, {
                        folder: 'chat_documents',
                    });
                    newMessage.document = {
                        public_id: uploadResult.public_id,
                        url: uploadResult.secure_url
                    };
                }
        
                await newMessage.save();
                const message = await newMessage.populate('sender', 'fullName userImgUrl');
                await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id }, { new: true })
                    .populate('users', 'fullName userImgUrl')
                    .populate({
                        path: 'latestMessage',
                        populate: {
                            path: 'sender',
                            select: 'fullName userImgUrl',
                        },
                    });
                    console.log(message);
                io.to(chatId).emit('receiveMessage', message);
            } catch (error) {
                console.error(error);
            }
        });


        socket.on('likePost', async ({ postId, userId }) => {
            try {
                const post = await Post.findById(postId);
                if (post) {
                    const index = post.likes.indexOf(userId);
                    if (index === -1) {
                        post.likes.push(userId);
                    } else {
                        post.likes.splice(index, 1);
                    }
                    await post.save();
                    io.emit('postLiked', { postId, likes: post.likes });
                }
            } catch (error) {
                console.error("Error liking post:", error);
            }
        });

        // Handle commenting on posts
        socket.on('commentPost', async ({ postId, userId, text }) => {
            try {
                const post = await Post.findById(postId);
                if (post) {
                    post.comments.push({ user: userId, text });
                    await post.save();

                    await post.populate({
                        path: 'comments.user',
                        select: 'username fullName'
                    });

                    io.emit('postCommented', { postId, comments: post.comments });
                }
            } catch (error) {
                console.error("Error commenting on post:", error);
            }
        });


        socket.on('disconnect', async () => {
            const userId = Object.keys(onlineUsers).find(key => onlineUsers[key] === socket.id);
            if (userId) {
                delete onlineUsers[userId];
                await updateLastActive(userId);
                io.emit('userStatusUpdate', { userId, status: 'offline', lastActive: new Date() });
            }
        });
    });
};

module.exports = socketHandler;
