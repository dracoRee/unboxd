import express from 'express';
import cors from 'cors';
import { prisma } from './lib/prisma.js';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';
import multer from 'multer';
import { uploadFile, ensureBucketsExist } from './services/storage.service.js';
import { createClient } from '@supabase/supabase-js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const upload = multer({ storage: multer.memoryStorage() });

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

import { createServer } from 'http';
import { Server } from 'socket.io';

const FRONTEND_URL = process.env.FRONTEND_URL;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin:FRONTEND_URL, // allow requests from port 4200 to port 3000
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin:FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

// Socket.io connection handling
// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`User ${socket.id} joined conversation_${conversationId}`);
  });

  socket.on('send_message', async (data) => {
    const { conversationId, senderId, content, senderName, imageUrl } = data;
    
    // Fetch sender profile picture from PublicUser
    let profilePicture = null;
    try {
      const sender = await prisma.publicUser.findUnique({
        where: { id: parseInt(senderId) },
        select: { profilePicture: true }
      });
      profilePicture = sender?.profilePicture || null;
    } catch (error) {
      console.error('Failed to fetch sender profile picture:', error);
    }
    
    const messagePayload = {
      id: Math.random(), // Temp ID for the UI
      conversationId: parseInt(conversationId),
      senderId: parseInt(senderId),
      content,
      imageUrl: imageUrl || null,
      createdAt: new Date().toISOString(),
      sender: { name: senderName || 'User', profilePicture }
    };

    // 1. Broadcast to everyone else in the room immediately
    socket.to(`conversation_${conversationId}`).emit('new_message', messagePayload);
    
    // Also emit to sender (for optimistic UI updates)
    socket.emit('new_message', messagePayload);

    // 2. Background persistence
    try {
      await prisma.message.create({
        data: {
          conversationId: parseInt(conversationId),
          senderId: parseInt(senderId),
          content,
          imageUrl: imageUrl || null
        }
      });
      await prisma.conversation.update({
        where: { id: parseInt(conversationId) },
        data: { updatedAt: new Date() }
      });
    } catch (error) {
      console.error('Socket message save failed:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports (like 587)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  }
});

// Register
app.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  
  // Add validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    console.log(`[Registration] Attempting to register: ${email}`);
    
    // Check if user already exists in local database
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.log(`[Registration] User already exists in database: ${email}`);
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    const hashedPassword = await argon2.hash(password);
    
    // 1. Create user in Supabase Auth first
    let { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password, // Supabase will hash this
      email_confirm: true,
      user_metadata: { name }
    });

    // Handle "User already exists" by cleaning up stale Supabase record if it's not in Prisma
    // This handles the case where a user was deleted from the local DB but not Supabase (common in dev/test)
    if (supabaseError && ((supabaseError as any).code === 'email_exists' || supabaseError.message?.includes('already been registered'))) {
      console.log(`[Registration] Detect desync: User ${email} exists in Supabase but not locally.`);
      try {
        console.log(`[Registration] Attempting to find and delete stale Supabase user...`);
        // Fetch users to find the ID (listUsers defaults to 50, trying 1000 to be safe)
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        
        const inputEmail = email.toLowerCase();
        // Since listUsers might not support efficient filtering in all versions, we search the returned list
        const staleUser = listData?.users.find(u => u.email?.toLowerCase() === inputEmail);

        if (staleUser) {
          console.log(`[Registration] Deleting stale Supabase user: ${staleUser.id}`);
          await supabaseAdmin.auth.admin.deleteUser(staleUser.id);
          
          console.log(`[Registration] Retrying creation for ${email}...`);
          const retryResult = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name }
          });

          if (!retryResult.error) {
            console.log('[Registration] Retry successful.');
            supabaseUser = retryResult.data;
            supabaseError = null; // Clear error to proceed
          } else {
            console.error('[Registration] Retry failed:', retryResult.error);
            supabaseError = retryResult.error;
          }
        } else {
           // If pagination is an issue, we might miss the user. 
           // In valid use cases, this block shouldn't be reached if 'email_exists' was true.
           console.warn(`[Registration] 'email_exists' error received but user not found in the first batch of users.`);
        }
      } catch (cleanupErr) {
        console.error('[Registration] Cleanup attempt failed:', cleanupErr);
      }
    }

    if (supabaseError) {
      console.error('Supabase Auth Error:', supabaseError, email); // Add detailed logging
      return res.status(400).json({ 
        error: supabaseError.message || 'Failed to create user in authentication system',
        details: process.env.NODE_ENV === 'development' ? supabaseError : undefined
      });
    }

    // 2. Create user in database with transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword, // For backend compatibility
        },
      });

      await tx.publicUser.create({
        data: {
          id: newUser.id,
          name: name || 'User',
          bio: null,
          profilePicture: null
        }
      });

      return newUser;
    });

    res.status(201).json({ message: 'User created', userId: user.id });
  } catch (error: any) {
    console.error('Registration Error:', error); // Add detailed logging
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { publicUser: true }
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await argon2.verify(user.password, password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.publicUser?.name } });
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

    console.log(`[Development] Reset Link: ${resetLink}`); // Log link for testing without email

    await transporter.sendMail({
      from: '"Unboxed Auth" <noreply@unboxd.com>',
      to: email,
      subject: 'Password Reset',
      text: `Click here to reset your password: ${resetLink}`,
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    });

    console.log(`Reset email sent successfully to ${email}`);
    res.json({ message: 'Reset link sent' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ 
      error: 'Failed to send reset email',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined 
    });
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

    // 1. Update Supabase Auth Password
    // We search for the user by email to get their Supabase UID
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error('Supabase Auth List Error:', listError);
    } else {
      const supabaseUser = users.find(u => u.email === user.email);
      if (supabaseUser) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          supabaseUser.id,
          { password: newPassword }
        );
        if (updateError) {
          console.error('Supabase Auth Update Error:', updateError);
        } else {
          console.log(`Supabase Auth password updated for ${user.email}`);
        }
      } else {
        console.warn(`User ${user.email} not found in Supabase Auth`);
      }
    }

    // 2. Update local DB
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
    console.error('Reset Password Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
});



