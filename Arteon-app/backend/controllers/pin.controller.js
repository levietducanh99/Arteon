import Pin from "../models/pin.models.js";
import Like from "../models/like.model.js";
import Save from "../models/Save.model.js";
import jwt from "jsonwebtoken";
import sharp from "sharp";
import Imagekit from "imagekit";
import { initializeVault } from "../utils/vaultService.js";

export const getPins = async (req, res) => {
  const pageNumber = Number(req.query.cursor) || 0;
  const search = req.query.search;
  const userId = req.query.userId;
  const boardId = req.query.boardId;

  const LIMIT = 21;

  const pins = await Pin.find(
    search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { tags: { $in: [search] } },
          ],
        }
      : userId
      ? { user: userId }
      : boardId
      ? {
          board: boardId,
        }
      : {}
  )
    .limit(LIMIT)
    .skip(LIMIT * pageNumber);

  const hasNextPage = pins.length === LIMIT;

  res
    .status(200)
    .json({ pins, nextCursor: hasNextPage ? pageNumber + 1 : null });
};

export const getPin = async (req, res) => {
  const { id } = req.params;

  const pin = await Pin.findById(id).populate(
    "user",
    "username img displayName"
  );

  res.status(200).json(pin);
};

export const createPin = async (req, res) => {
  const { title, description, link, tags, textOptions, canvasOptions, board } =
    req.body;
  const media = req.files.media;

  if ((!title, !description, !media)) {
    return res
      .status(400)
      .json({ message: "Title, description and media are required." });
  }

  const parsedTextOptions = JSON.parse(textOptions || "{}");
  const parsedCanvasOptions = JSON.parse(canvasOptions || "{}");

  const metadata = await sharp(media.data).metadata();

  const originalOrientation =
    metadata.with < metadata.height ? "portrait" : "landscape";
  const originalAspectRatio = metadata.width / metadata.height;

  let height, width, clientAspectRatio;
  if (parsedCanvasOptions.size !== "original") {
    clientAspectRatio =
      parsedCanvasOptions.size.split(":")[0] /
      parsedCanvasOptions.size.split(":")[1];
  } else {
    parsedCanvasOptions.originalOrientation === originalOrientation
      ? (clientAspectRatio = originalOrientation)
      : (clientAspectRatio = 1 / originalAspectRatio);
  }

  width = metadata.width;
  height = metadata.width / clientAspectRatio;

  const imagekit = new Imagekit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });

  const textLeftPosition = Math.round((parsedTextOptions.left * width) / 375);
  const textTopPosition = Math.round(
    (parsedTextOptions.top * height) / parsedCanvasOptions.height
  );

  const transformationString = `w-${width},h-${height}${
    originalAspectRatio > clientAspectRatio ? ",cm-pad_resize" : ""
  },bg-${parsedCanvasOptions.backgroundColor.substring(1)}${
    parsedTextOptions.text
      ? `,l-text,i-${parsedTextOptions.text},fs-${
          parsedTextOptions.fontSize * 2.1
        },lx-${textLeftPosition},ly-${textTopPosition},co-${parsedTextOptions.color.substring(
          1
        )},l-end`
      : ""
  }`;
  imagekit
    .upload({
      file: media.data,
      fileName: media.name,
      folder: "pins",
      transformation: {
        pre: transformationString,
      },
    })
    .then(async (response) => {
      console.log("ImageKit upload response:", response);

      try {
        // Tạo Pin trước (không cần publicKey)
        const newPin = await Pin.create({
          user: req.userId,
          title,
          description,
          link: link || "",
          tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
          board: board || null,
          media: response.filePath,
          width: response.width,
          height: response.height,
          // Không cần publicKey nữa vì đã không bắt buộc
        });

        console.log("📝 Pin created with ID:", newPin._id.toString());

        // Tạo metadata với số tăng dần dựa trên timestamp
        const timestamp = Date.now();
        const metadataUri = `arteon-nft-${timestamp}`;
        const totalSupply = 1000000; // Default total supply

        console.log("🚀 Creating vault with metadata:", metadataUri);

        const vaultResult = await initializeVault(metadataUri, totalSupply);

        if (vaultResult.success) {
          // Cập nhật Pin với publicKey của vault
          const updatedPin = await Pin.findByIdAndUpdate(
            newPin._id,
            { publicKey: vaultResult.vaultPublicKey },
            { new: true }
          );

          console.log("✅ Pin updated with vault publicKey:", vaultResult.vaultPublicKey);

          return res.status(201).json({
            ...updatedPin.toObject(),
            vaultInfo: {
              publicKey: vaultResult.vaultPublicKey,
              transactionSignature: vaultResult.transactionSignature,
              authority: vaultResult.authority,
              network: vaultResult.network,
              metadata: metadataUri,
            }
          });
        } else {
          // Nếu tạo vault thất bại, vẫn trả về Pin nhưng không có publicKey
          console.log("⚠️ Vault creation failed, returning pin without vault");
          return res.status(201).json({
            ...newPin.toObject(),
            vaultError: "Failed to create vault"
          });
        }
      } catch (error) {
        console.error("❌ Error in pin creation process:", error);
        return res.status(500).json({
          message: "Error creating pin and vault",
          error: error.message
        });
      }
    })
    .catch((error) => {
      console.error("ImageKit upload error:", error);
      return res.status(500).json({ message: "Error uploading image." });
    });
};

export const interactionCheck = async (req, res) => {
  const { id } = req.params;
  const token = req.cookies.token;

  const likeCount = await Like.countDocuments({ pin: id });

  if (!token) {
    return res.status(200).json({ likeCount, isLiked: false, isSaved: false });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    const userId = payload.userId;

    const isLiked = await Like.findOne({
      user: userId,
      pin: id,
    });

    const isSaved = await Save.findOne({
      user: userId,
      pin: id,
    });

    return res.status(200).json({
      likeCount,
      isLiked: isLiked ? true : false,
      isSaved: isSaved ? true : false,
    });
  });
};

export const interact = async (req, res) => {
  const { id } = req.params;
  const { type } = req.body; // 'like' or 'save'
  const token = req.cookies.token;

  if (!token) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  if (type === "like") {
    const existingLike = await Like.findOne({ user: req.userId, pin: id });

    if (existingLike) {
      await Like.deleteOne({ pin: id, user: req.userId });
      return res.status(200).json({ message: "Like removed" });
    } else {
      await Like.create({ user: req.userId, pin: id });
      return res.status(200).json({ message: "Pin liked" });
    }
  } else if (type === "save") {
    const existingSave = await Save.findOne({ user: req.userId, pin: id });

    if (existingSave) {
      await Save.deleteOne({ pin: id, user: req.userId });
      return res.status(200).json({ message: "Pin unsaved" });
    } else {
      await Save.create({ user: req.userId, pin: id });
      return res.status(200).json({ message: "Pin saved" });
    }
  } else {
    return res.status(400).json({ message: "Invalid interaction type" });
  }
};
