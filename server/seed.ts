
import { db } from "./db";
import { users, items } from "@shared/schema";
import { hash } from "bcryptjs";

async function seed() {
 console.log("Seeding database...");

 // clear existing data (optional, but good for clean slate if desired. For now, let's append)
 // await db.delete(items);
 // await db.delete(users);

 const password = await hash("password123", 10);

 const mockUsers = [
  {
   name: "Alice Johnson",
   email: "alice@college.edu",
   collegeId: "C-2023001",
   password: password,
   googleId: null,
  },
  {
   name: "Bob Smith",
   email: "bob@college.edu",
   collegeId: "C-2023002",
   password: password,
   googleId: null,
  },
  {
   name: "Charlie Brown",
   email: "charlie@college.edu",
   collegeId: "C-2023003",
   password: password,
   googleId: null,
  },
  {
   name: "Diana Prince",
   email: "diana@college.edu",
   collegeId: "C-2023004",
   password: password,
   googleId: null,
  },
  {
   name: "Evan Wright",
   email: "evan@college.edu",
   collegeId: "C-2023005",
   password: password,
   googleId: null,
  },
 ];

 console.log("Creating users...");
 const createdUsers = await db.insert(users).values(mockUsers).returning();
 console.log(`Created ${createdUsers.length} users.`);

 const mockItems = [
  {
   title: "Calculus Textbook",
   description: "Early Transcendentals, 8th Edition. Good condition, some highlighting.",
   category: "Books",
   imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1000",
   itemType: "sell",
   price: "45.00",
   userId: createdUsers[0].id,
  },
  {
   title: "Scientific Calculator",
   description: "TI-84 Plus CE. Color screen, rechargeable battery. Works perfectly.",
   category: "Electronics",
   imageUrl: "https://images.unsplash.com/photo-1574607383476-f2c7115c9ad1?auto=format&fit=crop&q=80&w=1000",
   itemType: "barter",
   expectedExchange: "Graphing notebooks or art supplies",
   userId: createdUsers[0].id,
  },
  {
   title: "Dorm Mini Fridge",
   description: "Compact fridge/freezer combo. Clean and cold. Pick up only.",
   category: "Furniture",
   imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=1000",
   itemType: "sell",
   price: "60.00",
   userId: createdUsers[1].id,
  },
  {
   title: "Wireless Headphones",
   description: "Noise cancelling, over-ear. Brand new in box.",
   category: "Electronics",
   imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1000",
   itemType: "sell",
   price: "120.00",
   userId: createdUsers[1].id,
  },
  {
   title: "Wooden Study Desk",
   description: "Solid wood desk with 3 drawers. Sturdy and spacious.",
   category: "Furniture",
   imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&q=80&w=1000",
   itemType: "barter",
   expectedExchange: "Office chair",
   userId: createdUsers[2].id,
  },
  {
   title: "Psychology 101 Notes",
   description: "Comprehensive handwritten notes for intro psych. A+ guaranteed!",
   category: "Other",
   imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=1000",
   itemType: "sell",
   price: "15.00",
   userId: createdUsers[2].id,
  },
  {
   title: "Running Shoes (Size 10)",
   description: "Nike Air Zoom. Worn twice, wrong size for me.",
   category: "Clothing",
   imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=1000",
   itemType: "sell",
   price: "50.00",
   userId: createdUsers[3].id,
  },
  {
   title: "Tennis Racket",
   description: "Wilson Pro Staff. Great for beginners and intermediate players.",
   category: "Sports",
   imageUrl: "https://images.unsplash.com/photo-1622391032884-2f22c1f9652d?auto=format&fit=crop&q=80&w=1000",
   itemType: "barter",
   expectedExchange: "Badminton set",
   userId: createdUsers[3].id,
  },
  {
   title: "Vintage Denim Jacket",
   description: "Oversized fit, medium wash. Classic style.",
   category: "Clothing",
   imageUrl: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&q=80&w=1000",
   itemType: "sell",
   price: "35.00",
   userId: createdUsers[4].id,
  },
  {
   title: "Bluetooth Speaker",
   description: "Portable, waterproof, 10h battery life.",
   category: "Electronics",
   imageUrl: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&q=80&w=1000",
   itemType: "sell",
   price: "25.00",
   userId: createdUsers[4].id,
  },
  // Adding 10 more items to reach ~20
  {
   title: "Intro to Algorithms",
   description: "CLRS book. Essential for CS majors. Hardcover.",
   category: "Books",
   imageUrl: "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=1000",
   itemType: "sell",
   price: "55.00",
   userId: createdUsers[0].id,
  },
  {
   title: "Yoga Mat",
   description: "Extra thick, non-slip. Purple color.",
   category: "Sports",
   imageUrl: "https://images.unsplash.com/photo-1599447292180-45fd84092ef0?auto=format&fit=crop&q=80&w=1000",
   itemType: "sell",
   price: "15.00",
   userId: createdUsers[1].id,
  },
  {
   title: "Coffee Maker",
   description: "Single serve drip coffee maker. Includes reusable filter.",
   category: "Furniture", // Household items often go under Furniture or Other
   imageUrl: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&q=80&w=1000",
   itemType: "barter",
   expectedExchange: "Electric kettle",
   userId: createdUsers[2].id,
  },
  {
   title: "Gaming Mouse",
   description: "RGB lighting, programmable buttons. High DPI.",
   category: "Electronics",
   imageUrl: "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&q=80&w=1000",
   itemType: "sell",
   price: "30.00",
   userId: createdUsers[3].id,
  },
  {
   title: "Hoodie",
   description: "Grey university hoodie. Size L. Warm and comfy.",
   category: "Clothing",
   imageUrl: "https://images.unsplash.com/photo-1556906781-9a412961d289?auto=format&fit=crop&q=80&w=1000",
   itemType: "sell",
   price: "20.00",
   userId: createdUsers[4].id,
  },
  {
   title: "Basketball",
   description: "Indoor/Outdoor ball. Good grip.",
   category: "Sports",
   imageUrl: "https://images.unsplash.com/photo-1519861531473-92002639313a?auto=format&fit=crop&q=80&w=1000",
   itemType: "sell",
   price: "10.00",
   userId: createdUsers[0].id,
  },
  {
   title: "Desk Lamp",
   description: "LED lamp with adjustable brightness and color temp.",
   category: "Furniture",
   imageUrl: "https://images.unsplash.com/photo-1534073828943-f801091a7d58?auto=format&fit=crop&q=80&w=1000",
   itemType: "sell",
   price: "18.00",
   userId: createdUsers[1].id,
  },
  {
   title: "Fiction Novels Bundle",
   description: "Set of 5 mystery novels. Great summer reading.",
   category: "Books",
   imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=1000",
   itemType: "barter",
   expectedExchange: "Sci-fi books",
   userId: createdUsers[2].id,
  },
  {
   title: "Graphic Tee",
   description: "Vintage band tee. Size M.",
   category: "Clothing",
   imageUrl: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&q=80&w=1000",
   itemType: "sell",
   price: "12.00",
   userId: createdUsers[3].id,
  },
  {
   title: "Action Camera",
   description: "GoPro Hero 7 Black. Waterproof. Comes with mounts.",
   category: "Electronics",
   imageUrl: "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&q=80&w=1000",
   itemType: "sell",
   price: "150.00",
   userId: createdUsers[4].id,
  },
 ];

 console.log("Creating items...");
 await db.insert(items).values(mockItems);
 console.log(`Created ${mockItems.length} items.`);

 console.log("Seeding complete!");
 process.exit(0);
}

seed().catch((err) => {
 console.error("Seeding failed:", err);
 process.exit(1);
});
