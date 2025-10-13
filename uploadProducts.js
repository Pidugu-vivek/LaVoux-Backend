import mongoose from "mongoose";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import Product from "./models/productModel.js";

dotenv.config();

// Cloudinary setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

console.log("🔧 Cloudinary Configuration:");
console.log("  Cloud Name:", process.env.CLOUDINARY_NAME || "❌ Missing");
console.log("  API Key:", process.env.CLOUDINARY_API_KEY ? "✅ Loaded" : "❌ Missing");
console.log("  API Secret:", process.env.CLOUDINARY_SECRET_KEY ? "✅ Loaded" : "❌ Missing");

// Configuration
const CONFIG = {
  productsPath: "./products.json",
  imagesPath: "../frontend/src/assets",
  cloudinaryFolder: "LaVoux/products",
  clearExisting: false, // Set to true to clear existing products before upload
};

async function uploadProducts() {
  try {
    // MongoDB connect
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected\n");

    // Optional: Clear existing products
    if (CONFIG.clearExisting) {
      const deleteResult = await Product.deleteMany({});
      console.log(`🗑️  Cleared ${deleteResult.deletedCount} existing products\n`);
    }

    // Load products JSON
    const productsPath = path.resolve(CONFIG.productsPath);
    
    if (!fs.existsSync(productsPath)) {
      throw new Error(`Products file not found at: ${productsPath}`);
    }

    const rawData = fs.readFileSync(productsPath, "utf-8");
    const { products } = JSON.parse(rawData);

    console.log(`📦 Found ${products.length} products to upload\n`);

    // Track statistics
    const stats = {
      success: 0,
      failed: 0,
      totalImages: 0,
      failedImages: 0,
    };

    // Process each product
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`\n[${i + 1}/${products.length}] Processing: ${product.name}`);

      const imageUrls = [];

      // Upload images to Cloudinary
      for (const img of product.image) {
        const imgPath = path.resolve(CONFIG.imagesPath, img);
        stats.totalImages++;

        if (!fs.existsSync(imgPath)) {
          console.log(`  ⚠️  Image not found: ${img}`);
          stats.failedImages++;
          continue;
        }

        try {
          const upload = await cloudinary.uploader.upload(imgPath, {
            folder: CONFIG.cloudinaryFolder,
            resource_type: "auto",
          });
          imageUrls.push(upload.secure_url);
          console.log(`  ✅ Uploaded image: ${img}`);
        } catch (err) {
          console.error(`  ❌ Cloudinary upload failed for ${img}:`, err.message);
          stats.failedImages++;
        }
      }

      // Only create product if at least one image uploaded successfully
      if (imageUrls.length === 0) {
        console.log(`  ⚠️  Skipping product (no images uploaded): ${product.name}`);
        stats.failed++;
        continue;
      }

      // Update product data
      product.image = imageUrls;
      product.date = new Date(product.date); // Convert timestamp to Date
      
      // Remove the old _id, let MongoDB generate a new one
      delete product._id;

      // Save to MongoDB
      try {
        await Product.create(product);
        console.log(`  ✅ Saved to database: ${product.name}`);
        stats.success++;
      } catch (err) {
        console.error(`  ❌ MongoDB save failed:`, err.message);
        stats.failed++;
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(50));
    console.log("🎉 Upload Complete!");
    console.log("=".repeat(50));
    console.log(`✅ Products uploaded: ${stats.success}`);
    console.log(`❌ Products failed: ${stats.failed}`);
    console.log(`📸 Total images processed: ${stats.totalImages}`);
    console.log(`❌ Images failed: ${stats.failedImages}`);
    console.log("=".repeat(50));

  } catch (error) {
    console.error("\n💥 Fatal Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ MongoDB disconnected");
  }
}

// Run the upload
uploadProducts();