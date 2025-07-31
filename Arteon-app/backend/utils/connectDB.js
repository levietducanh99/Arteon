import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MONGODB IS CONNECTED!!");
  } catch (err) {
    console.log("MONGO CONNECTION ERROR", err);
  }
};

export default connectDB;
