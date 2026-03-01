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
import { GoogleGenerativeAI } from "@google/generative-ai";

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

  // Ai Description Generation Endpoint
  app.post('/api/items/generate-description', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ message: "AI features are currently unavailable (Missing API Key)." });
      }

      const { title, category, expectedExchange, itemType } = req.body;

      if (!title) {
        return res.status(400).json({ message: "Title is required for description generation." });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      let prompt = `Write a catchy, highly detailed, and engaging product description for an item being listed on a university campus marketplace. 
      The item's title is: "${title}".`;

      if (category) prompt += `\nIt falls under the category: "${category}".`;
      if (itemType === 'sell') {
        prompt += `\nThe item is being sold.`;
      } else if (itemType === 'barter') {
        prompt += `\nThe item is being offered for barter.`;
        if (expectedExchange) {
          prompt += ` The owner is looking to trade it in exchange for: "${expectedExchange}". Mention that they are open to this trade in a friendly way.`;
        }
      }

      prompt += `\nOutput ONLY the description itself. Make it sound enthusiastic but realistic. Keep it under 150 words. Do NOT include pricing information, just describe the item's potential condition, features, and appeal to a student. Format it nicely (e.g., you can use bullet points or short paragraphs).`;

      const result = await model.generateContent(prompt);
      const outputText = result.response.text();

      res.status(200).json({ description: outputText.trim() });
    } catch (error) {
      console.error('AI Generation error:', error);
      res.status(500).json({ message: 'Failed to generate description.' });
    }
  });

  // Ai Exchange Value Estimator Endpoint
  app.post('/api/items/estimate-value', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ message: "AI features are currently unavailable (Missing API Key)." });
      }

      const { title, description, category } = req.body;

      if (!title) {
        return res.status(400).json({ message: "Title is required to estimate value." });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      let prompt = `Act as an expert appraiser for a university campus marketplace where students barter items.
      A student is trying to trade the following item:
      Title: "${title}"`;

      if (category) prompt += `\nCategory: "${category}"`;
      if (description) prompt += `\nDescription: "${description}"`;

      prompt += `\n\nSuggest 3 specific, realistic, and fair items that would be an equivalent exchange for this item on a college campus. 
      Output ONLY a comma-separated list of the 3 items, in a single sentence. Keep it very concise (e.g., "A math textbook, a mini fridge, or a laptop charger"). Do not include any introductory or concluding text.`;

      const result = await model.generateContent(prompt);
      const outputText = result.response.text();

      res.status(200).json({ expectedExchange: outputText.trim() });
    } catch (error) {
      console.error('AI Value Estimation error:', error);
      res.status(500).json({ message: 'Failed to estimate value.' });
    }
  });

  // Admin maintenance endpoint for generating missing images
  app.post('/api/admin/generate-missing-images', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ message: "AI features are currently unavailable (Missing API Key)." });
      }

      console.log('Starting missing images generation scan...');

      const allItems = await storage.getAllItems();
      let updatedCount = 0;
      let skippedCount = 0;
      let fallbackCount = 0;

      // Helper to check if a URL is broken
      const isUrlBroken = async (url: string) => {
        if (!url) return true;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          // Try a simple HEAD request to see if the image exists
          const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
          clearTimeout(timeoutId);
          return !response.ok; // If response is not ok (like 404), it is broken
        } catch (e) {
          return true; // if fetch fails (e.g., abort timeout, DNS error), consider it broken
        }
      };

      for (const item of allItems) {
        // Validate imageUrl
        const broken = await isUrlBroken(item.imageUrl);
        if (!broken) {
          skippedCount++;
          continue; // Image is good!
        }

        console.log(`Generating image for broken/missing item ID: ${item.id} - ${item.title}`);

        // 1. Generate Prompt using gemini-2.5-flash
        const genAI = new GoogleGenerativeAI(apiKey);
        const promptModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let promptText = `Generate a highly detailed and descriptive image generation prompt for a product photo of a "${item.title}".`;
        if (item.category) promptText += ` The item category is "${item.category}".`;
        if (item.description) promptText += ` Description: "${item.description.substring(0, 50)}".`;
        promptText += ` Make it a clean, professional, aesthetic product shot suitable for an ecommerce marketplace. Output ONLY the image generation prompt text.`;

        let imagePrompt = "";
        try {
          const promptResult = await promptModel.generateContent(promptText);
          imagePrompt = promptResult.response.text().trim();
        } catch (promptError) {
          console.error("Failed to generate image prompt via Gemini, using fallback:", promptError);
          imagePrompt = `A high quality photo of a ${item.title}`;
        }

        // 2. Attempt Imagen Generation
        let finalImageUrl = "";
        try {
          const modelUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;

          const imagenResponse = await fetch(modelUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instances: [{ prompt: imagePrompt }],
              parameters: { sampleCount: 1 }
            })
          });

          if (!imagenResponse.ok) {
            throw new Error(`Imagen returned ${imagenResponse.status} ${imagenResponse.statusText}`);
          }

          const imagenData = await imagenResponse.json();
          if (imagenData.predictions && imagenData.predictions[0]) {
            const base64Str = imagenData.predictions[0].bytesBase64Encoded;

            // Ensure items upload directory exists
            const baseUploadsDir = path.join(__dirname, '..', 'uploads');
            const itemsUploadDir = path.join(baseUploadsDir, 'items');
            if (!fs.existsSync(baseUploadsDir)) fs.mkdirSync(baseUploadsDir, { recursive: true });
            if (!fs.existsSync(itemsUploadDir)) fs.mkdirSync(itemsUploadDir, { recursive: true });

            const filename = `img_${item.id}_${Date.now()}.png`;
            const filepath = path.join(itemsUploadDir, filename);
            fs.writeFileSync(filepath, Buffer.from(base64Str, 'base64'));
            finalImageUrl = `/uploads/items/${filename}`;
          } else {
            throw new Error("Missing prediction data");
          }
        } catch (imagenError) {
          console.log(`Imagen generation failed (likely free tier constraint) for item ${item.id}. Falling back to Unsplash.`);
          fallbackCount++;
          // Unsplash fallback
          const searchTerms = encodeURIComponent(item.category || item.title || "object");
          finalImageUrl = `https://images.unsplash.com/featured/800x600/?${searchTerms}`;
        }

        // 3. Update Database
        if (finalImageUrl) {
          await storage.updateItem(item.id.toString(), { imageUrl: finalImageUrl });
          updatedCount++;
        }
      }

      res.status(200).json({
        message: "Missing images generator complete",
        stats: { updated: updatedCount, skipped: skippedCount, fallbacks: fallbackCount }
      });

    } catch (error) {
      console.error('Admin generate images error:', error);
      res.status(500).json({ message: 'Failed to run image generation task.' });
    }
  });

  // Admin Dashboard: Fetch all users
  app.get('/api/admin/users', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const dbUser = await storage.getUserById(req.userId!);
      if (dbUser?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required.' });
      }

      // Remove passwords before sending to the client
      const allUsers = await storage.getAllUsers();
      const safeUsers = allUsers.map(u => {
        const { password, ...rest } = u;
        return rest;
      });
      return res.status(200).json(safeUsers);
    } catch (error) {
      console.error('Fetch users error:', error);
      res.status(500).json({ message: 'Failed to fetch users.' });
    }
  });

  // Admin Dashboard: Delete a specific item
  app.delete('/api/admin/items/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const dbUser = await storage.getUserById(req.userId!);
      if (dbUser?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required.' });
      }

      await storage.deleteItem(req.params.id);
      res.status(200).json({ message: 'Item deleted successfully.' });
    } catch (error) {
      console.error('Admin delete item error:', error);
      res.status(500).json({ message: 'Failed to delete item.' });
    }
  });

  // Serve uploaded files
  app.get('/uploads/messages/:filename', authMiddleware, (req: AuthRequest, res: Response) => {
    const filepath = path.join(uploadsDir, req.params.filename);
    if (!fs.existsSync(filepath)) return res.status(404).json({ message: 'File not found' });
    res.sendFile(filepath);
  });

  const httpServer = createServer(app);

  // Seed Admin User
  const seedAdmin = async () => {
    try {
      const adminEmail = 'admin@gmail.com';
      const existingAdmin = await storage.getUserByEmail(adminEmail);
      if (!existingAdmin) {
        console.log(`Seeding initial admin user: ${adminEmail}`);
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await storage.createUser({
          name: 'Super Admin',
          email: adminEmail,
          password: hashedPassword,
          collegeId: 'admin-college-id',
          role: 'admin'
        });
        console.log('Successfully seeded admin user.');
      }
    } catch (e) {
      console.error('Failed to seed admin user:', e);
    }
  };

  // Fire off the seed async process (we don't wait to unblock server startup)
  seedAdmin();

  return httpServer;
}
