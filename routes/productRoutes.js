const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Product = require("../models/product");
const cloudinary = require("../utils/cloudinary");
const multer = require("multer");
const authenticate = require("../middleware/authMiddleware");


const isSeller = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (req.user.role !== "seller")
    return res.status(403).json({ message: "Only sellers can perform this action" });
  next();
};

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) cb(null, true);
    else cb(new Error("Only video files are allowed"));
  },
});

// -------------------- CREATE PRODUCT --------------------
router.post(
  "/create_product",
  authenticate,
  isSeller,
  upload.single("video"),
  async (req, res) => {
    try {
      const { title, description, price, category } = req.body;
      if (!title || !description || !price)
        return res.status(400).json({ message: "Title, description, and price are required" });
      if (!req.file)
        return res.status(400).json({ message: "Product video is required" });

      // Upload video to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "video", folder: "flockr/products" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      // Create product
      const newProduct = await Product.create({
        owner: req.user.id,
        title,
        description,
        price,
        category,
        videoUrl: uploadResult.secure_url,
        cloudinaryPublicId: uploadResult.public_id,
        isAvailable: true,
        views: 0,
      });

      res.status(201).json(newProduct);
    } catch (error) {
      console.error("Create product error:", error.message);
      res.status(500).json({ message: error.message });
    }
  }
);

// -------------------- GET ALL PRODUCTS (Feed) --------------------
router.get("/discover", async (req, res) => {
  try {
    let { page = 1, limit = 10, category, search } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const query = {};
    if (category) query.category = category;
    if (search) query.title = { $regex: search, $options: "i" };

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("owner", "firstName lastName email");

    res.json({ page, limit, total, products });
  } catch (error) {
    console.error("Get products error:", error.message);
    res.status(500).json({ message: error.message });
  }
});


router.get("/product/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(productId))
      return res.status(400).json({ message: "Invalid product ID" });

    const product = await Product.findById(productId).populate(
      "owner",
      "firstName lastName email"
    );
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Increment views
    product.views += 1;
    await product.save();

    res.json(product);
  } catch (error) {
    console.error("Get single product error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// -------------------- UPDATE PRODUCT --------------------
router.put(
  "/update_product/:id",
  authenticate,
  isSeller,
  upload.single("video"),
  async (req, res) => {
    try {
      const productId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(productId))
        return res.status(400).json({ message: "Invalid product ID" });

      let product = await Product.findById(productId);
      if (!product) return res.status(404).json({ message: "Product not found" });

      // Ownership check
      if (product.owner.toString() !== req.user.id)
        return res.status(403).json({ message: "Not authorized to update this product" });

      const { title, description, price, category, isAvailable } = req.body;

      if (title) product.title = title;
      if (description) product.description = description;
      if (price) product.price = price;
      if (category) product.category = category;
      if (isAvailable !== undefined) product.isAvailable = isAvailable;

      // Replace video if uploaded
      if (req.file) {
        await cloudinary.uploader.destroy(product.cloudinaryPublicId, {
          resource_type: "video",
        });

        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { resource_type: "video", folder: "flockr/products" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });

        product.videoUrl = uploadResult.secure_url;
        product.cloudinaryPublicId = uploadResult.public_id;
      }

      await product.save();
      res.json(product);
    } catch (error) {
      console.error("Update product error:", error.message);
      res.status(500).json({ message: error.message });
    }
  }
);

// -------------------- DELETE PRODUCT --------------------
router.delete("/delete_product/:id", authenticate, isSeller, async (req, res) => {
  try {
    const productId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(productId))
      return res.status(400).json({ message: "Invalid product ID" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Ownership check
    if (product.owner.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized to delete this product" });

    // Delete Cloudinary video
    await cloudinary.uploader.destroy(product.cloudinaryPublicId, {
      resource_type: "video",
    });

    await product.deleteOne();
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
