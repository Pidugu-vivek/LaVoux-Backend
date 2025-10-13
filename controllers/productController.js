import { v2 as cloudinary } from "cloudinary"
import productModel from "../models/productModel.js";
import { redisClient } from "../config/redis.js";

// function for add product
const addProduct = async (req, res) => {
    try {

        const { name, description, price, category, subCategory, sizes, bestseller } = req.body

        const image1 = req.files.image1 && req.files.image1[0]
        const image2 = req.files.image2 && req.files.image2[0]
        const image3 = req.files.image3 && req.files.image3[0]
        const image4 = req.files.image4 && req.files.image4[0]

        const images = [image1, image2, image3, image4].filter((item) => item !== undefined)

        let imagesUrl = await Promise.all(
            images.map(async (item) => {
                let result = await cloudinary.uploader.upload(item.path, { resource_type: 'image' });
                return result.secure_url
            })
        )

        const productData = {
            name,
            description,
            category,
            price: Number(price),
            subCategory,
            bestseller: bestseller === "true" ? true : false,
            sizes: JSON.parse(sizes),
            image: imagesUrl,
            date: Date.now()
        }

        console.log(productData);

        const product = new productModel(productData);
        await product.save();
        await redisClient.del('products:all');

        res.json({ success: true, message: "Product Added" })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// function for list product
const listProducts = async (req, res) => {
    const cacheKey = 'products:all';
    try {
        const cachedProducts = await redisClient.get(cacheKey);
        if (cachedProducts) {
            return res.json({ success: true, products: JSON.parse(cachedProducts) });
        }

        const products = await productModel.find({});
        // Cache for 1 hour
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(products));

        res.json({ success: true, products });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// function for removing product
const removeProduct = async (req, res) => {
    try {
        
        await productModel.findByIdAndDelete(req.body.id);
        await redisClient.del('products:all');
        res.json({success:true,message:"Product Removed"});

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// function for single product info
// function for updating a product
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, category, subCategory, sizes, bestseller } = req.body;

        const product = await productModel.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Update fields
        product.name = name || product.name;
        product.description = description || product.description;
        product.price = price ? Number(price) : product.price;
        product.category = category || product.category;
        product.subCategory = subCategory || product.subCategory;
        product.sizes = sizes ? JSON.parse(sizes) : product.sizes;
        product.bestseller = bestseller !== undefined ? bestseller === 'true' : product.bestseller;

        // Handle image updates
        const newImageFiles = [
            req.files?.image1?.[0],
            req.files?.image2?.[0],
            req.files?.image3?.[0],
            req.files?.image4?.[0],
        ];

        const updatedImageUrls = [...product.image]; // Start with existing images

        for (let i = 0; i < newImageFiles.length; i++) {
            if (newImageFiles[i]) {
                // If a new image is uploaded for this slot, upload it and update the URL
                const result = await cloudinary.uploader.upload(newImageFiles[i].path, { resource_type: 'image' });
                updatedImageUrls[i] = result.secure_url;
            }
        }

        product.image = updatedImageUrls.filter(Boolean); // Update the product's image array

        await product.save();
        await redisClient.del('products:all');
        res.json({ success: true, message: 'Product updated successfully' });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// function for getting a single product by ID
const getProduct = async (req, res) => {
    try {
        const product = await productModel.findById(req.params.id);
        if (product) {
            res.json({ success: true, product });
        } else {
            res.status(404).json({ success: false, message: 'Product not found' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// function for single product info
const singleProduct = async (req, res) => {
    try {
        
        const { productId } = req.body
        const product = await productModel.findById(productId)
        res.json({success:true,product})

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// --- Reviews ---
const computeRating = (product) => {
  const count = product.reviews.length
  const sum = product.reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0)
  product.numReviews = count
  product.averageRating = count ? sum / count : 0
}

const addReview = async (req, res) => {
  try {
    const productId = req.params.id
    const userId = req.body.userId
    const { rating, comment } = req.body

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' })
    }

    const product = await productModel.findById(productId)
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' })

    // prevent multiple reviews by same user
    const already = product.reviews.find(r => String(r.user) === String(userId))
    if (already) return res.status(400).json({ success: false, message: 'You have already reviewed this product' })

    product.reviews.push({ user: userId, rating: Number(rating), comment })
    computeRating(product)
    await product.save()

    return res.status(200).json({ success: true, message: 'Review added', averageRating: product.averageRating, numReviews: product.numReviews, reviews: product.reviews })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

const getReviews = async (req, res) => {
  try {
    const productId = req.params.id
    const product = await productModel.findById(productId).select('reviews averageRating numReviews').populate({ path: 'reviews.user', select: 'name email' })
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' })
    return res.status(200).json({ success: true, reviews: product.reviews, averageRating: product.averageRating, numReviews: product.numReviews })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

export { listProducts, addProduct, removeProduct, singleProduct, getProduct, updateProduct, addReview, getReviews }