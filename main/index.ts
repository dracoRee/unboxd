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
import { createClient } from '@supabase/supabase-js';

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

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

// Socket.io connection handling
// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`User ${socket.id} joined conversation_${conversationId}`);
  });

  socket.on('send_message', async (data) => {
    const { conversationId, senderId, content, senderName } = data;
    
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
          content
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
  try {
    const hashedPassword = await argon2.hash(password);
    
    // Create user and PublicUser in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
        },
      });

      // Create PublicUser entry
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

app.post('/collection/add', async (req, res) => {
  const { userId, seriesId, name, imageUrl } = req.body;
  try {
    const userCollectible = await prisma.userCollectible.create({
      data: {
        userId: parseInt(userId),
        seriesId: parseInt(seriesId),
        name,
        imageUrl
      }
    });
    res.status(201).json(userCollectible);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add item to collection' });
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

app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const bucketName = 'collectibles';
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    
    if (!buckets?.find(b => b.name === bucketName)) {
      console.log(`Bucket '${bucketName}' not found. Creating...`);
      const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
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
      .from('collectibles')
      .getPublicUrl(fileName);

    res.json({ url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
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
        const newUser = await tx.user.create({
          data: {
            email,
            password: 'SUPABASE_AUTH_USER' // Placeholder
          },
        });

        // Create PublicUser entry
        await tx.PublicUser.create({
          data: {
            id: newUser.id,
            name: name || email.split('@')[0] || 'User',
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
        name: { contains: q, mode: 'insensitive' }
      },
      select: { 
        id: true,
        name: true, 
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
        bio: true,
        profilePicture: true,
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
            },
            followedBy: currentUserId && !isNaN(currentUserId) ? {
              where: { id: currentUserId },
              select: { id: true },
              take: 1
            } : undefined
          }
        }
      }
    });

    if (!PublicUser) return res.status(404).json({ error: 'User not found' });

    // Flatten following status for the UI
    const isFollowing = currentUserId ? (PublicUser.user as any).followedBy?.length > 0 : false;
    
    // Construct response matching the expected format
    const response = {
      id: PublicUser.user.id,
      name: PublicUser.name,
      email: PublicUser.user.email,
      bio: PublicUser.bio,
      profilePicture: PublicUser.profilePicture,
      _count: PublicUser.user._count,
      isFollowing
    };

    res.json(response);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update Profile
app.patch('/users/profile', async (req, res) => {
  const { userId, name, bio, profilePicture } = req.body;
  try {
    // Update both user and PublicUser tables in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update PublicUser table
      const PublicUser = await tx.publicUser.upsert({
        where: { id: parseInt(userId) },
        update: { name, bio, profilePicture },
        create: { 
          id: parseInt(userId), 
          name: name || 'User', 
          bio, 
          profilePicture 
        },
        select: { id: true, name: true, bio: true, profilePicture: true }
      });

      return PublicUser;
    });

    res.json({ ...result, id: parseInt(userId) });
  } catch (error) {
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
  const { conversationId, senderId, content } = req.body;
  try {
    const message = await prisma.message.create({
      data: {
        conversationId: parseInt(conversationId),
        senderId: parseInt(senderId),
        content
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
    
    res.status(201).json(message);
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

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
