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
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'; // JWT 密钥
const TOKEN_EXPIRATION = '12h'; // Token 有效期
const uploadDir = 'public/images/';

const transporter = nodemailer.createTransport({
  service: 'gmail', // 使用 Gmail 服务（根据你的邮件服务商调整）
  auth: {
    user: process.env.EMAIL_USER, // 在 .env 文件中配置邮箱用户名
    pass: process.env.EMAIL_PASS, // 在 .env 文件中配置邮箱密码或应用专用密码
  },
});

// 配置 multer 存储方式
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // 指定存储路径
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});



// 设置 multer 中间件
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制文件大小为 5MB
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = fileTypes.test(file.mimetype);
    if (extName && mimeType) {
      cb(null, true);
    } else {
      cb(new Error('Only images (jpeg, jpg, png) are allowed'));
    }
  },
});


/**
 * 用户注册 (/signup)
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 检查用户是否已存在
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // 哈希密码
    const hashedPassword = await hashPassword(password);

    // 生成 6 位验证码
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    // 创建用户并存储验证码
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

    // 发送验证邮件
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

/**
 * 验证账号 (/verify)
 */
router.post('/verify', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    // 查询用户是否有该验证码
    const user = await prisma.users.findFirst({
      where: {
        verificationCode: code,
        isActive: false,
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // 检查验证码是否过期（有效期 15 分钟）
    const codeCreationTime = new Date(user.verificationCodeCreatedAt);
    const currentTime = new Date();
    const timeDiff = (currentTime - codeCreationTime) / (1000 * 60); // 转换为分钟

    if (timeDiff > 15) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // 激活用户并清除验证码
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
/**
 * 用户登录 (/login)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ userId: user.userId, email: user.email }, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRATION,
    });

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 更新用户个人信息 (/userProfile/:userId)
 */
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

/**
 * 用户上传头像 (/userProfile/:userId/avatar)
 */
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

/**
 * 用户上传背景图片 (/userProfile/:userId/background)
 */
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
