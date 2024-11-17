import { ObjectId } from "mongodb";

export interface Category {
  _id?: ObjectId;
  name: string;
  createdDate: Date;
  isActive: boolean;
}
