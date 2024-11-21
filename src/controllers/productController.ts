import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectToDB } from "../db";
import { Product } from "../models/product";
import { HistoryEntry } from "../models/history";
import { Category } from "../models/category";

// Fetch all products
export const getAllProducts = async (_req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const products = await db.collection<Product>("products").find().toArray();
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Error fetching products" });
  }
};

// Fetch a single product by ID
export const getProductById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const productId = new ObjectId(req.params.id);
    const product = await db
      .collection<Product>("products")
      .findOne({ _id: productId });

    if (!product) return res.status(404).json({ error: "Product not found" });

    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Error fetching product" });
  }
};

// Create a new product
export const createProduct = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const {
      name = "Unnamed Product",
      description = "",
      price,
      emails = [],
      categoryId,
      password = "default_password",
      allowPreOrder = false,
    }: {
      name?: string;
      description?: string;
      price: number;
      emails: string[]; // Ensure emails is of type string[]
      categoryId: string;
      password?: string;
      allowPreOrder?: boolean;
    } = req.body;

    if (!price || !categoryId) {
      return res
        .status(400)
        .json({ error: "Price and categoryId are required" });
    }

    // Validate categoryId format and check if category exists
    if (!ObjectId.isValid(categoryId)) {
      return res.status(400).json({ error: "Invalid category ID format" });
    }

    const category = await db
      .collection<Category>("categories")
      .findOne({ _id: new ObjectId(categoryId) });

    if (!category)
      return res.status(400).json({ error: "Invalid category ID" });

    // Ensure emails are unique and valid
    const uniqueEmails = [...new Set(emails)];
    const invalidEmails = uniqueEmails.filter(
      (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );

    if (invalidEmails.length > 0) {
      return res.status(400).json({ error: "Invalid email(s) found" });
    }

    const newProduct: Product = {
      name,
      description,
      price,
      emails: uniqueEmails.length > 0 ? uniqueEmails : [],
      categoryId: new ObjectId(categoryId),
      allowPreOrder,
      isAvailable: uniqueEmails.length > 0,
      createdDate: new Date(),
    };

    const result = await db
      .collection<Product>("products")
      .insertOne(newProduct);

    // Log the creation in the centralized history collection
    const historyEntry: HistoryEntry = {
      entity: "product",
      entityId: result.insertedId,
      action: "created",
      timestamp: new Date(),
      performedBy: {
        type: "admin",
        id: null,
      },
      details: `Product '${name}' created`,
      metadata: {
        productId: result.insertedId,
        name,
        price,
        categoryId: newProduct.categoryId,
      },
    };
    await db.collection<HistoryEntry>("history").insertOne(historyEntry);

    res.status(201).json({
      message: "Product created",
      productId: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Error creating product" });
  }
};

// Update a product by ID
export const updateProductById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const productId = new ObjectId(req.params.id);
    const {
      name,
      description,
      price,
      emails = [],
      categoryId,
      password,
      allowPreOrder,
    }: {
      name?: string;
      description?: string;
      price?: number;
      emails: string[]; // Ensure emails is of type string[]
      categoryId?: string;
      password?: string;
      allowPreOrder?: boolean;
    } = req.body;

    // Check if product exists
    const existingProduct = await db
      .collection<Product>("products")
      .findOne({ _id: productId });

    if (!existingProduct)
      return res.status(404).json({ error: "Product not found" });

    // Validate and check if category exists if categoryId is provided
    if (categoryId && !ObjectId.isValid(categoryId)) {
      return res.status(400).json({ error: "Invalid category ID format" });
    }

    if (categoryId) {
      const categoryExists = await db
        .collection<Category>("categories")
        .findOne({ _id: new ObjectId(categoryId) });

      if (!categoryExists)
        return res.status(400).json({ error: "Category not found" });
    }

    // Validate emails format
    const updatedEmails = emails
      ? [...new Set(emails)]
      : existingProduct.emails;
    const invalidEmails = updatedEmails.filter(
      (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );

    if (invalidEmails.length > 0) {
      return res.status(400).json({ error: "Invalid email(s) found" });
    }

    const updatedFields: Partial<Product> = {
      name: name ?? existingProduct.name,
      description: description ?? existingProduct.description,
      price: price ?? existingProduct.price,
      emails: updatedEmails,
      allowPreOrder: allowPreOrder ?? existingProduct.allowPreOrder,
      isAvailable: updatedEmails.length > 0,
    };

    if (categoryId) {
      updatedFields.categoryId = new ObjectId(categoryId);
    }

    const result = await db.collection<Product>("products").updateOne(
      { _id: productId },
      {
        $set: updatedFields,
      }
    );

    // Log the update in the history collection
    const historyEntry: HistoryEntry = {
      entity: "product",
      entityId: productId,
      action: "updated",
      timestamp: new Date(),
      performedBy: {
        type: "admin",
        id: null,
      },
      details: `Product '${existingProduct.name}' updated`,
      metadata: {
        productId,
        updatedFields,
      },
    };
    await db.collection<HistoryEntry>("history").insertOne(historyEntry);

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json({ message: "Product updated" });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Error updating product" });
  }
};

// Delete a product by ID
export const deleteProductById = async (req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const productId = new ObjectId(req.params.id);

    // Find the existing product
    const existingProduct = await db
      .collection<Product>("products")
      .findOne({ _id: productId });

    if (!existingProduct)
      return res.status(404).json({ error: "Product not found" });

    // Delete the product
    const result = await db
      .collection<Product>("products")
      .deleteOne({ _id: productId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Log the deletion in the history collection
    const historyEntry: HistoryEntry = {
      entity: "product",
      entityId: productId,
      action: "deleted",
      timestamp: new Date(),
      performedBy: {
        type: "admin",
        id: null,
      },
      details: `Product '${existingProduct.name}' deleted`,
      metadata: {
        productId,
        name: existingProduct.name,
      },
    };
    await db.collection<HistoryEntry>("history").insertOne(historyEntry);

    res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Error deleting product" });
  }
};
