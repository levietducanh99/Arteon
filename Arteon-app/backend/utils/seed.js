import express from "express";
import User from "../models/user.models.js";
import Board from "../models/board.models.js";
import Comment from "../models/comment.models.js";
import Pin from "../models/pin.models.js";
import bcrypt from "bcryptjs";
import connectDB from "./connectDB.js";
import commentModels from "../models/comment.models.js";

connectDB();

const seedDB = async () => {
  await User.deleteMany({});
  await Board.deleteMany({});
  await Pin.deleteMany({});
  await Comment.deleteMany({});

  const users = [];
  for (let i = 1; i <= 10; i++) {
    const hashedPassword = await bcrypt.hash("password123", 10);
    const user = new User({
      displayName: `User ${i}`,
      username: `user${i}`,
      email: `user${i}@mail.com`,
      hashedPassword: hashedPassword,
      img: `http://picsum.photos/id/${i}/200/200`,
    });
    users.push(await user.save());
  }

  const boards = [];
  for (const user of users) {
    for (let i = 1; i <= 10; i++) {
      const board = new Board({
        title: `Board ${i} of ${user.username}`,
        user: user._id,
      });
      boards.push(await board.save());
    }
  }

  const pins = [];
  for (const user of users) {
    const userBoard = boards.filter(
      (board) => board.user.toString() === user._id.toString()
    );
    for (let i = 1; i <= 10; i++) {
      const mediaSize = Math.random() < 0.5 ? "800/1200" : "800/600";
      const pin = new Pin({
        media: `http://picsum.photos/id/${i + 10}/${mediaSize}`,
        width: 800,
        height: mediaSize === "800/1200" ? 1200 : 600,
        title: `Pin ${i} by ${user.username}`,
        description: `This is pin ${i} create by ${user.username}`,
        link: `http://example.com/pin${i}`,
        board: userBoard[i - 1]._id,
        tags: [`tag${i}`, "sample", user.username],
        user: user._id,
      });
      pins.push(await pin.save());
    }
  }

  for (const user of users) {
    for (let i = 1; i <= 10; i++) {
      const randomPin = pins[Math.floor(Math.random() * pins.length)];
      const comment = new Comment({
        description: `Comment ${i} by ${user.username}: This is a great pin`,
        pin: randomPin._id,
        user: user._id,
      });
      await comment.save();
    }
  }

  console.log("Databased seeded succesfullly!!!");
  process.exit(0);
};

seedDB().catch((err) => {
  console.log("Error seeding database", err);
  process.exit(1);
});
