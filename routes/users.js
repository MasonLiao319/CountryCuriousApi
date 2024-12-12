import express from 'express';
import multer from 'multer';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword } from '../lib/utility.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer'; 

dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'; 
const TOKEN_EXPIRATION = '12h'; // Token validity period
const uploadDir = 'public/images/';

// Configure email transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS, 
  },
});

// Configure Multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Save files to the specified directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);// Generate unique filename
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});



// Multer middleware setup for image uploads
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());// Check file extension
    const mimeType = fileTypes.test(file.mimetype);// Check MIME type
    if (extName && mimeType) {
      cb(null, true);// Accept the file
    } else {
      cb(new Error('Only images (jpeg, jpg, png) are allowed'));
    }
  },
});


router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await hashPassword(password);

   
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    await prisma.users.create({
      data: {
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        isActive: false,
        verificationCode,
        verificationCodeCreatedAt: new Date(),
        userSettings: { create: { notifications: true, language: 'English' } },
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Country Curious: Verify Your Account',
      text: `Hi ${firstName},\n\nYour verification code for Country Curious is: ${verificationCode}\n\nUse this code to activate your account.\n\nThank you!`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Verification email sent to:', email);
      res.status(201).json({
        message: 'Account created successfully. Verification email sent.',
      });
    } catch (err) {
      console.error('Error sending email:', err.message);
      res.status(500).json({ error: 'Failed to send verification email' });
    }
  } catch (error) {
    console.error('Error during signup:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// Route: Verify user account
router.post('/verify', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    // Find inactive user with the given code
    const user = await prisma.users.findFirst({
      where: {
        verificationCode: code,
        isActive: false,
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Check if the code has expired (valid for 15 minutes)
    const codeCreationTime = new Date(user.verificationCodeCreatedAt);
    const currentTime = new Date();
    const timeDiff = (currentTime - codeCreationTime) / (1000 * 60); 

    if (timeDiff > 15) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Activate user account
    await prisma.users.update({
      where: { email: user.email },
      data: {
        isActive: true,
        verificationCode: null,
        verificationCodeCreatedAt: null,
      },
    });

    res.status(200).json({ message: 'Account verified successfully' });
  } catch (error) {
    console.error('Error during verification:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route: User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find user by email
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Generate a JWT for the user
    const token = jwt.sign({ userId: user.userId, email: user.email }, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRATION,
    });

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.put('/userProfile/:userId', async (req, res) => {
  const { userId } = req.params;
  const { nickName, region, age } = req.body;

  try {
    if (!nickName && !region && !age) {
      return res.status(400).json({ error: 'At least one field (nickName, region, or age) is required' });
    }

    const updatedUser = await prisma.users.update({
      where: { userId: parseInt(userId, 10) },
      data: {
        nickName: nickName || undefined,
        region: region || undefined,
        age: age !== undefined ? parseInt(age, 10) : undefined,
      },
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating profile:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});


router.post('/userProfile/:userId/avatar', upload.single('avatar'), async (req, res) => {
  const { userId } = req.params;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const avatarURL = `${req.protocol}://${req.get('host')}/images/${req.file.filename}`;
    const updatedUser = await prisma.users.update({
      where: { userId: parseInt(userId, 10) },
      data: { avatarURL },
    });

    res.status(200).json({
      message: 'Avatar uploaded successfully',
      avatarURL: updatedUser.avatarURL,
    });
  } catch (error) {
    console.error('Error uploading avatar:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});


router.post('/userProfile/:userId/background', upload.single('background'), async (req, res) => {
  const { userId } = req.params;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const backgroundURL = `${req.protocol}://${req.get('host')}/images/${req.file.filename}`;
    const updatedUser = await prisma.users.update({
      where: { userId: parseInt(userId, 10) },
      data: { backgroundURL },
    });

    res.status(200).json({
      message: 'Background image uploaded successfully',
      backgroundURL: updatedUser.backgroundURL,
    });
  } catch (error) {
    console.error('Error uploading background:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});
export default router;
