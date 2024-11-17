// src/controllers/preOrderController.ts

import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectToDB } from "../db";
import { HistoryEntry } from "../models/history";
import { Product } from "../models/product";
import { User } from "../models/user";
import { bot } from "../bot"; // Import the bot to send messages to users
import { PreOrder } from "../models/preorder";

// Create a new pre-order
export const createPreOrder = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const { userId, productId, message } = req.body;

    // Validate input
    if (!userId || !productId || !message) {
      return res
        .status(400)
        .json({ error: "userId, productId, and message are required" });
    }

    if (!ObjectId.isValid(userId) || !ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid userId or productId" });
    }

    const userObjectId = new ObjectId(userId);
    const productObjectId = new ObjectId(productId);

    // Fetch user and product
    const user = await db
      .collection<User>("users")
      .findOne({ _id: userObjectId });
    const product = await db
      .collection<Product>("products")
      .findOne({ _id: productObjectId });

    if (!user) return res.status(404).json({ error: "User not found" });
    if (!product) return res.status(404).json({ error: "Product not found" });

    // Check if product allows pre-orders
    if (!product.allowPreOrder) {
      return res
        .status(400)
        .json({ error: "Product does not allow pre-orders" });
    }

    // Check if user has sufficient balance
    if (user.balance < product.price) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Deduct product price from user's balance
    const newBalance = user.balance - product.price;
    await db
      .collection<User>("users")
      .updateOne({ _id: userObjectId }, { $set: { balance: newBalance } });

    // Create the pre-order
    const newPreOrder: PreOrder = {
      _id: new ObjectId(), // Ensure a new ObjectId is assigned
      userId: userObjectId,
      productId: productObjectId,
      date: new Date(), // Assign Date object
      status: "pending",
      message, // Store the user's message
      userName: user.username,
      userTelegramId: user.telegramId,
      productName: product.name,
      productPrice: product.price,
    };

    const result = await db
      .collection<PreOrder>("preorders")
      .insertOne(newPreOrder);

    // Log the pre-order creation in history
    const historyEntry: HistoryEntry = {
      entity: "preorder",
      entityId: result.insertedId,
      action: "created",
      timestamp: new Date(), // Assign Date object
      performedBy: {
        type: "system", // Since there's no user performing this action
        id: null,
      },
      details: `Pre-order created for product '${product.name}' with message: '${message}'`,
      metadata: {
        userId: userObjectId,
        productId: productObjectId,
        price: product.price,
        message,
      },
    };

    await db.collection<HistoryEntry>("history").insertOne(historyEntry);

    // Send confirmation message to the user via the bot
    const confirmationMessage = `✅ Your pre-order for product "${product.name}" has been placed successfully!\n\n💬 Message: "${message}"\n\nWe will notify you once the product is available.`;
    await bot.api.sendMessage(user.telegramId, confirmationMessage);

    res.status(201).json({
      message: "Pre-order created successfully",
      preOrderId: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating pre-order:", error);
    res.status(500).json({ error: "Error creating pre-order" });
  }
};

// Update a pre-order's status (e.g., cancel)
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

      // Update the fulfillment date and status
      await db
        .collection<PreOrder>("preorders")
        .updateOne(
          { _id: preOrderId },
          { $set: { status, fulfillmentDate: new Date() } }
        );

      // Send fulfillment message with email and password via bot
      await bot.api.sendMessage(
        user.telegramId,
        `🎉 Your pre-order for "${product.name}" has been fulfilled!\n\n💬 Message: "${preOrder.message}"\n\n📧 Credentials:\n${emailPassword}\n\nThank you for your patience!`
      );
    } else if (status === "canceled") {
      // Refund the user's balance
      const refundAmount = product.price;
      await db
        .collection<User>("users")
        .updateOne({ _id: user._id }, { $inc: { balance: refundAmount } });

      // Update the status to canceled
      await db
        .collection<PreOrder>("preorders")
        .updateOne({ _id: preOrderId }, { $set: { status } });

      // Send cancellation message via bot
      await bot.api.sendMessage(
        user.telegramId,
        `❌ Your pre-order for "${product.name}" has been canceled.\n\n💬 Message: "${preOrder.message}"\n\nThe amount of ${refundAmount} has been refunded to your balance.`
      );
    }

    res.status(200).json({ message: "Pre-order status updated successfully" });
  } catch (error) {
    console.error("Error updating pre-order status:", error);
    res.status(500).json({ error: "Error updating pre-order status" });
  }
};

