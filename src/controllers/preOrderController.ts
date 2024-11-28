import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectToDB } from "../db";
import { HistoryEntry } from "../models/history";
import { Product } from "../models/product";
import { User } from "../models/user";
import { bot } from "../bot";
import { PreOrder } from "../models/preorder";

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || "5565239578";

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

    const assignedEmail = product.emails.shift();
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
      fulfillmentDate: new Date(),
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
      timestamp: new Date(),
      performedBy: {
        type: "system",
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

    // Notify the user via the bot (updated to only notify the user)
    const fulfillmentMessage = `Your pre-order for the product "${product.name}" has been fulfilled. The assigned email is: ${assignedEmail}. Additional message: ${preOrder.message}`;
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
      details: `Pre-order with ${preOrderId} deleted`,
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
