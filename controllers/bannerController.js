import { v2 as cloudinary } from "cloudinary";
import bannerModel from "../models/bannerModel.js";

// Add a new banner (Admin)
const addBanner = async (req, res) => {
    try {
        const { title, link, order, active } = req.body;
        const imageFile = req.file;

        if (!imageFile) {
            return res.status(400).json({ success: false, message: "Image is required" });
        }

        const result = await cloudinary.uploader.upload(imageFile.path, { resource_type: 'image' });
        const imageUrl = result.secure_url;

        const newBanner = new bannerModel({
            title,
            link,
            order: Number(order) || 0,
            active: active === 'true',
            imageUrl
        });

        await newBanner.save();

        res.json({ success: true, message: "Banner Added", banner: newBanner });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};

// List all banners (Public, can be filtered by active status)
const listBanners = async (req, res) => {
    try {
        const { activeOnly } = req.query; // e.g., /api/banner/list?activeOnly=true
        const filter = activeOnly === 'true' ? { active: true } : {};
        
        const banners = await bannerModel.find(filter).sort({ order: 1, date: -1 });
        res.json({ success: true, banners });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};

// Update an existing banner (Admin)
const updateBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, link, order, active } = req.body;
        const imageFile = req.file;

        const banner = await bannerModel.findById(id);
        if (!banner) {
            return res.status(404).json({ success: false, message: "Banner not found" });
        }

        if (title !== undefined) banner.title = title;
        if (link !== undefined) banner.link = link;
        if (order !== undefined) banner.order = Number(order);
        if (active !== undefined) banner.active = active === 'true';

        if (imageFile) {
            const result = await cloudinary.uploader.upload(imageFile.path, { resource_type: 'image' });
            banner.imageUrl = result.secure_url;
        }

        await banner.save();

        res.json({ success: true, message: "Banner Updated", banner });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};

// Remove a banner (Admin)
const removeBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await bannerModel.findByIdAndDelete(id);

        if (!banner) {
            return res.status(404).json({ success: false, message: "Banner not found" });
        }

        res.json({ success: true, message: "Banner Removed" });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
};

export { addBanner, listBanners, updateBanner, removeBanner };
