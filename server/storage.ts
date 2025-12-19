import {
  users, items, messages,
  type User, type InsertUser,
  type Item, type InsertItem,
  type Message, type InsertMessage,
  type CartItem, type WishlistItem, type Order,
  cartItems, wishlistItems, orders, orderItems
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, inArray } from "drizzle-orm";

export interface IStorage {
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAllItems(): Promise<(Item & { user: User })[]>;
  getItemById(id: string): Promise<(Item & { user: User }) | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: string, item: Partial<InsertItem>): Promise<Item | undefined>;
  deleteItem(id: string): Promise<void>;

  getMessagesByItemId(itemId: string, userId: string): Promise<(Message & { sender: User })[]>;
  getUserMessages(userId: string): Promise<(Message & { sender: User; receiver: User; item: Item })[]>;
  createMessage(message: InsertMessage): Promise<Message>;


  getCartItems(userId: string): Promise<(CartItem & { item: Item })[]>;
  addToCart(userId: string, itemId: string): Promise<CartItem>;
  removeFromCart(userId: string, itemId: string): Promise<void>;

  getWishlistItems(userId: string): Promise<(WishlistItem & { item: Item })[]>;
  addToWishlist(userId: string, itemId: string): Promise<WishlistItem>;
  removeFromWishlist(userId: string, itemId: string): Promise<void>;
  getWishlistItems(userId: string): Promise<(WishlistItem & { item: Item })[]>;
  addToWishlist(userId: string, itemId: string): Promise<WishlistItem>;
  removeFromWishlist(userId: string, itemId: string): Promise<void>;

  checkout(userId: string): Promise<Order>;
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

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
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

  async getCartItems(userId: string): Promise<(CartItem & { item: Item })[]> {
    const result = await db
      .select()
      .from(cartItems)
      .leftJoin(items, eq(cartItems.itemId, items.id))
      .where(eq(cartItems.userId, userId))
      .orderBy(desc(cartItems.createdAt));

    return result.map(row => ({
      ...row.cart_items,
      item: row.items!
    }));
  }

  async addToCart(userId: string, itemId: string): Promise<CartItem> {
    const [item] = await db
      .insert(cartItems)
      .values({ userId, itemId })
      .returning();
    return item;
  }

  async removeFromCart(userId: string, itemId: string): Promise<void> {
    await db
      .delete(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.itemId, itemId)));
  }

  async getWishlistItems(userId: string): Promise<(WishlistItem & { item: Item })[]> {
    const result = await db
      .select()
      .from(wishlistItems)
      .leftJoin(items, eq(wishlistItems.itemId, items.id))
      .where(eq(wishlistItems.userId, userId))
      .orderBy(desc(wishlistItems.createdAt));

    return result.map(row => ({
      ...row.wishlist_items,
      item: row.items!
    }));
  }

  async addToWishlist(userId: string, itemId: string): Promise<WishlistItem> {
    const [item] = await db
      .insert(wishlistItems)
      .values({ userId, itemId })
      .returning();
    return item;
  }

  async removeFromWishlist(userId: string, itemId: string): Promise<void> {
    await db
      .delete(wishlistItems)
      .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.itemId, itemId)));
  }

  async checkout(userId: string): Promise<Order> {
    return await db.transaction(async (tx) => {
      // 1. Get cart items
      const userCartItems = await tx
        .select()
        .from(cartItems)
        .leftJoin(items, eq(cartItems.itemId, items.id))
        .where(eq(cartItems.userId, userId));

      if (userCartItems.length === 0) {
        throw new Error("Cart is empty");
      }

      // Filter out items that are already sold or not for sale
      const validItems = userCartItems.filter(
        row => row.items && row.items.itemType === 'sell' && !row.items.isSold
      );

      if (validItems.length === 0) {
        throw new Error("No available items to checkout");
      }

      const total = validItems.reduce(
        (sum, row) => sum + (parseFloat(row.items!.price || "0")),
        0
      );

      // 2. Create Order
      const [order] = await tx
        .insert(orders)
        .values({
          userId,
          total: total.toString(),
        })
        .returning();

      // 3. Create Order Items & Mark items as sold
      for (const row of validItems) {
        await tx.insert(orderItems).values({
          orderId: order.id,
          itemId: row.items!.id,
          price: row.items!.price!,
        });

        await tx
          .update(items)
          .set({ isSold: true })
          .where(eq(items.id, row.items!.id));
      }

      // 4. Clear Cart
      await tx
        .delete(cartItems)
        .where(eq(cartItems.userId, userId));

      return order;
    });
  }
}

export const storage = new DatabaseStorage();