// Fulfill a pre-order
export const fulfillPreOrder = async (req: Request, res: Response) => {
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
    const { fulfillmentDetails } = req.body;

    if (!fulfillmentDetails || typeof fulfillmentDetails !== "string") {
      return res.status(400).json({
        error: "Fulfillment details are required and must be a string",
      });
    }

    // Find the pre-order
    const preOrder = await db
      .collection<PreOrder>("preorders")
      .findOne({ _id: preOrderId });
    if (!preOrder)
      return res.status(404).json({ error: "Pre-order not found" });

    // Only allow fulfilling from 'pending' status
    if (preOrder.status !== "pending") {
      return res.status(400).json({
        error: `Cannot fulfill pre-order from status '${preOrder.status}'`,
      });
    }

    // Fetch product and user details
    const product = await db
      .collection<Product>("products")
      .findOne({ _id: preOrder.productId });
    const user = await db
      .collection<User>("users")
      .findOne({ _id: preOrder.userId });

    if (!product) {
      return res.status(404).json({ error: "Associated product not found" });
    }

    if (!user) {
      return res.status(404).json({ error: "Associated user not found" });
    }

    // Assign an email to the pre-order from product's email list
    if (!product.emails || product.emails.length === 0) {
      return res
        .status(400)
        .json({ error: "No available emails to assign for fulfillment" });
    }

    const assignedEmail = product.emails.shift(); // Get the first email
    if (!assignedEmail) {
      return res
        .status(400)
        .json({ error: "No available emails to assign for fulfillment" });
    }

    // Update the product's emails and availability
    await db.collection<Product>("products").updateOne(
      { _id: product._id },
      {
        $set: {
          emails: product.emails,
          isAvailable: product.emails.length > 0,
        },
      }
    );

    // Update the pre-order status, fulfillmentDate, and fulfillmentDetails
    const updateFields: Partial<PreOrder> = {
      status: "fulfilled",
      fulfillmentDate: new Date(), // Assign Date object
      fulfillmentDetails,
    };

    await db
      .collection<PreOrder>("preorders")
      .updateOne({ _id: preOrderId }, { $set: updateFields });

    // Log the fulfillment in history
    const historyEntry: HistoryEntry = {
      entity: "preorder",
      entityId: preOrderId,
      action: "fulfilled",
      timestamp: new Date(), // Assign Date object
      performedBy: {
        type: "system", // Since there's no user performing this action
        id: null,
      },
      details: `Pre-order fulfilled with details: '${fulfillmentDetails}' and assigned email: '${assignedEmail}'`,
      metadata: {
        preOrderId,
        fulfillmentDetails,
        assignedEmail,
      },
    };

    await db.collection<HistoryEntry>("history").insertOne(historyEntry);

    // Notify the user via the bot
    const fulfillmentMessage = `🎉 Good news! Your pre-order for "${product.name}" has been fulfilled.\n\n📧 Assigned Email: ${assignedEmail}\n\n💬 Your original message: "${preOrder.message}"\n\nThank you for your purchase!`;
    await bot.api.sendMessage(user.telegramId, fulfillmentMessage);

    res
      .status(200)
      .json({ message: "Pre-order fulfilled successfully", assignedEmail });
  } catch (error) {
    console.error("Error fulfilling pre-order:", error);
    res.status(500).json({ error: "Error fulfilling pre-order" });
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
    console.error("Error fetching pre-order:", error);
    res.status(500).json({ error: "Error fetching pre-order" });
  }
};

// Delete a pre-order by ID
export const deletePreOrderById = async (req: Request, res: Response) => {
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

    // Find the pre-order
    const preOrder = await db
      .collection<PreOrder>("preorders")
      .findOne({ _id: preOrderId });
    if (!preOrder)
      return res.status(404).json({ error: "Pre-order not found" });

    // Delete the pre-order
    const result = await db
      .collection<PreOrder>("preorders")
      .deleteOne({ _id: preOrderId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Pre-order not found" });
    }

    // Log the deletion in history
    const historyEntry: HistoryEntry = {
      entity: "preorder",
      entityId: preOrderId,
      action: "deleted",
      timestamp: new Date(), // Assign Date object
      performedBy: {
        type: "system", // Since there's no user performing this action
        id: null,
      },
      details: `Pre-order deleted`,
      metadata: {
        preOrderId,
        userId: preOrder.userId,
        productId: preOrder.productId,
      },
    };

    await db.collection<HistoryEntry>("history").insertOne(historyEntry);

    res.status(200).json({ message: "Pre-order deleted successfully" });
  } catch (error) {
    console.error("Error deleting pre-order:", error);
    res.status(500).json({ error: "Error deleting pre-order" });
  }
};
