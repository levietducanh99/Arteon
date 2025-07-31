import User from "../models/user.models.js";
import Follow from "../models/follow.models.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const getUSer = async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({ username });

  const { hashedPassword, ...detailsWithoutPassword } = user.toObject();

  const followerCount = await Follow.countDocuments({ following: user._id });
  const followingCount = await Follow.countDocuments({ follower: user._id });

  const token = req.cookies.token;

  if (!token) {
    res.status(200).json({
      ...detailsWithoutPassword,
      followerCount,
      followingCount,
      isFollowing: false,
    });
  } else {
    jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
      if (!err) {
        const isExits = await Follow.exists({
          follower: payload.userId,
          following: user._id,
        });

        const currentUser = await User.findById(payload.userId);

        res.status(200).json({
          ...detailsWithoutPassword,
          followerCount,
          followingCount,
          isFollowing: isExits ? true : false,
          currentUser: currentUser.username,
        });
      }

      req.userId = payload.userId;
    });
  }
};

export const registerUser = async (req, res) => {
  const { username, displayName, email, password } = req.body;
  // console.log(req.body);

  if (!username || !displayName || !email || !password)
    return res.status(400).json({ message: "All fields are required!!" });

  const newHashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    displayName,
    email,
    hashedPassword: newHashedPassword,
  });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

  const { hashedPassword, ...detailsWithoutPassword } = user.toObject();

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json(detailsWithoutPassword);
};

export const logoutUser = async (req, res) => {
  res.clearCookie("token");

  res.status(200).json({ message: "Logout succesfully" });
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  // console.log(req.body);

  if (!email || !password)
    return res.status(400).json({ message: "All fields are required!!" });

  const user = await User.findOne({ email });

  // console.log(user);

  if (!user) {
    req.status(401).json({ message: "Invalid email or password" });
  }

  const isCorrectPassword = await bcrypt.compare(password, user.hashedPassword);

  if (!isCorrectPassword) {
    req.status(401).json({ message: "Invalid email or password" });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  const { hashedPassword, ...detailsWithoutPassword } = user.toObject();

  res.status(200).json(detailsWithoutPassword);
};

export const followUser = async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({ username });

  const isFollowing = await Follow.exists({
    follower: req.userId,
    following: user._id,
  });

  if (isFollowing) {
    await Follow.deleteOne({ follower: req.userId, following: user._id });
  } else {
    await Follow.create({ follower: req.userId, following: user._id });
  }

  res.status(200).json({ message: "Successfull!!!" });
};
