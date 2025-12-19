import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { insertUserSchema, insertItemSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { OAuth2Client } from "google-auth-library";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable must be set");
}

const JWT_SECRET = process.env.SESSION_SECRET;

interface AuthRequest extends Request {
  userId?: string;
}

const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Multer configuration for file uploads
const uploadsDir = path.join(__dirname, '..', 'uploads', 'messages');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed'));
  }
};

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.post('/api/auth/signup', async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      if (!validatedData.password) {
        return res.status(400).json({ message: 'Password is required' });
      }

      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      const { password, ...userWithoutPassword } = user;
      res.status(201).json({ token, user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Failed to create account' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      const { password: _, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Failed to login' });
    }
  });

  app.post('/api/auth/google', async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      const clientId = process.env.VITE_GOOGLE_CLIENT_ID;

      if (!clientId) {
        return res.status(500).json({ message: 'Server configuration error: Missing Google Client ID' });
      }

      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: clientId,
      });
      const payload = ticket.getPayload();

      if (!payload) {
        return res.status(401).json({ message: 'Invalid Google token' });
      }

      const { email, name, sub: googleId } = payload;

      if (!email || !googleId) {
        return res.status(401).json({ message: 'Invalid Google token payload' });
      }

      let user = await storage.getUserByGoogleId(googleId);

      if (!user) {
        user = await storage.getUserByEmail(email);
        if (user) {
          // Link existing user if needed, or just login
        } else {
          // Create new user
          user = await storage.createUser({
            name: name || 'Google User',
            email,
            collegeId: 'G-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            password: null as any,
            googleId,
          });
        }
      }

      const jwtToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
      const { password, ...userWithoutPassword } = user;
      res.json({ token: jwtToken, user: userWithoutPassword });
    } catch (error) {
      console.error("Google login error:", error);
      res.status(500).json({ message: 'Google login failed' });
    }
  });

  app.get('/api/items', async (req: Request, res: Response) => {
    try {
      const allItems = await storage.getAllItems();
      res.json(allItems);
    } catch (error) {
      console.error('Get items error:', error);
      res.status(500).json({ message: 'Failed to fetch items' });
    }
  });

  app.get('/api/items/:id', async (req: Request, res: Response) => {
    try {
      const item = await storage.getItemById(req.params.id);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }
      res.json(item);
    } catch (error) {
      console.error('Get item error:', error);
      res.status(500).json({ message: 'Failed to fetch item' });
    }
  });

  app.post('/api/items', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const itemData = {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        imageUrl: req.body.imageUrl,
        itemType: req.body.itemType,
        expectedExchange: req.body.expectedExchange,
        price: req.body.price,
        userId: req.userId!,
      };

      const validatedData = insertItemSchema.parse(itemData);
      const item = await storage.createItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Create item error:', error);
      res.status(500).json({ message: 'Failed to create item' });
    }
  });

  app.put('/api/items/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const item = await storage.getItemById(req.params.id);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }

      if (item.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to update this item' });
      }

      const updateData = {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        imageUrl: req.body.imageUrl,
        itemType: req.body.itemType,
        expectedExchange: req.body.expectedExchange,
        price: req.body.price,
      };

      const updated = await storage.updateItem(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error('Update item error:', error);
      res.status(500).json({ message: 'Failed to update item' });
    }
  });

  app.delete('/api/items/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const item = await storage.getItemById(req.params.id);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }

      if (item.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to delete this item' });
      }

      await storage.deleteItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete item error:', error);
      res.status(500).json({ message: 'Failed to delete item' });
    }
  });

  app.get('/api/messages', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const userMessages = await storage.getUserMessages(req.userId!);
      res.json(userMessages);
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.get('/api/messages/:itemId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const item = await storage.getItemById(req.params.itemId);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }

      const itemMessages = await storage.getMessagesByItemId(req.params.itemId, req.userId!);

      if (itemMessages.length === 0 && item.userId !== req.userId) {
        return res.status(403).json({ message: 'Not authorized to view these messages' });
      }

      res.json(itemMessages);
    } catch (error) {
      console.error('Get item messages error:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.post('/api/messages', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const item = await storage.getItemById(req.body.itemId);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }

      const receiver = await storage.getUserById(req.body.receiverId);
      if (!receiver) {
        return res.status(404).json({ message: 'Receiver not found' });
      }

      const isItemOwner = item.userId === req.userId;
      const isMessagingOwner = req.body.receiverId === item.userId;

      if (isMessagingOwner) {
        // Buyer messaging owner - always allowed
      } else if (isItemOwner) {
        // Owner messaging buyer - verify the buyer initiated contact with the owner
        const ownerMessages = await storage.getMessagesByItemId(req.body.itemId, req.userId!);
        const buyerInitiatedContact = ownerMessages.some(msg =>
          msg.senderId === req.body.receiverId && msg.receiverId === req.userId
        );

        if (!buyerInitiatedContact) {
          return res.status(403).json({ message: 'You can only reply to users who have contacted you about this item' });
        }
      } else {
        // Neither owner nor messaging owner - unauthorized
        return res.status(403).json({ message: 'You can only message the item owner' });
      }

      const validatedData = insertMessageSchema.parse({
        itemId: req.body.itemId,
        receiverId: req.body.receiverId,
        messageText: req.body.messageText,
        senderId: req.userId!,
      });

      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Create message error:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });


  // Cart Endpoints
  app.get('/api/cart', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const cartItems = await storage.getCartItems(req.userId!);
      res.json(cartItems);
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json({ message: 'Failed to fetch cart items' });
    }
  });

  app.post('/api/cart', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { itemId } = req.body;
      if (!itemId) {
        return res.status(400).json({ message: 'itemId is required' });
      }

      // Check if item exists
      const item = await storage.getItemById(itemId);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }

      const cartItem = await storage.addToCart(req.userId!, itemId);
      res.status(201).json(cartItem);
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(500).json({ message: 'Failed to add item to cart' });
    }
  });

  app.delete('/api/cart/:itemId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await storage.removeFromCart(req.userId!, req.params.itemId);
      res.status(204).send();
    } catch (error) {
      console.error('Remove from cart error:', error);
      res.status(500).json({ message: 'Failed to remove item from cart' });
    }
  });

  // Wishlist Endpoints
  app.get('/api/wishlist', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const wishlistItems = await storage.getWishlistItems(req.userId!);
      res.json(wishlistItems);
    } catch (error) {
      console.error('Get wishlist error:', error);
      res.status(500).json({ message: 'Failed to fetch wishlist items' });
    }
  });

  app.post('/api/wishlist', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { itemId } = req.body;
      if (!itemId) {
        return res.status(400).json({ message: 'itemId is required' });
      }

      // Check if item exists
      const item = await storage.getItemById(itemId);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }

      const wishlistItem = await storage.addToWishlist(req.userId!, itemId);
      res.status(201).json(wishlistItem);
    } catch (error) {
      console.error('Add to wishlist error:', error);
      res.status(500).json({ message: 'Failed to add item to wishlist' });
    }
  });

  app.delete('/api/wishlist/:itemId', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await storage.removeFromWishlist(req.userId!, req.params.itemId);
      res.status(204).send();
    } catch (error) {
      console.error('Remove from wishlist error:', error);
      res.status(500).json({ message: 'Failed to remove item from wishlist' });
    }
  });

  app.post('/api/checkout', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const order = await storage.checkout(req.userId!);
      res.status(201).json(order);
    } catch (error: any) {
      console.error('Checkout error:', error);
      res.status(500).json({ message: error.message || 'Failed to checkout' });
    }
  });

  // File upload endpoint
  app.post('/api/messages/upload', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
      const { itemId, receiverId } = req.body;
      if (!itemId || !receiverId) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'itemId and receiverId required' });
      }
      const item = await storage.getItemById(itemId);
      if (!item) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: 'Item not found' });
      }
      const receiver = await storage.getUserById(receiverId);
      if (!receiver) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: 'Receiver not found' });
      }
      const isItemOwner = item.userId === req.userId;
      const isMessagingOwner = receiverId === item.userId;
      if (!isMessagingOwner && (!isItemOwner || !(await storage.getMessagesByItemId(itemId, req.userId!)).some(msg => msg.senderId === receiverId && msg.receiverId === req.userId))) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: 'Not authorized' });
      }
      const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'document';
      const fileUrl = `/uploads/messages/${req.file.filename}`;
      const message = await storage.createMessage({
        itemId, receiverId, senderId: req.userId!,
        fileUrl, fileType, fileName: req.file.originalname,
        messageText: req.body.messageText || null
      });
      res.status(201).json(message);
    } catch (error) {
      if (req.file) try { fs.unlinkSync(req.file.path); } catch { }
      if (error instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', errors: error.errors });
      if (error instanceof multer.MulterError) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'File exceeds 5MB' : error.message });
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  });

  // Serve uploaded files
  app.get('/uploads/messages/:filename', authMiddleware, (req: AuthRequest, res: Response) => {
    const filepath = path.join(uploadsDir, req.params.filename);
    if (!fs.existsSync(filepath)) return res.status(404).json({ message: 'File not found' });
    res.sendFile(filepath);
  });

  const httpServer = createServer(app);

  return httpServer;
}