// Get User Listings
app.get('/users/listings/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const listings = await prisma.userListing.findMany({
      where: { userId: parseInt(userId) },
      include: {
        collectible: {
          select: { name: true, series: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(listings);
  } catch (error) {
    console.error('Listings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// Collection Management
app.get('/collection/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const collection = await prisma.userCollectible.findMany({
      where: { userId: parseInt(userId) },
      // include: { series: true } // Optional if we want series name directly, but we map below
    });

    // Group by series to show mastery progress
    const seriesStats = await prisma.series.findMany({
      include: { items: true } // We still need total count from Series->items relation? 
      // Actually, if we track by count, we need to know how many items are in the series.
      // The Series model still has `items Collectible[]`.
    });

    const userProgress = seriesStats.map((series: any) => {
      const userItemsInSeries = collection.filter((uc: any) => uc.seriesId === series.id);
      return {
        seriesId: series.id,
        seriesName: series.name,
        totalItems: series.totalItems || series.items.length, // Fallback if totalItems is null
        ownedItems: userItemsInSeries.length,
        items: userItemsInSeries.map((uc: any) => ({
          id: uc.id,
          name: uc.name || 'Unnamed Item',
          imageUrl: uc.imageUrl,
          serialNumber: uc.serialNumber,
          condition: uc.condition,
          referenceValue: uc.referenceValue,
          demoVideoUrl: uc.demoVideoUrl,
          receiptUrl: uc.receiptUrl,
          isOwned: true
        }))
      };
    }).filter(series => series.ownedItems > 0); // Only return series the user has started collecting

    res.json(userProgress);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

app.post('/collection/add', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'demoVideo', maxCount: 1 },
  { name: 'receipt', maxCount: 1 }
]), async (req, res) => {
  try {
    const { userId, seriesId, name, condition, referenceValue, serialNumber } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const timestamp = Date.now();

    // 1. Upload main image
    let imageUrl = req.body.imageUrl; // Could come from "Scan" feature (string URL)
    if (files?.image?.[0]) {
      // If manually uploaded
      const imageFile = files.image[0];
      imageUrl = await uploadFile(
        'users-collection',
        `${userId}/collection/${timestamp}_img.${imageFile.originalname.split('.').pop()}`,
        imageFile.buffer,
        imageFile.mimetype
      );
    }

    // 2. Upload Demo Video
    let demoVideoUrl = null;
    if (files?.demoVideo?.[0]) {
      const demoVideoFile = files.demoVideo[0];
      demoVideoUrl = await uploadFile(
        'users-collection',
        `${userId}/collection/${timestamp}_demo.${demoVideoFile.originalname.split('.').pop()}`,
        demoVideoFile.buffer,
        demoVideoFile.mimetype
      );
    }

    // 3. Upload Receipt
    let receiptUrl = null;
    if (files?.receipt?.[0]) {
      const receiptFile = files.receipt[0];
      receiptUrl = await uploadFile(
        'users-collection',
        `${userId}/collection/${timestamp}_receipt.${receiptFile.originalname.split('.').pop()}`,
        receiptFile.buffer,
        receiptFile.mimetype
      );
    }

    const userCollectible = await prisma.userCollectible.create({
      data: {
        userId: parseInt(userId),
        seriesId: parseInt(seriesId),
        name,
        imageUrl: imageUrl || '', // Should enforce requirement in frontend
        condition: condition || 'BRAND_NEW',
        referenceValue: referenceValue ? parseFloat(referenceValue) : 0,
        serialNumber: serialNumber || null,
        demoVideoUrl,
        receiptUrl
      }
    });
    res.status(201).json(userCollectible);
  } catch (error) {
    console.error('Failed to add item to collection:', error);
    res.status(500).json({ error: 'Failed to add item to collection' });
  }
});

// Update Collection Item
app.patch('/collection/:id', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'demoVideo', maxCount: 1 },
  { name: 'receipt', maxCount: 1 }
]), async (req, res) => {
  const { id } = req.params;
  try {
    const { name, condition, referenceValue, serialNumber } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    // Check ownership
    const existingItem = await prisma.userCollectible.findUnique({ where: { id: parseInt(id) } });
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const timestamp = Date.now();
    const userId = existingItem.userId;
    const updates: any = {};

    if (name) updates.name = name;
    if (condition) updates.condition = condition;
    if (referenceValue) updates.referenceValue = parseFloat(referenceValue);
    if (serialNumber) updates.serialNumber = serialNumber;

    if (files?.image?.[0]) {
      const imageFile = files.image[0];
      updates.imageUrl = await uploadFile(
        'users-collection',
        `${userId}/collection/${timestamp}_img.${imageFile.originalname.split('.').pop()}`,
        imageFile.buffer,
        imageFile.mimetype
      );
    }

    if (files?.demoVideo?.[0]) {
      const demoVideoFile = files.demoVideo[0];
      updates.demoVideoUrl = await uploadFile(
        'users-collection',
        `${userId}/collection/${timestamp}_demo.${demoVideoFile.originalname.split('.').pop()}`,
        demoVideoFile.buffer,
        demoVideoFile.mimetype
      );
    }

    if (files?.receipt?.[0]) {
      const receiptFile = files.receipt[0];
      updates.receiptUrl = await uploadFile(
        'users-collection',
        `${userId}/collection/${timestamp}_receipt.${receiptFile.originalname.split('.').pop()}`,
        receiptFile.buffer,
        receiptFile.mimetype
      );
    }

    const updatedItem = await prisma.userCollectible.update({
      where: { id: parseInt(id) },
      data: updates
    });

    res.json(updatedItem);
  } catch (error) {
     console.error('Failed to update item:', error);
     res.status(500).json({ error: 'Failed to update item' });
  }
});

