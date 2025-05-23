import { ObjectId } from "mongodb";
import { bot } from "../bot";
import { connectToDB } from "../db";
import { PreOrder } from "../models/preorder";
import { ComprehensiveHistory } from "../models/comprehensiveHistory"; // Updated import
import { User } from "../models/user";
import { Product } from "../models/product";
import { AdminMessages, UserMessages, ErrorMessages } from "../utils/messages";

import { sendToAdmin } from '../helpers/adminNotificationHelper';

// Function to create a pre-order
export const createPreOrderInDB = async (
  userId: ObjectId,
  productId: ObjectId,
  message: string
): Promise<PreOrder | null> => {
  const db = await connectToDB();

  // Fetch user and product
  const user = await db.collection<User>("users").findOne({ _id: userId });
  const product = await db
    .collection<Product>("products")
    .findOne({ _id: productId });

  if (!user) throw new Error(ErrorMessages.userNotFound());
  if (!product) throw new Error(ErrorMessages.productNotFound());

  if (user.balance < product.price) {
    throw new Error(
      UserMessages.formatInsufficientFundsMessage(user.balance, product.price)
    );
  }

  // Deduct balance and log history
  const newBalance = user.balance - product.price;
  await db
    .collection<User>("users")
    .updateOne({ _id: userId }, { $set: { balance: newBalance } });

  const newPreOrder: PreOrder = {
    _id: new ObjectId(),
    userId,
    productId,
    date: new Date(),
    status: "pending",
    message, // User's message
    userName: user.username,
    fullName: user.fullName || "غير متوفر", // Full name
    userTelegramId: user.telegramId,
    productName: product.name,
    productPrice: product.price,
  };

  // Insert pre-order into database
  await db.collection<PreOrder>("preorders").insertOne(newPreOrder);

  // Log pre-order creation in history
  await logPreOrderHistory(newPreOrder, message); // Save the user's message

  return newPreOrder;
};

/**
 * Logs pre-order creation in the history.
 */
const logPreOrderHistory = async (preOrder: PreOrder, userMessage: string) => {
  const db = await connectToDB();

  // Fetch product category name
  const product = await db
    .collection<Product>("products")
    .findOne({ _id: new ObjectId(preOrder.productId) });

  let categoryName = "غير محدد";
  if (product?.categoryId) {
    const category = await db.collection("categories").findOne({
      _id: new ObjectId(product.categoryId),
    });
    categoryName = category?.name || "غير محدد";
  }

  const historyEntry: ComprehensiveHistory = {
    _id: new ObjectId(),
    userId: preOrder.userId,
    actionType: "preOrder", // Action type: 'preOrder'
    date: new Date(),
    description: `طلب مسبق للمنتج '${preOrder.productName}' من المستخدم '${preOrder.userName}' مع الرسالة: ${userMessage}`,
    productId: preOrder.productId,
    productName: preOrder.productName,
    price: preOrder.productPrice,
    categoryName, // Save category name in history
    userMessage, // Save the user's message
  };

  await db.collection<ComprehensiveHistory>("history").insertOne(historyEntry);
};

/**
 * Sends a confirmation message to the user.
 */
export const notifyUserAboutPreOrder = async (preOrder: PreOrder) => {
  try {
    const userMessage = UserMessages.preorderSuccess(preOrder.productName);
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
      preOrder.fullName,
      preOrder.userName,
      preOrder.productName,
      preOrder.message
    );

    await sendToAdmin(adminMessage, {
      parse_mode: "Markdown",
      callback_data: `preorder_confirm_${preOrder._id}`
    });
  } catch (error) {
    console.error("Error sending pre-order notification to admin:", error);
  }
};
