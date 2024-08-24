const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the OTP schema
const otpSchema = new mongoose.Schema({
    email: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 5, // Document automatically deleted after 5 minutes
    },
  });

// Create the OTP model
const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;
