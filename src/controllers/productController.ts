// src/controllers/productController.ts
import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectToDB } from "../db";
import { ProductHistoryEntry } from "../models/product";

// Fetch all products
export const getAllProducts = async (_req: Request, res: Response) => {
  try {
    const db = await connectToDB();
    const products = await db.collection("products").find().toArray();
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
    const product = await db.collection("products").findOne({ _id: productId });
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
    } = req.body;

    if (!price || !categoryId) {
      return res
        .status(400)
        .json({ error: "Price and categoryId are required" });
    }

    // Check if the category exists
    const category = await db
      .collection("categories")
      .findOne({ _id: new ObjectId(categoryId) });
    if (!category)
      return res.status(400).json({ error: "Invalid category ID" });

    const newProduct = {
      name,
      description,
      price,
      emails: emails.length > 0 ? emails : ["noemail@default.com"],
      categoryId: new ObjectId(categoryId),
      password,
      productHistory: [
        {
          date: new Date(),
          type: "created",
          description: `Product '${name}' created`,
        } as ProductHistoryEntry,
      ],
    };

    const result = await db.collection("products").insertOne(newProduct);
    res
      .status(201)
      .json({ message: "Product created", productId: result.insertedId });
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
    const { name, description, price, emails, categoryId, password } = req.body;

    // Find the existing product to retrieve current values
    const existingProduct = await db
      .collection("products")
      .findOne({ _id: productId });
    if (!existingProduct)
      return res.status(404).json({ error: "Product not found" });

    // Validate the category ID format and check if the category exists
    if (categoryId && !ObjectId.isValid(categoryId)) {
      return res.status(400).json({ error: "Invalid category ID format" });
    }
    if (categoryId) {
      const categoryExists = await db
        .collection("categories")
        .findOne({ _id: new ObjectId(categoryId) });
      if (!categoryExists)
        return res.status(400).json({ error: "Category not found" });
    }

    // Create a history entry for the update
    const updatedHistoryEntry: ProductHistoryEntry = {
      date: new Date(),
      type: "updated",
      description: `Product '${name || existingProduct.name}' updated`,
    };

    // Update only the provided fields, retaining existing values where not provided
    const result = await db.collection("products").updateOne(
      { _id: productId },
      {
        $set: {
          name: name ?? existingProduct.name,
          description: description ?? existingProduct.description,
          price: price ?? existingProduct.price,
          emails: emails ?? existingProduct.emails,
          categoryId: categoryId
            ? new ObjectId(categoryId)
            : existingProduct.categoryId,
          password: password ?? existingProduct.password,
        },
        $push: { productHistory: updatedHistoryEntry as unknown as any },
      }
    );

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
    const result = await db
      .collection("products")
      .deleteOne({ _id: productId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Error deleting product" });
  }
};
