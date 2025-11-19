import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { insertUserSchema, insertItemSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";

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

export async function registerRoutes(app: Express): Promise<Server> {
  app.post('/api/auth/signup', async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
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
      if (!user) {
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
      
      const itemMessages = await storage.getMessagesByItemId(req.params.itemId, req.userId);
      
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
        const ownerMessages = await storage.getMessagesByItemId(req.body.itemId, req.userId);
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
        senderId: req.userId,
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

  const httpServer = createServer(app);

  return httpServer;
}
