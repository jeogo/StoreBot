import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectToDB } from "../db";
import { History } from "../models/history"; // Import your history model
import { Product } from "../models/product";
import { User } from "../models/user";
import { PreOrder } from "../models/preorder";
import { bot } from "../bot";

// Helper function to log history
const logHistory = async (type: "client" | "admin", entry: any) => {
  const db = await connectToDB();

  const historyEntry: History = {
    _id: new ObjectId(),
    type,
    entry,
  };

  await db.collection<History>("history").insertOne(historyEntry);
};

// Update a pre-order's status
export const updatePreOrderStatus = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const preOrderId = new ObjectId(req.params.id);
    const { status, emailPassword } = req.body;

    // Validate status
    if (!["fulfilled", "canceled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    // Fetch the pre-order
    const preOrder = await db
      .collection<PreOrder>("preorders")
      .findOne({ _id: preOrderId });
    if (!preOrder) {
      return res.status(404).json({ error: "Pre-order not found" });
    }

    // Fetch the user
    const user = await db
      .collection<User>("users")
      .findOne({ _id: preOrder.userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch the product
    const product = await db
      .collection<Product>("products")
      .findOne({ _id: preOrder.productId });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (status === "fulfilled") {
      if (!emailPassword) {
        return res
          .status(400)
          .json({ error: "Email and password are required for fulfillment." });
      }

      // Update the pre-order with fulfillment details
      await db.collection<PreOrder>("preorders").updateOne(
        { _id: preOrderId },
        {
          $set: {
            status,
            fulfillmentDate: new Date(),
            clientMessageData: emailPassword,
          },
        }
      );

      // Notify the user about the fulfillment
      const message =
        `✅ طلبك للمنتج "${product.name}" قد تم تحقيقه بنجاح!\n\n` +
        `📧 معلومات الطلب: ${emailPassword}\n` +
        `💬 شكراً لتعاملك معنا!`;

      await bot.api.sendMessage(user.telegramId, message);

      // Log fulfillment in history
      const fulfillmentHistoryEntry = {
        action: "preorder",
        date: new Date(),
        userId: preOrder.userId,
        fullName: preOrder.userName,
        email: emailPassword,
        productId: preOrder.productId,
        productName: preOrder.productName,
        price: preOrder.productPrice,
        status: "fulfilled",
        message: preOrder.message,
        responseMessage: message,
        fulfillmentDate: new Date(),
      };

      await logHistory("client", fulfillmentHistoryEntry);
    } else if (status === "canceled") {
      // Refund the user's balance
      const refundAmount = product.price;
      await db
        .collection<User>("users")
        .updateOne({ _id: user._id }, { $inc: { balance: refundAmount } });

      // Update the pre-order status to canceled
      await db
        .collection<PreOrder>("preorders")
        .updateOne(
          { _id: preOrderId },
          { $set: { status, clientMessageData: "" } }
        );

      // Notify the user about the cancellation
      const message =
        `❌ طلبك للمنتج "${product.name}" تم إلغاؤه.\n` +
        `💰 تم إعادة المبلغ إلى حسابك (${refundAmount}).\n` +
        `💬 نعتذر عن الإزعاج.`;

      await bot.api.sendMessage(user.telegramId, message);

      // Log cancellation in history
      const cancellationHistoryEntry = {
        action: "preorder",
        date: new Date(),
        userId: preOrder.userId,
        fullName: preOrder.userName,
        email: "",
        productId: preOrder.productId,
        productName: preOrder.productName,
        price: preOrder.productPrice,
        status: "canceled",
        message: preOrder.message,
        responseMessage: message,
      };

      await logHistory("client", cancellationHistoryEntry);
    }

    res.status(200).json({ message: "Pre-order status updated successfully" });
  } catch (error) {
    console.error("Error updating pre-order status:", error);
    res.status(500).json({ error: "Error updating pre-order status" });
  }
};

// Get all pre-orders for a product
export const getPreOrders = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const productId = req.params.productId;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    if (!ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid Product ID" });
    }

    const preOrders = await db
      .collection<PreOrder>("preorders")
      .find({ productId: new ObjectId(productId) })
      .toArray();

    res.status(200).json({ preOrders });
  } catch (error) {
    console.error("Error fetching pre-orders:", error);
    res.status(500).json({ error: "Error fetching pre-orders" });
  }
};