app.delete('/collection/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.userCollectible.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Collectible deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete collectible' });
  }
});

app.get('/series', async (req, res) => {
  try {
    const series = await prisma.series.findMany({
      select: { id: true, name: true, totalItems: true }
    });
    res.json(series);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch series' });
  }
});

// Get all collectibles for selection
app.get('/collectibles', async (req, res) => {
  try {
    const { seriesId } = req.query;
    const where: any = {};
    if (seriesId) {
      where.seriesId = parseInt(seriesId as string);
    }

    const collectibles = await prisma.collectible.findMany({
      where,
      select: { 
        id: true, 
        name: true, 
        imageUrl: true, 
        referenceValue: true,
        rarity: true,
        series: { 
          select: { name: true } 
        } 
      },
      orderBy: { name: 'asc' }
    });
    res.json(collectibles);
  } catch (error) {
    console.error('Error fetching collectibles:', error);
    res.status(500).json({ error: 'Failed to fetch collectibles' });
  }
});

// Get collectibles for a series with user ownership status
app.get('/series/:seriesId/collectibles/:userId', async (req, res) => {
  try {
    const { seriesId, userId } = req.params;
    
    // Get all collectibles in the series
    const collectibles = await prisma.collectible.findMany({
      where: { seriesId: parseInt(seriesId) },
      select: {
        id: true,
        name: true,
        rarity: true,
        referenceValue: true,
        seriesId: true
      },
      orderBy: { name: 'asc' }
    });

    // Get user's collectibles in this series (UserCollectible)
    const userCollectibles = await prisma.userCollectible.findMany({
      where: {
        userId: parseInt(userId),
        seriesId: parseInt(seriesId)
      },
      select: {
        id: true,
        name: true,
        imageUrl: true
      }
    });

    // Create a map of owned collectible names for quick lookup
    // Note: UserCollectible.name might match Collectible.name
    const ownedNames = new Set(userCollectibles.map(uc => uc.name?.toLowerCase().trim()).filter(Boolean));
    
    // Map collectibles with ownership status
    const collectiblesWithStatus = collectibles.map(collectible => {
      // Check if user owns this collectible by name match
      const isOwned = ownedNames.has(collectible.name.toLowerCase().trim());
      
      // Find the user's collectible image if owned
      const userCollectible = userCollectibles.find(uc => 
        uc.name?.toLowerCase().trim() === collectible.name.toLowerCase().trim()
      );
      
      return {
        ...collectible,
        imageUrl: userCollectible?.imageUrl || null,
        isOwned
      };
    });

    res.json(collectiblesWithStatus);
  } catch (error) {
    console.error('Error fetching series collectibles:', error);
    res.status(500).json({ error: 'Failed to fetch series collectibles' });
  }
});

