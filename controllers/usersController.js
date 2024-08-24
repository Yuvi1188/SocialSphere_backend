const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const User = require('../models/user');
const cloudinary = require('../config/cloudinary');
const path = require('path')
const nodemailer = require('nodemailer');
 const OTP = require('../models/OTP')
 require('dotenv').config();
 const crypto = require('crypto');

// Controller function to check if the user is new
module.exports.isNewUser = async function (req, res) {
    try {
        const { email, username } = req.body;
        // Find user by email or username
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.json({ isNewUser: false }); // User already exists
        } else {
            return res.json({ isNewUser: true }); // User is new
        }
    } catch (error) {
        console.error('Error checking if user is new:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports.register = async function (req, res) {
    try {
        const { email, username, fullName, password, userImgUrl } = req.body;

        // Check if all required fields are present
        if (!email || !username || !fullName || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check if user with the same email or username already exists



        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = new User({
            email,
            username,
            fullName,
            password: hashedPassword,
            userImgUrl
        });
        await newUser.save();

        // Generate JWT token for the newly registered user
        const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Return token along with success message
        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token
        });
    } catch (error) {
        console.error('Error registering user:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Controller function to login a user
module.exports.login = async function (req, res) {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            // console.log('User not found:', email);
            return res.status(404).json({ message: 'User not found' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            // console.log('Incorrect password for user:', email);
            return res.status(401).json({ message: 'Incorrect password' });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        // console.log('User logged in successfully:', email);

        // Return token to the client
        return res.status(200).json({ token, user });
    } catch (error) {
        console.error('Error logging in user:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// get user details
module.exports.getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.body.userId);
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

// Function to update user profile
module.exports.updateProfile = async (req, res) => {
    const { userId, fullName, bio, website, gender } = req.body;
    const { avatar } = req.files;
    console.log(avatar)

    try {
        // Check if the user exists
        let user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        let userImgUrl;

        // Check if avatar data is provided
        if (avatar) {
            // Create the temp directory if it doesn't exist
            const tempDir = path.join(__dirname, '..', 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir);
            }

            const avatarPath = path.join(tempDir, avatar.name);

            try {
                // Write the buffer data to a temporary file
                await avatar.mv(avatarPath);

                // Upload the temporary file to Cloudinary
                const uploadedImage = await cloudinary.uploader.upload(avatarPath, {
                    folder: 'avatars', // Folder to store avatars
                    resource_type: 'image', // Type of resource being uploaded
                    // Add any additional configuration options here
                });

                // Delete the temporary file after uploading
                fs.unlinkSync(avatarPath);

                userImgUrl = {
                    public_id: uploadedImage.public_id,
                    url: uploadedImage.url
                };
            } catch (error) {
                console.error("Error uploading avatar:", error);
                return res.status(500).json({ message: "Internal server error" });
            }
        }

        // Update user fields
        user.fullName = fullName;
        user.bio = bio;
        user.website = website;
        user.gender = gender;

        // Update userImgUrl if avatar is uploaded
        if (userImgUrl) {
            user.userImgUrl = userImgUrl;
        }

        // Save updated user
        await user.save();

        // Return updated user
        return res.status(200).json({ user });
    } catch (error) {
        console.error("Error updating user profile:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

module.exports.getSearchResults = async (req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.status(400).json({ message: 'Query parameter is required' });
    }

    try {
        const regex = new RegExp(query, 'i'); // Case-insensitive search
        const users = await User.find({
            $or: [
                { username: regex },
                { fullName: regex },
                { email: regex }
            ]
        }).select('username fullName userImgUrl _id');

        res.json({ results: users });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch search results', error: error.message });
    }
};


  

// Configure Nodemailer (update with your email service details)
const transporter = nodemailer.createTransport({
    service: 'Gmail', // or other service provider
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Controller function to send OTP
module.exports.sendOtp = async (req, res) => {
    const { email } = req.body;
  console.log(email);

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // Find the user by email
        // Generate OTP
        var otp = crypto.randomInt(100000, 999999).toString(); // Generate a 6-digit OTP
        

        // Save the OTP in the database
        const newOtp = new OTP({
            email,
            otp
        });

        await newOtp.save();

        // Send OTP via email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to:   email,
            subject: 'SocialSphere OTP Verification',
            text: `Your OTP code is ${otp}. It will expire in 15 minutes.`
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({success:true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({success:false, error: 'An error occurred while sending OTP' });
    }
};


// Controller function to verify OTP
module.exports.verifyOtp = async (req, res) => {
    var {otp,email } = req.body;
      console.log(typeof otp);
      console.log(email);
    if (!otp||!email) {
        return res.status(400).json({ error: 'OTP is required' });
    }
    try {
        // Find the OTP record in the database
        const response = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1);
        console.log(response);
       console.log(response[0].otp);
        if (response.length === 0) {
            // OTP not found for the email
            console.log("bh")
            return res.status(400).json({
              success: false,
              message: "The OTP is not valid",
            })
          } 
          else if (otp !== response[0].otp) {
            // Invalid OTP
            console.log("bh1")

            return res.status(400).json({
              success: false,
              message: "The OTP is not valid",
            })
          }
          else{ 
            console.log("bh2")

            return res.status(200).json({
                success: true,
                message: "Your OTP verification is successfully",
              })
          }
         
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while verifying OTP' });
    }
};

 

 
