// src/server.ts
import express, { Request, Response } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import userRoutes from "./routes/userRoutes";
import productRoutes from "./routes/productRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import { asyncHandler } from "./utils/asyncHandler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Basic route for server check
app.get(
  "/",
  asyncHandler((req: Request, res: Response) => res.send("I'm alive"))
);

// User routes
app.use("/users", userRoutes);

// Category routes
app.use("/categories", categoryRoutes);

// Product routes
app.use("/products", productRoutes);

// Start server function
export const startServer = () => {
  return new Promise<void>((resolve, reject) => {
    app
      .listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        resolve();
      })
      .on("error", (err) => {
        console.error("Failed to start server:", err);
        reject(err);
      });
  });
};
