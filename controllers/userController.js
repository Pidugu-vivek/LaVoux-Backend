import validator from "validator";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import userModel from "../models/userModel.js";


const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' })
}

// Route for user login
const loginUser = async (req, res) => {
    try {

        const { email, password } = req.body;

        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User doesn't exists" })
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {

            const token = createToken(user._id)
            res.json({ success: true, token })

        }
        else {
            res.json({ success: false, message: 'Invalid credentials' })
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// Route for user register
const registerUser = async (req, res) => {
    try {

        const { name, email, password, phone } = req.body;

        // checking user already exists or not
        const exists = await userModel.findOne({ email });
        if (exists) {
            return res.json({ success: false, message: "User already exists" })
        }

        // validating email format & strong password
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" })
        }

        // hashing user password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const newUser = new userModel({
            name,
            email,
            password: hashedPassword,
            phone,
            passwordLength: password.length
        })

        const user = await newUser.save()

        const token = createToken(user._id)

        res.json({ success: true, token })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const adminLogin = async (req, res) => {
    try {
        
        const {email,password} = req.body

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign(email+password,process.env.JWT_SECRET);
            res.json({success:true,token})
        } else {
            res.json({success:false,message:"Invalid credentials"})
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    const user = await userModel.findOne({ email });
    // Always respond the same to avoid email enumeration
    if (!user) {
      return res.status(200).json({ success: true, message: 'If the email exists, a reset link will be sent.' });
    }

    // create token and save hashed token in DB
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password/${resetToken}`;
    const subject = 'Password reset for your account';
    const text = `You requested a password reset. Click or open the link: ${resetUrl}\nIf you did not request this, ignore.`;

    // configure transporter: prefer real SMTP via env, fallback to ethereal for dev
    let transporter;
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      // create transporter (SendGrid recommended settings)
  transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    // optional: helps with some self-signed / corporate TLS issues
    rejectUnauthorized: false
  }
});

const info = await transporter.sendMail({
  from: process.env.EMAIL_FROM,
  to: email,
  subject,
  text,
  html: `<p>${text}</p>`
});

// Log details to debug delivery status
console.log('Email send result:', {
  accepted: info.accepted,
  rejected: info.rejected,
  response: info.response,
  messageId: info.messageId
});
    } else {
      // dev/test: create ethereal account and log preview URL
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
    }
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `no-reply@${process.env.FRONTEND_URL?.replace(/^https?:\/\//,'') || 'local'}`,
      to: email,
      subject,
      text,
      html: `<p>${text}</p>`
    });
    
    // if using ethereal, get preview url and log it
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log('Preview reset email URL:', previewUrl);
    
    return res.status(200).json({
      success: true,
      message: 'If the email exists, a reset link will be sent.',
      previewUrl: process.env.NODE_ENV === 'production' ? undefined : previewUrl
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// add reset handler
const resetPassword = async (req, res) => {
  try {
    const token = req.params.token;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await userModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });

    const { password } = req.body;
    if (!password || password.length < 8) return res.status(400).json({ success: false, message: 'Provide a strong password (>=8 chars)' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.passwordLength = password.length;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


const getProfile = async (req, res) => {
  try {
    const userId = req.body.userId;
    if (!userId) return res.status(400).json({ success: false, message: 'Not authorized' });

    const user = await userModel.findById(userId).select('-password -resetPasswordToken -resetPasswordExpires -securityOtp -securityOtpExpires');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const addresses = user.addresses || [];
    const primaryAddress = addresses.find(a => a.isPrimary) || addresses[0] || null;
    return res.status(200).json({ success: true, user: { name: user.name, email: user.email, phone: user.phone, cartData: user.cartData, passwordLength: user.passwordLength || 8, addresses, primaryAddress } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.body.userId;
    const { name, email, phone, address } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'Not authorized' });

    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (email && email !== user.email) {
      const exists = await userModel.findOne({ email });
      if (exists) return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;

    // Address delete (remove subdocument by _id and keep one primary)
    if (address && address.delete && address._id) {
      user.addresses = user.addresses || [];
      const idxDel = user.addresses.findIndex(a => String(a._id) === String(address._id));
      if (idxDel !== -1) {
        const removed = user.addresses.splice(idxDel, 1)[0];
        if (removed && removed.isPrimary && user.addresses.length) {
          user.addresses.forEach((a, i) => { a.isPrimary = i === 0; });
        }
      }
    }


    // Address upsert (supports multiple addresses and primary)
    if (address && !address.delete) {
      user.addresses = user.addresses || [];
      if (address._id) {
        const idx = user.addresses.findIndex(a => String(a._id) === String(address._id));
        if (idx !== -1) {
          if (address.line1 !== undefined) user.addresses[idx].line1 = address.line1;
          if (address.line2 !== undefined) user.addresses[idx].line2 = address.line2;
          if (address.city !== undefined) user.addresses[idx].city = address.city;
          if (address.state !== undefined) user.addresses[idx].state = address.state;
          if (address.zip !== undefined) user.addresses[idx].zip = address.zip;
          if (address.country !== undefined) user.addresses[idx].country = address.country;
          if (address.firstName !== undefined) user.addresses[idx].firstName = address.firstName;
          if (address.lastName !== undefined) user.addresses[idx].lastName = address.lastName;
          if (address.phone !== undefined) user.addresses[idx].phone = address.phone;
          if (address.label !== undefined) user.addresses[idx].label = address.label;
          if (address.isPrimary) {
            user.addresses.forEach((a, i) => { a.isPrimary = i === idx; });
          }
        } else if (user.address && String(user.address._id) === String(address._id)) {
          // legacy single-address field no longer used; ignoring update to `user.address`
        } else {
          const newAddr = { firstName: address.firstName || "", lastName: address.lastName || "", line1: address.line1 || "", line2: address.line2 || "", city: address.city || "", state: address.state || "", zip: address.zip || "", country: address.country ||"", phone: address.phone || "", label: address.label, isPrimary: !!address.isPrimary };
          user.addresses.push(newAddr);
          if (newAddr.isPrimary) {
            user.addresses.forEach((a, i) => { a.isPrimary = i === user.addresses.length - 1; });
          }
        }
      } else {
        const newAddr = { firstName: address.firstName || "", lastName: address.lastName || "", phone: address.phone || "", line1: address.line1 || "", line2: address.line2 || "", city: address.city || "", state: address.state || "", zip: address.zip || "", country: address.country || "", label: address.label, isPrimary: !!address.isPrimary };
        user.addresses.push(newAddr);
        const hasPrimary = user.addresses.some(a => a.isPrimary);
        if (newAddr.isPrimary || !hasPrimary) {
          user.addresses.forEach(a => { a.isPrimary = false; });
          newAddr.isPrimary = true;
        }
      }
    }    
    // removed duplicated address upsert block


    await user.save();
    const addresses = user.addresses || [];
    const primaryAddress = addresses.find(a => a.isPrimary) || addresses[0] || null;
    return res.status(200).json({ success: true, user: { name: user.name, email: user.email, phone: user.phone, cartData: user.cartData, addresses, primaryAddress } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.body.userId;
    const { currentPassword, newPassword } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'Not authorized' });
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Provide current and new passwords' });

    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'Provide a strong password (>=8 chars)' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordLength = newPassword.length;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password updated' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const sendSecurityOtp = async (req, res) => {
  try {
    const userId = req.body.userId;
    if (!userId) return res.status(400).json({ success: false, message: 'Not authorized' });

    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    user.securityOtp = hashedOtp;
    user.securityOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    // prepare email content
    const subject = 'Verification code for account access';
    const text = `${user.name || ''},\n\nSomeone is attempting to access your account data.\nIf this was you, your verification code is: ${otp}\nIf you didn't request it: click here to deny.\n\nDon’t share it with others.\n`;

    // configure transporter (reuse existing logic in file)
    let transporter;
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        tls: { rejectUnauthorized: false }
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `no-reply@${process.env.FRONTEND_URL?.replace(/^https?:\/\//,'') || 'local'}`,
      to: user.email,
      subject,
      text,
      html: `<p>${text.replace(/\n/g,'<br/>')}</p>`
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log('Preview security otp email URL:', previewUrl);

    return res.status(200).json({ success: true, message: 'Verification code sent to your email', previewUrl: process.env.NODE_ENV === 'production' ? undefined : previewUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const verifySecurityOtp = async (req, res) => {
  try {
    const userId = req.body.userId;
    const { otp } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'Not authorized' });
    if (!otp) return res.status(400).json({ success: false, message: 'OTP required' });

    const user = await userModel.findById(userId).select('+securityOtp +securityOtpExpires');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (!user.securityOtp || !user.securityOtpExpires || user.securityOtpExpires < Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP expired or not found' });
    }

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    if (hashedOtp !== user.securityOtp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // clear OTP so it cannot be reused
    user.securityOtp = undefined;
    user.securityOtpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ success: true, message: 'OTP verified' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


export { loginUser, registerUser, adminLogin, forgotPassword, resetPassword, getProfile, updateProfile, changePassword, sendSecurityOtp, verifySecurityOtp};
