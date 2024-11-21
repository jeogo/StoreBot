import { ObjectId } from "mongodb";
import { bot } from "../bot";
import { connectToDB } from "../db";
import { PreOrder } from "../models/preorder";
import { HistoryEntry } from "../models/history";
import { User } from "../models/user";
import { Product } from "../models/product";
import { AdminMessages, UserMessages, ErrorMessages } from "../utils/messages";

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || "5928329785";

/**
 * Creates a pre-order in the database.
 */
export const createPreOrderInDB = async (
  userId: ObjectId,
  productId: ObjectId,
  message: string
): Promise<PreOrder | null> => {
  const db = await connectToDB();

  // Fetch the user and product
  const user = await db.collection<User>("users").findOne({ _id: userId });
  const product = await db
    .collection<Product>("products")
    .findOne({ _id: productId });

  if (!user || !product) {
    throw new Error(
      !user ? ErrorMessages.userNotFound() : ErrorMessages.productNotFound()
    );
  }

  if (user.balance < product.price) {
    throw new Error(
      UserMessages.formatInsufficientFundsMessage(user.balance, product.price)
    );
  }

  // Deduct product price from user's balance
  const newBalance = user.balance - product.price;
  await db
    .collection<User>("users")
    .updateOne({ _id: userId }, { $set: { balance: newBalance } });

  // Create a pre-order
  const newPreOrder: PreOrder = {
    _id: new ObjectId(),
    userId,
    productId,
    date: new Date(),
    status: "pending",
    message,
    userName: user.username,
    userTelegramId: user.telegramId,
    productName: product.name,
    productPrice: product.price,
  };

  await db.collection<PreOrder>("preorders").insertOne(newPreOrder);

  // Log the pre-order in history
  await logPreOrderHistory(newPreOrder);

  return newPreOrder;
};

/**
 * Logs pre-order creation in the history.
 */
const logPreOrderHistory = async (preOrder: PreOrder) => {
  const db = await connectToDB();

  const historyEntry: HistoryEntry = {
    entity: "preorder",
    entityId: preOrder._id,
    action: "created",
    timestamp: new Date(),
    performedBy: {
      type: "user",
      id: preOrder.userId.toHexString(),
    },
    details: AdminMessages.notifyAdminPreOrder(
      preOrder.userName,
      preOrder.productName,
      preOrder.message
    ),
    metadata: {
      userId: preOrder.userId,
      productId: preOrder.productId,
      price: preOrder.productPrice,
      message: preOrder.message,
    },
  };

  await db.collection<HistoryEntry>("history").insertOne(historyEntry);
};

/**
 * Sends a confirmation message to the user.
 */
export const notifyUserAboutPreOrder = async (preOrder: PreOrder) => {
  try {
    const userMessage = UserMessages.preorderSuccess();
    await bot.api.sendMessage(preOrder.userTelegramId, userMessage, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error sending pre-order confirmation to user:", error);
  }
};

/**
 * Sends a notification about the pre-order to the admin.
 */
export const notifyAdminAboutPreOrder = async (preOrder: PreOrder) => {
  try {
    const adminMessage = AdminMessages.notifyAdminPreOrder(
      preOrder.userName,
      preOrder.productName,
      preOrder.message
    );

    await bot.api.sendMessage(ADMIN_TELEGRAM_ID, adminMessage, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error sending pre-order notification to admin:", error);
  }
};
