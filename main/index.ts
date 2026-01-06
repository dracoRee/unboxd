import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma.js';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';
import multer from 'multer';
import { identifyCollectible } from './services/ai.service.js';

dotenv.config();

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Register
app.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const hashedPassword = await argon2.hash(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });
    res.status(201).json({ message: 'User created', userId: user.id });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await argon2.verify(user.password, password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot Password
app.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if user exists for security, but for now we follow typical flow
      return res.status(200).json({ message: 'If an account exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { email },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
      },
    });

    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: '"Unboxed Auth" <noreply@unboxed.com>',
      to: email,
      subject: 'Password Reset',
      text: `Click here to reset your password: ${resetLink}`,
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    });

    res.json({ message: 'Reset link sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});

// Reset Password
app.post('/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const hashedPassword = await argon2.hash(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI Recognition
app.post('/ai/recognize', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided' });
  }

  try {
    const identification = await identifyCollectible(req.file.buffer, req.file.mimetype);
    
    // Attempt to find the matching collectible in our database
    const collectible = await prisma.collectible.findFirst({
      where: {
        name: { contains: identification.name, mode: 'insensitive' },
        series: { name: { contains: identification.series, mode: 'insensitive' } }
      },
      include: { series: true }
    });

    res.json({ identification, dbMatch: collectible });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'AI recognition failed' });
  }
});

// Collection Management
app.get('/collection/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const collection = await prisma.userCollectible.findMany({
      where: { userId: parseInt(userId) },
      include: {
        collectible: {
          include: { series: true }
        }
      }
    });

    // Group by series to show mastery progress
    const seriesStats = await prisma.series.findMany({
      include: { items: true }
    });

    const userProgress = seriesStats.map((series: any) => {
      const ownedInSeries = collection.filter((uc: any) => uc.collectible.seriesId === series.id);
      return {
        seriesId: series.id,
        seriesName: series.name,
        totalItems: series.items.length,
        ownedItems: ownedInSeries.length,
        items: series.items.map((item: any) => ({
          ...item,
          isOwned: ownedInSeries.some((uc: any) => uc.collectibleId === item.id)
        }))
      };
    });

    res.json(userProgress);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

app.post('/collection/add', async (req, res) => {
  const { userId, collectibleId } = req.body;
  try {
    const userCollectible = await prisma.userCollectible.create({
      data: {
        userId: parseInt(userId),
        collectibleId: parseInt(collectibleId)
      }
    });
    res.status(201).json(userCollectible);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add item to collection' });
  }
});

// Trades API
app.post('/trades', async (req, res) => {
  const { proposerId, receiverId, targetItemId, offeredItemIds } = req.body;
  try {
    const trade = await prisma.trade.create({
      data: {
        proposerId: parseInt(proposerId),
        receiverId: parseInt(receiverId),
        targetItemId: parseInt(targetItemId),
        status: 'PENDING',
        offeredItems: {
          create: offeredItemIds.map((id: number) => ({ collectibleId: id }))
        }
      },
      include: {
        offeredItems: { include: { collectible: true } },
        targetItem: true,
        proposer: { select: { name: true, email: true } },
        receiver: { select: { name: true, email: true } }
      }
    });
    res.status(201).json(trade);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to propose trade' });
  }
});

app.get('/trades/:userId', async (req, res) => {
  const { userId } = req.params;
  const id = parseInt(userId);
  try {
    const trades = await prisma.trade.findMany({
      where: {
        OR: [{ proposerId: id }, { receiverId: id }]
      },
      include: {
        offeredItems: { include: { collectible: true } },
        targetItem: true,
        proposer: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
        messages: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(trades);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

app.patch('/trades/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const trade = await prisma.trade.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    // If accepted, we could theoretically swap ownership here, 
    // but for prototype, we just update status.
    res.json(trade);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update trade' });
  }
});

// Wishlist API
app.post('/wishlist', async (req, res) => {
  const { userId, collectibleId } = req.body;
  try {
    const item = await prisma.wishlistItem.create({
      data: {
        userId: parseInt(userId),
        collectibleId: parseInt(collectibleId)
      }
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

app.get('/wishlist/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const wishlist = await prisma.wishlistItem.findMany({
      where: { userId: parseInt(userId) },
      include: {
        collectible: { include: { series: true } }
      }
    });
    res.json(wishlist.map(w => w.collectible));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

app.delete('/wishlist/:userId/:collectibleId', async (req, res) => {
  const { userId, collectibleId } = req.params;
  try {
    await prisma.wishlistItem.delete({
      where: {
        userId_collectibleId: {
          userId: parseInt(userId),
          collectibleId: parseInt(collectibleId)
        }
      }
    });
    res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

// Messaging API
app.post('/messages', async (req, res) => {
  const { tradeId, senderId, content } = req.body;
  try {
    const message = await prisma.message.create({
      data: {
        tradeId: parseInt(tradeId),
        senderId: parseInt(senderId),
        content
      }
    });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.get('/messages/:tradeId', async (req, res) => {
  const { tradeId } = req.params;
  try {
    const messages = await prisma.message.findMany({
      where: { tradeId: parseInt(tradeId) },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { name: true } } }
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