// Delete a pre-order
export const deletePreOrderById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const preOrderId = req.params.id;

    if (!preOrderId) {
      return res.status(400).json({ error: "Pre-order ID is required" });
    }

    if (!ObjectId.isValid(preOrderId)) {
      return res.status(400).json({ error: "Invalid Pre-order ID" });
    }

    const preOrder = await db
      .collection<PreOrder>("preorders")
      .findOne({ _id: new ObjectId(preOrderId) });

    if (!preOrder) {
      return res.status(404).json({ error: "Pre-order not found" });
    }

    await db
      .collection<PreOrder>("preorders")
      .deleteOne({ _id: new ObjectId(preOrderId) });

    res.status(200).json({ message: "Pre-order deleted successfully" });
  } catch (error) {
    console.error("Error deleting pre-order:", error);
    res.status(500).json({ error: "Error deleting pre-order" });
  }
};

// Fetch all pre-orders
export const getAllPreOrders = async (_req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const preOrders = await db
      .collection<PreOrder>("preorders")
      .aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$user" },
        { $unwind: "$product" },
        {
          $project: {
            _id: 1,
            userId: 1,
            productId: 1,
            date: 1,
            status: 1,
            message: 1,
            fulfillmentDate: 1,
            clientMessageData: 1,
            userName: "$user.username",
            userTelegramId: "$user.telegramId",
            productName: "$product.name",
            productPrice: "$product.price",
          },
        },
      ])
      .toArray();

    res.status(200).json(preOrders);
  } catch (error) {
    console.error("Error fetching pre-orders:", error);
    res.status(500).json({ error: "Error fetching pre-orders" });
  }
};

// Fetch a single pre-order by ID
export const getPreOrderById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const preOrderIdParam = req.params.id;

    if (!preOrderIdParam) {
      return res.status(400).json({ error: "Pre-order ID is required" });
    }

    if (!ObjectId.isValid(preOrderIdParam)) {
      return res.status(400).json({ error: "Invalid Pre-order ID" });
    }

    const preOrderId = new ObjectId(preOrderIdParam);

    const preOrder = await db
      .collection<PreOrder>("preorders")
      .findOne({ _id: preOrderId });
    if (!preOrder)
      return res.status(404).json({ error: "Pre-order not found" });

    res.status(200).json(preOrder);
  } catch (error) {
    console.error("Error fetching pre-order by ID:", error);
    res.status(500).json({ error: "Error fetching pre-order by ID" });
  }
};
export const fulfillPreOrder = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const preOrderId = req.params.id;
    const { emailPassword } = req.body;

    // Validate input
    if (!preOrderId) {
      return res.status(400).json({ error: "Pre-order ID is required" });
    }
    if (!ObjectId.isValid(preOrderId)) {
      return res.status(400).json({ error: "Invalid Pre-order ID" });
    }
    if (!emailPassword) {
      return res
        .status(400)
        .json({ error: "Email and password are required for fulfillment." });
    }

    const preOrderObjectId = new ObjectId(preOrderId);

    // Fetch the pre-order
    const preOrder = await db
      .collection<PreOrder>("preorders")
      .findOne({ _id: preOrderObjectId });
    if (!preOrder) {
      return res.status(404).json({ error: "Pre-order not found" });
    }

    // Fetch the user
    const user = await db
      .collection<User>("users")
      .findOne({ _id: preOrder.userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch the product
    const product = await db
      .collection<Product>("products")
      .findOne({ _id: preOrder.productId });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Update the pre-order with fulfillment details
    const fulfillmentDate = new Date();
    await db.collection<PreOrder>("preorders").updateOne(
      { _id: preOrderObjectId },
      {
        $set: {
          status: "fulfilled",
          fulfillmentDate,
          clientMessageData: emailPassword,
        },
      }
    );

    // Notify the user via Telegram bot
    const message =
      `✅ طلبك للمنتج "${product.name}" قد تم تحقيقه بنجاح!\n\n` +
      `📧 معلومات الطلب: ${emailPassword}\n` +
      `💬 شكراً لتعاملك معنا!`;

    await bot.api.sendMessage(user.telegramId, message);

    // Log the fulfillment in history
    const fulfillmentHistoryEntry = {
      action: "preorder",
      date: fulfillmentDate,
      userId: preOrder.userId,
      fullName: preOrder.userName,
      email: emailPassword,
      productId: preOrder.productId,
      productName: product.name,
      price: product.price,
      status: "fulfilled",
      message: preOrder.message,
      responseMessage: message,
    };

    await logHistory("client", fulfillmentHistoryEntry);

    res.status(200).json({
      message: "Pre-order fulfilled successfully",
      preOrderId,
      fulfillmentDate,
    });
  } catch (error) {
    console.error("Error fulfilling pre-order:", error);
    res.status(500).json({ error: "Error fulfilling pre-order" });
  }
};