app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const bucketName = 'users-collection';
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    
    if (!buckets?.find(b => b.name === bucketName)) {
      console.log(`Bucket '${bucketName}' not found. Creating...`);
      const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/avif']
      });
      if (createError) {
        console.error('Failed to create bucket:', createError);
        return res.status(500).json({ error: 'Failed to initialize storage' });
      }
    }

    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    res.json({ url: publicUrl });
  } catch (error) {

    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Trades API
app.post('/trades', async (req, res) => {
  const { proposerId, receiverId, targetItemId, offeredItemIds, buyerPaysCash, cashTopUp } = req.body;
  try {

    // Validate offered item IDs
    if (!Array.isArray(offeredItemIds) || offeredItemIds.length === 0) {
      return res.status(400).json({ error: 'offeredItemIds must be a non-empty array of integers' });
    }

    const offeredIds = offeredItemIds
      .map((id: any) => Number(id))
      .filter((id: number) => Number.isInteger(id));

    if (offeredIds.length !== offeredItemIds.length || offeredIds.some((id: number) => Number.isNaN(id))) {
      return res.status(400).json({ error: 'offeredItemIds must contain only valid integers' });
    }

    if (offeredIds.some((id: number) => id <= 0)) {
      return res.status(400).json({ error: 'offeredItemIds must contain only positive integers' });
    }

    const proposer = await prisma.user.findUnique({ where: { id: parseInt(proposerId) } });
    const receiver = await prisma.user.findUnique({ where: { id: parseInt(receiverId) } });

    if (!proposer) return res.status(400).json({ error: 'Proposer does not exist' });
    if (!receiver) return res.status(400).json({ error: 'Receiver does not exist' });

    // Ensure all offered collectible IDs exist
    const existingCollectibles = await prisma.collectible.findMany({
      where: { id: { in: offeredIds } },
      select: { id: true }
    });

    if (existingCollectibles.length !== offeredIds.length) {
      const existingIds = new Set(existingCollectibles.map(c => c.id));
      const missingIds = offeredIds.filter(id => !existingIds.has(id));
      return res.status(400).json({ error: 'One or more offered collectibles do not exist', missingIds });
    }

    console.log('Offered collectible IDs:', offeredIds);
    const trade = await prisma.trade.create({
      data: {
        proposerId: parseInt(proposerId),
        receiverId: parseInt(receiverId),
        targetItemId: parseInt(targetItemId),
        status: 'PENDING',
        offeredItems: {
          create: offeredIds.map((id: number) => ({ collectibleId: id }))
        }
      },
      include: {
        offeredItems: { include: { collectible: true } },
        targetItem: true,
        proposer: { 
          select: { 
            email: true,
            publicUser: { select: { name: true } }
          } 
        },
        receiver: { 
          select: { 
            email: true,
            publicUser: { select: { name: true } }
          } 
        }
      }
    });

    const mappedTrade = {
      ...trade,
      proposer: { ...trade.proposer, name: trade.proposer.publicUser?.name || 'User' },
      receiver: { ...trade.receiver, name: trade.receiver.publicUser?.name || 'User' }
    };
    res.status(201).json(mappedTrade);
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
        proposer: { 
          select: { 
            id: true,
            publicUser: { select: { name: true } }
          } 
        },
        receiver: { 
          select: { 
            id: true,
            publicUser: { select: { name: true } }
          } 
        },
        messages: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const mappedTrades = trades.map((t: any) => ({
      ...t,
      proposer: { id: t.proposer.id, name: t.proposer.publicUser?.name || 'User' },
      receiver: { id: t.receiver.id, name: t.receiver.publicUser?.name || 'User' }
    }));
    
    res.json(mappedTrades);
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
  const { userId, listingId } = req.body;
  try {
    const item = await prisma.wishlistItem.create({
      data: {
        userId: parseInt(userId),
        listingId: parseInt(listingId)
      }
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

app.get('/wishlist/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const wishlist = await prisma.wishlistItem.findMany({
      where: { userId: parseInt(userId) },
      include: {
        listing: {
          include: {
            collectible: { include: { series: true } },
            user: { include: { user: true } }
          }
        }
      }
    });
    // Map to return the listing (which contains the collectible)
    res.json(wishlist.map(w => ({
      ...w.listing,
      // Ensure it matches the TradeItem expectation if needed, or let frontend map it
    })));
  } catch (error) {
    console.error('Fetch wishlist error:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

app.delete('/wishlist/:userId/:listingId', async (req, res) => {
  const { userId, listingId } = req.params;
  try {
    await prisma.wishlistItem.delete({
      where: {
        userId_listingId: {
          userId: parseInt(userId),
          listingId: parseInt(listingId)
        }
      }
    });
    res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

// Messaging & Conversations API

// Sync User (Find or Create)
app.post('/users/sync', async (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    let user = await prisma.user.findUnique({
      where: { email },
      include: { publicUser: true }
    });

    if (!user) {
      // Create user and PublicUser in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Generate unique username
        let baseUsername = email.split('@')[0];
        let username = baseUsername;
        let counter = 0;
        
        while (await tx.user.findUnique({ where: { username } })) {
          counter++;
          username = `${baseUsername}${counter}`;
        }

        const newUser = await tx.user.create({
          data: {
            email,
            password: 'SUPABASE_AUTH_USER', // Placeholder
            username
          },
        });

        // Create PublicUser entry
        await tx.publicUser.create({
          data: {
            id: newUser.id,
            name: name || username,
            username: username,
            bio: null,
            profilePicture: null
          }
        });

        return await tx.user.findUnique({
          where: { id: newUser.id },
          include: { publicUser: true }
        });
      });

      user = result;
    }
    
    res.json({
      id: user?.id,
      email: user?.email,
      username: user?.username,
      name: user?.publicUser?.name,
      // Expose public profile data from the PublicUser table so the frontend
      // (e.g. navbar avatar) can render from the public profile source of truth.
      profilePicture: user?.publicUser?.profilePicture,
      bio: user?.publicUser?.bio ?? null
    });
  } catch (error) {
    console.error('Sync failed:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Search Users
app.get('/users/search', async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') return res.json([]);
  
  try {
    const PublicUsers = await prisma.publicUser.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { username: { contains: q, mode: 'insensitive' } }
        ]
      },
      select: { 
        id: true,
        name: true,
        username: true,
        profilePicture: true,
        user: {
          select: { email: true }
        }
      }
    });
    
    // Transform to match expected format
    const users = PublicUsers.map(pu => ({
      id: pu.id,
      name: pu.name,
      username: pu.username,
      email: pu.user.email,
      profilePicture: pu.profilePicture
    }));
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get Profile
app.get('/users/profile/:id', async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.query.currentUserId ? parseInt(req.query.currentUserId as string) : undefined;

  try {
    const userId = parseInt(id);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });

    // Read from PublicUser table
    const PublicUser = await prisma.publicUser.findUnique({
      where: { id: userId },
      select: {
        name: true,
        username: true,
        bio: true,
        profilePicture: true,
        isVerified: true,
        user: {
          select: {
            id: true,
            email: true,
            _count: {
              select: {
                followedBy: true,
                following: true,
                collection: true
              }
            }
          }
        },
        _count: {
          select: {
            listings: true
          }
        }
      }
    });

    if (!PublicUser) return res.status(404).json({ error: 'User not found' });
    
    // Check if following status
    let isFollowing = false;
    if (currentUserId) {
        // Query the relation to see if connection exists
        const following = await (prisma as any).user.findUnique({
            where: { id: currentUserId },
            select: { 
                following: {
                    where: { id: userId },
                    select: { id: true }
                }
            }
        });
        isFollowing = following?.following?.length > 0;
    }
    
    // Construct response matching the expected format
    const response = {
      id: PublicUser.user.id,
      name: PublicUser.name,
      username: PublicUser.username,
      email: PublicUser.user.email,
      bio: PublicUser.bio,
      profilePicture: PublicUser.profilePicture,
      _count: {
        ...PublicUser.user._count,
        listings: (PublicUser as any)._count.listings
      },
      isFollowing
    };

    res.json(response);
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile', details: error?.message });
  }
});

// Update Profile
app.patch('/users/profile', async (req, res) => {
  const { userId, name, bio, profilePicture, username } = req.body;
  try {
    // Update both user and PublicUser tables in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update User table
      await tx.user.update({
        where: { id: parseInt(userId) },
        data: { name, bio, profilePicture, username }
      });

      // Update PublicUser table
      const PublicUser = await tx.publicUser.upsert({
        where: { id: parseInt(userId) },
        update: { name, bio, profilePicture, username },
        create: { 
          id: parseInt(userId), 
          name: name || 'User', 
          username,
          bio, 
          profilePicture 
        },
        select: { id: true, name: true, bio: true, profilePicture: true, username: true }
      });

      return PublicUser;
    });

    res.json({ ...result, id: parseInt(userId) });
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
        return res.status(400).json({ error: 'Username already taken' });
    }
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Follow User
app.post('/users/follow/:id', async (req, res) => {
  const { followerId } = req.body;
  const targetId = parseInt(req.params.id);

  try {
    await prisma.user.update({
      where: { id: parseInt(followerId) },
      data: {
        following: {
          connect: { id: targetId }
        }
      }
    });
    res.json({ message: 'Followed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// Unfollow User
app.post('/users/unfollow/:id', async (req, res) => {
  const { followerId } = req.body;
  const targetId = parseInt(req.params.id);

  try {
    await prisma.user.update({
      where: { id: parseInt(followerId) },
      data: {
        following: {
          disconnect: { id: targetId }
        }
      }
    });
    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// Get Followers
app.get('/users/:id/followers', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        followedBy: {
          select: { 
            id: true, 
            publicUser: {
              select: { name: true, profilePicture: true }
            }
          }
        }
      }
    });

    const followers = user?.followedBy.map((f: any) => ({
      id: f.id,
      name: f.publicUser?.name || 'User',
      profilePicture: f.publicUser?.profilePicture || null
    })) || [];

    res.json(followers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// Get Following
app.get('/users/:id/following', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        following: {
          select: { 
            id: true, 
            publicUser: {
              select: { name: true, profilePicture: true }
            }
          }
        }
      }
    });

    const following = user?.following.map((f: any) => ({
      id: f.id,
      name: f.publicUser?.name || 'User',
      profilePicture: f.publicUser?.profilePicture || null
    })) || [];

    res.json(following);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

// Get/Start Conversation
app.post('/conversations', async (req, res) => {
  const { userIds } = req.body; // Array of user IDs including self
  
  if (!userIds || !Array.isArray(userIds) || userIds.length < 2) {
    return res.status(400).json({ error: 'Invalid participants payload' });
  }

  try {
    const ids = userIds.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id));
    
    if (ids.length < 2) {
      console.error('Invalid user IDs for conversation:', userIds);
      return res.status(400).json({ error: 'Invalid user IDs provided' });
    }

    const [userId1, userId2] = ids;

    // Check if conversation exists
    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { users: { some: { id: userId1 } } },
          { users: { some: { id: userId2 } } }
        ]
      },
      include: { 
        users: { 
          select: { 
            id: true, 
            publicUser: {
              select: {
                name: true,
                profilePicture: true
              }
            }
          } 
        } 
      }
    });

    if (existing) {
      const mappedExisting = {
        ...existing,
        users: existing.users.map((user: any) => ({
          id: user.id,
          name: user.publicUser?.name || 'User',
          profilePicture: user.publicUser?.profilePicture || null
        }))
      };
      return res.json(mappedExisting);
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        users: {
          connect: ids.map((id: number) => ({ id }))
        }
      },
      include: { 
        users: { 
          select: { 
            id: true, 
            publicUser: {
              select: {
                name: true,
                profilePicture: true
              }
            }
          } 
        } 
      }
    });
    
    // Map conversation to use publicUser details if available
    const mappedConversation = {
      ...conversation,
      users: conversation.users.map((user: any) => ({
        id: user.id,
        name: user.publicUser?.name || 'User',
        profilePicture: user.publicUser?.profilePicture || null
      }))
    };
    
    console.log(`Created conversation ${conversation.id} for users ${ids.join(', ')}`);
    res.json(mappedConversation);
  } catch (error) {
    console.error('Failed to create conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation', details: String(error) });
  }
});

// Get User's Conversations
app.get('/conversations/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        users: { some: { id: parseInt(userId) } }
      },
      include: {
        users: { 
          select: { 
            id: true, 
            publicUser: {
              select: {
                name: true,
                profilePicture: true
              }
            }
          } 
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { 
            sender: { 
              select: { 
                publicUser: {
                  select: {
                    name: true,
                    profilePicture: true
                  }
                }
              } 
            } 
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    // Map conversations to use publicUser details if available
    const mappedConversations = conversations.map(conv => ({
      ...conv,
      users: conv.users.map((user: any) => ({
        id: user.id,
        name: user.publicUser?.name || 'User',
        profilePicture: user.publicUser?.profilePicture || null
      })),
      messages: conv.messages?.map((msg: any) => ({
        ...msg,
        sender: {
          name: msg.sender.publicUser?.name || 'User',
          profilePicture: msg.sender.publicUser?.profilePicture || null
        }
      })) || []
    }));
    res.json(mappedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

app.post('/messages', async (req, res) => {
  const { conversationId, senderId, content, imageUrl } = req.body;
  try {
    const message = await prisma.message.create({
      data: {
        conversationId: parseInt(conversationId),
        senderId: parseInt(senderId),
        content,
        imageUrl: imageUrl || null
      },
      include: {
        sender: { 
          select: { 
            publicUser: {
              select: {
                name: true,
                profilePicture: true
              }
            }
          } 
        }
      }
    });

    // Map message to use publicUser details if available
    const mappedMessage = {
      ...message,
      sender: {
        name: message.sender.publicUser?.name || 'User',
        profilePicture: message.sender.publicUser?.profilePicture || null
      }
    };

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: parseInt(conversationId) },
      data: { updatedAt: new Date() }
    });

    // Emit socket event
    io.to(`conversation_${conversationId}`).emit('new_message', mappedMessage);
    
    res.status(201).json(mappedMessage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.get('/messages/:conversationId', async (req, res) => {
  const { conversationId } = req.params;
  try {
    const messages = await prisma.message.findMany({
      where: { conversationId: parseInt(conversationId) },
      orderBy: { createdAt: 'asc' },
      include: { 
        sender: { 
          select: { 
            publicUser: {
              select: {
                name: true,
                profilePicture: true
              }
            }
          } 
        } 
      }
    });
    // Map messages to use publicUser details if available
    const mappedMessages = messages.map(msg => ({
      ...msg,
      sender: {
        name: msg.sender.publicUser?.name || 'User',
        profilePicture: msg.sender.publicUser?.profilePicture || null
      }
    }));
    res.json(mappedMessages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ============================================
// LISTING ENDPOINTS
// ============================================

// Create a new listing
app.post('/listings/create', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'demoVideo', maxCount: 1 },
  { name: 'receipt', maxCount: 1 }
]), async (req, res) => {
  try {
    const { userId, collectibleId, serialNumber, title, description, condition, referenceValue, dealMethods, seriesName } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!userId || !serialNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!files?.image || !files?.demoVideo || !files?.receipt) {
      return res.status(400).json({ error: 'All files (image, demoVideo, receipt) are required' });
    }

    const timestamp = Date.now();
    const imageFile = files.image[0];
    const demoVideoFile = files.demoVideo[0];
    const receiptFile = files.receipt[0];

    // Upload files to Supabase Storage
    const imageUrl = await uploadFile(
      'collectible-images',
      `${userId}/${timestamp}_image.${imageFile.originalname.split('.').pop()}`,
      imageFile.buffer,
      imageFile.mimetype
    );

    const demoVideoUrl = await uploadFile(
      'collectible-demos',
      `${userId}/${timestamp}_demo.${demoVideoFile.originalname.split('.').pop()}`,
      demoVideoFile.buffer,
      demoVideoFile.mimetype
    );

    const receiptUrl = await uploadFile(
      'collectible-receipts',
      `${userId}/${timestamp}_receipt.${receiptFile.originalname.split('.').pop()}`,
      receiptFile.buffer,
      receiptFile.mimetype
    );

    let parsedDealMethods: string[] = [];
    try {
      if (dealMethods) {
        parsedDealMethods = typeof dealMethods === 'string' ? JSON.parse(dealMethods) : dealMethods;
      }
    } catch (e) {
      console.error('Error parsing dealMethods:', e);
      parsedDealMethods = [];
    }

    // Create listing in database
    const listing = await prisma.userListing.create({
      data: {
        userId: parseInt(userId),
        collectibleId: collectibleId ? parseInt(collectibleId) : null,
        serialNumber,
        title: title || "Untitled Listing",
        description: description || "No description provided",
        condition: condition || "BRAND_NEW",
        referenceValue: referenceValue ? parseFloat(referenceValue) : null,
        dealMethods: parsedDealMethods,
        seriesName: seriesName || null,
        imageUrl,
        demoVideoUrl,
        receiptUrl,
        isAvailableForTrade: true
      },
      include: {
        user: {
          select: {
            id: true,
            publicUser: { select: { name: true, profilePicture: true } }
          }
        },
        collectible: {
          include: { series: true }
        }
      }
    });

    res.status(201).json({
      id: listing.id,
      userId: listing.userId,
      serialNumber: listing.serialNumber,
      imageUrl: listing.imageUrl,
      demoVideoUrl: listing.demoVideoUrl,
      receiptUrl: listing.receiptUrl,
      isAvailableForTrade: listing.isAvailableForTrade,
      createdAt: listing.createdAt,
      collectible: listing.collectible,
      user: {
        id: listing.user.id,
        name: listing.user.publicUser?.name || 'User',
        profilePicture: listing.user.publicUser?.profilePicture
      }
    });
  } catch (error) {
    console.error('Listing creation error:', error);
    res.status(500).json({ error: 'Failed to create listing', details: String(error) });
  }
});

// Get user's listings
app.get('/listings/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const listings = await prisma.userListing.findMany({
      where: { userId: parseInt(userId) },
      include: {
        collectible: {
          include: { series: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(listings);
  } catch (error) {
    console.error('Failed to fetch user listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// Get marketplace listings (all available listings)
app.get('/listings/marketplace', async (req, res) => {
  try {
    const { seriesId, excludeUserId, limit = '50', offset = '0' } = req.query;
    
    const where: any = {
      isAvailableForTrade: true
    };

    if (seriesId) {
      where.collectible = {
        seriesId: parseInt(seriesId as string)
      };
    }

    if (excludeUserId) {
      where.userId = {
        not: parseInt(excludeUserId as string)
      };
    }

    const listings = await prisma.userListing.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            publicUser: { 
              select: { 
                name: true, 
                profilePicture: true 
              } 
            }
          }
        },
        collectible: {
          include: { series: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    // Map to include user details from PublicUser
    const mappedListings = listings.map(listing => ({
      ...listing,
      user: {
        id: listing.user.id,
        name: listing.user.publicUser?.name || 'User',
        profilePicture: listing.user.publicUser?.profilePicture
      }
    }));

    res.json(mappedListings);
  } catch (error) {
    console.error('Failed to fetch marketplace listings:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace listings' });
  }
});

// Get single listing by ID
app.get('/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const listing = await prisma.userListing.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            publicUser: { 
              select: { 
                name: true, 
                profilePicture: true,
                bio: true
              } 
            }
          }
        },
        collectible: {
          include: { series: true }
        }
      }
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json({
      ...listing,
      user: {
        id: listing.user.id,
        name: listing.user.publicUser?.name || 'User',
        profilePicture: listing.user.publicUser?.profilePicture,
        bio: listing.user.publicUser?.bio
      }
    });
  } catch (error) {
    console.error('Failed to fetch listing:', error);
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// Update listing details
app.patch('/listings/:id', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'demoVideo', maxCount: 1 },
  { name: 'receipt', maxCount: 1 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, condition, referenceValue, dealMethods, seriesName, serialNumber } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Check if listing exists
    const existingListing = await prisma.userListing.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingListing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const updates: any = {};
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (condition) updates.condition = condition;
    if (referenceValue) updates.referenceValue = parseFloat(referenceValue);
    if (serialNumber) updates.serialNumber = serialNumber;
    if (seriesName) updates.seriesName = seriesName;

    if (dealMethods) {
      try {
        updates.dealMethods = typeof dealMethods === 'string' ? JSON.parse(dealMethods) : dealMethods;
      } catch (e) {
        console.error('Error parsing dealMethods:', e);
      }
    }

    // Handle file updates
    const timestamp = Date.now();
    const userId = existingListing.userId;

    if (files?.image?.[0]) {
      const imageFile = files.image[0];
      updates.imageUrl = await uploadFile(
        'collectible-images',
        `${userId}/${timestamp}_image.${imageFile.originalname.split('.').pop()}`,
        imageFile.buffer,
        imageFile.mimetype
      );
    }

    if (files?.demoVideo?.[0]) {
      const demoVideoFile = files.demoVideo[0];
      updates.demoVideoUrl = await uploadFile(
        'collectible-demos',
        `${userId}/${timestamp}_demo.${demoVideoFile.originalname.split('.').pop()}`,
        demoVideoFile.buffer,
        demoVideoFile.mimetype
      );
    }

    if (files?.receipt?.[0]) {
      const receiptFile = files.receipt[0];
      updates.receiptUrl = await uploadFile(
        'collectible-receipts',
        `${userId}/${timestamp}_receipt.${receiptFile.originalname.split('.').pop()}`,
        receiptFile.buffer,
        receiptFile.mimetype
      );
    }

    const updatedListing = await prisma.userListing.update({
      where: { id: parseInt(id) },
      data: updates
    });

    res.json(updatedListing);
  } catch (error) {
    console.error('Failed to update listing:', error);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// Update listing availability
app.patch('/listings/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { isAvailableForTrade } = req.body;
    const listingId = parseInt(id);

    const listing = await prisma.userListing.update({
      where: { id: listingId },
      data: { isAvailableForTrade }
    });

    // If listing is no longer available, remove it from all wishlists
    if (!isAvailableForTrade) {
      await prisma.wishlistItem.deleteMany({
        where: { listingId }
      });
      console.log(`Automatically removed listing ${listingId} from all wishlists as it is no longer available.`);
    }

    res.json(listing);
  } catch (error) {
    console.error('Failed to update listing:', error);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// Initialize storage buckets on startup
ensureBucketsExist().catch(err => {
  console.error('Failed to ensure storage buckets exist:', err);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Serve static files from the Angular dist folder
const angularDistPath = path.resolve(
  __dirname,
  '../unboxed-web-app/dist/unboxed-web-app/browser'
);
app.use(express.static(angularDistPath));

// Handle Angular routing by serving index.html for any unknown routes
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(angularDistPath, 'index.html'));
});
