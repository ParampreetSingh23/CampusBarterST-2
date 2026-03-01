import { config } from "dotenv";
config();
import { createServer } from "http";
import express from "express";
import { registerRoutes } from "./server/routes";
import { storage } from "./server/storage";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) throw new Error("Missing SESSION_SECRET");

// Mock user ID - grabbing from DB or just making up a UUID
const fakeUserId = "12345678-1234-1234-1234-123456789012";
const token = jwt.sign({ userId: fakeUserId }, JWT_SECRET, { expiresIn: '1h' });

async function runTest() {
 const app = express();
 app.use(express.json());

 // Register routes onto our test express app
 await registerRoutes(app);

 // We start it on a random port
 const server = app.listen(0, async () => {
  const port = (server.address() as any).port;
  console.log(`Test server running on port ${port}`);

  try {
   // 1. Manually add a test item with a broken URL
   // First get any user, or we just insert one if none exist
   let user = (await storage.getUserByEmail('testadmin@college.edu'));
   if (!user) {
    user = await storage.createUser({
     name: "Test Admin",
     email: "testadmin@college.edu",
     password: "test",
     collegeId: "test-college"
    });
   }

   const item = await storage.createItem({
    userId: user.id,
    title: "Test Broken Image Item",
    description: "This item has no working image",
    category: "Electronics",
    imageUrl: "http://non-existent-url-123456.com/broken.jpg",
    itemType: "sell",
    price: "10.00"
   });

   console.log(`Created test item ID: ${item.id} with broken URL: ${item.imageUrl}`);

   // 2. Call the endpoint
   console.log("Triggering Admin Image Generation...");
   const res = await fetch(`http://127.0.0.1:${port}/api/admin/generate-missing-images`, {
    method: "POST",
    headers: {
     "Authorization": `Bearer ${token}`
    }
   });

   const data = await res.json();
   console.log("Admin endpoint response:", data);

   // 3. Verify it was updated in the DB
   const updatedItem = await storage.getItemById(item.id.toString());
   console.log(`Updated item image URL: ${updatedItem?.imageUrl}`);

   if (updatedItem?.imageUrl.includes('unsplash.com')) {
    console.log("✅ Verification Successful: Fallback to Unsplash URL applied properly.");
   } else {
    console.warn("❌ Verification Warning: Image did not fallback securely.");
   }
  } catch (e) {
   console.error(e);
  } finally {
   server.close();
   process.exit(0);
  }
 });
}

runTest().catch(console.error);
