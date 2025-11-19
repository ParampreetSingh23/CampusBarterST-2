import { 
  users, items, messages,
  type User, type InsertUser,
  type Item, type InsertItem,
  type Message, type InsertMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc } from "drizzle-orm";

export interface IStorage {
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllItems(): Promise<(Item & { user: User })[]>;
  getItemById(id: string): Promise<(Item & { user: User }) | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: string, item: Partial<InsertItem>): Promise<Item | undefined>;
  deleteItem(id: string): Promise<void>;
  
  getMessagesByItemId(itemId: string, userId: string): Promise<(Message & { sender: User })[]>;
  getUserMessages(userId: string): Promise<(Message & { sender: User; receiver: User; item: Item })[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllItems(): Promise<(Item & { user: User })[]> {
    const result = await db
      .select()
      .from(items)
      .leftJoin(users, eq(items.userId, users.id))
      .orderBy(desc(items.createdAt));
    
    return result.map(row => ({
      ...row.items,
      user: row.users!
    }));
  }

  async getItemById(id: string): Promise<(Item & { user: User }) | undefined> {
    const result = await db
      .select()
      .from(items)
      .leftJoin(users, eq(items.userId, users.id))
      .where(eq(items.id, id));
    
    if (result.length === 0) return undefined;
    
    return {
      ...result[0].items,
      user: result[0].users!
    };
  }

  async createItem(item: InsertItem): Promise<Item> {
    const [newItem] = await db
      .insert(items)
      .values(item)
      .returning();
    return newItem;
  }

  async updateItem(id: string, item: Partial<InsertItem>): Promise<Item | undefined> {
    const [updated] = await db
      .update(items)
      .set(item)
      .where(eq(items.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteItem(id: string): Promise<void> {
    await db.delete(items).where(eq(items.id, id));
  }

  async getMessagesByItemId(itemId: string, userId: string): Promise<(Message & { sender: User })[]> {
    const result = await db
      .select()
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          eq(messages.itemId, itemId),
          or(
            eq(messages.senderId, userId),
            eq(messages.receiverId, userId)
          )
        )
      )
      .orderBy(messages.createdAt);
    
    return result.map(row => ({
      ...row.messages,
      sender: row.users!
    }));
  }

  async getUserMessages(userId: string): Promise<(Message & { sender: User; receiver: User; item: Item })[]> {
    const result = await db
      .select({
        message: messages,
        sender: users,
        item: items,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .leftJoin(items, eq(messages.itemId, items.id))
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(desc(messages.createdAt));
    
    const messagesWithAll = await Promise.all(
      result.map(async (row) => {
        const [receiverData] = await db
          .select()
          .from(users)
          .where(eq(users.id, row.message.receiverId));
        
        return {
          ...row.message,
          sender: row.sender!,
          receiver: receiverData,
          item: row.item!
        };
      })
    );
    
    return messagesWithAll;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }
}

export const storage = new DatabaseStorage();
