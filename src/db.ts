// src/db.ts
import dotenv from "dotenv";
import { MongoClient, Db } from "mongodb";

dotenv.config();
const dbName = process.env.DBName;
const uri: string =
  process.env.MONGODB_URI ||
  `mongodb+srv://admin:admin@chamso.nq0nw.mongodb.net/?retryWrites=true&w=majority&appName=${dbName}`;
const client: MongoClient = new MongoClient(uri);

let isConnected: boolean = false;

// Function to connect to MongoDB
export const connectToDB = async (): Promise<Db> => {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
    console.log("Connected to MongoDB successfully.");
  }
  return client.db(dbName); // Replace 'chamso' with your database name
};

export const db = client.db(dbName);
