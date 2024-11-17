import { ObjectId } from "mongodb";

export interface Product {
  _id?: ObjectId;
  name: string;
  description?: string;
  price: number;
  emails: string[];
  categoryId: ObjectId;
  allowPreOrder: boolean;
  isAvailable: boolean;
  createdDate: Date;
}
