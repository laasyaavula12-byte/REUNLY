
const express = require("express");
const router = express.Router();
const multer = require("multer");
const crypto = require("crypto");

const { createClient } = require("@supabase/supabase-js");
const authenticateUser = require("../middleware/auth");

// ============================================
// SUPABASE CLIENTS
// ============================================

// Client for authenticated students
function getUserSupabase(token) {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_PUBLISHABLE_KEY,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            },
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        }
    );
}

// Public client for browsing active items
function getPublicSupabase() {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_PUBLISHABLE_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        }
    );
}

// ============================================
// GET: Retrieve, search and filter active items
// ============================================

router.get("/", async (req, res) => {
    try {
        const supabase = getPublicSupabase();

        const {
            search,
            category,
            listing_type,
            location
        } = req.query;

        let query = supabase
            .from("items")
            .select("*")
            .eq("status", "active");

        // Search item name and description
        if (search && search.trim()) {
            const term = search.trim().replace(/[,%()]/g, "");

            query = query.or(
                `item_name.ilike.%${term}%,description.ilike.%${term}%`
            );
        }

        // Filter by category
        if (category && category.trim()) {
            query = query.ilike("category", category.trim());
        }

        // Filter by listing type
        if (listing_type) {
            if (!["lost", "found"].includes(listing_type)) {
                return res.status(400).json({
                    success: false,
                    message: "Listing type must be lost or found."
                });
            }

            query = query.eq("listing_type", listing_type);
        }

        // Filter by location
        if (location && location.trim()) {
            query = query.ilike(
                "location",
                `%${location.trim()}%`
            );
        }

        const { data, error } = await query
            .order("created_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json({
            success: true,
            count: data.length,
            items: data
        });

    } catch (error) {
        console.error("Fetch items error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Could not retrieve items."
        });
    }
});

// ============================================
// POST: Create a lost or found item report
// ============================================

router.post("/", authenticateUser, async (req, res) => {
    try {
        const {
            item_name,
            category,
            description,
            location,
            item_date,
            listing_type,
            image_url
        } = req.body;

        // Validate required fields
        if (
            !item_name ||
            !category ||
            !description ||
            !location ||
            !item_date ||
            !listing_type
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required item details."
            });
        }

        if (
            typeof item_name !== "string" ||
            typeof category !== "string" ||
            typeof description !== "string" ||
            typeof location !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Item details must be valid text."
            });
        }

        if (!["lost", "found"].includes(listing_type)) {
            return res.status(400).json({
                success: false,
                message: "Listing type must be lost or found."
            });
        }

        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(item_date) ||
            Number.isNaN(Date.parse(item_date))
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid date in YYYY-MM-DD format."
            });
        }

        const supabase = getUserSupabase(req.accessToken);

        const { data, error } = await supabase
            .from("items")
            .insert([{
                user_id: req.user.id,
                item_name: item_name.trim(),
                category: category.trim(),
                description: description.trim(),
                location: location.trim(),
                item_date,
                listing_type,
                image_url: image_url || null
            }])
            .select()
            .single();

        if (error) throw error;

        return res.status(201).json({
            success: true,
            message: "Your report has been submitted!",
            item: data
        });

    } catch (error) {
        console.error("Create item error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Could not create the item report."
        });
    }
});

// ============================================
// PATCH: Mark a claimed item as returned
// ============================================

router.patch("/:itemId/return", authenticateUser, async (req, res) => {
    try {
        const { itemId } = req.params;

        const supabase = getUserSupabase(req.accessToken);

        // Only the item owner can mark a claimed item as returned
        const { data, error } = await supabase
            .from("items")
            .update({
                status: "returned"
            })
            .eq("id", itemId)
            .eq("user_id", req.user.id)
            .eq("status", "claimed")
            .select()
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message:
                    "Item not found, not claimed, or you are not authorized."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Item successfully marked as returned!",
            item: data
        });

    } catch (error) {
        console.error("Mark returned error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Could not mark the item as returned."
        });
    }
});

// ============================================
// IMAGE UPLOAD CONFIGURATION
// ============================================

const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, callback) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return callback(
                new Error("Only JPG, PNG and WebP images are allowed.")
            );
        }

        callback(null, true);
    }
});

// ============================================
// POST: Upload item image
// ============================================

router.post(
    "/upload",
    authenticateUser,
    upload.single("image"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Please select an image."
                });
            }

            const extensions = {
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/webp": "webp"
            };

            const extension = extensions[req.file.mimetype];

            const fileName =
                `${req.user.id}/${crypto.randomUUID()}.${extension}`;

            const supabase = getUserSupabase(req.accessToken);

            const { data, error } = await supabase
                .storage
                .from("reunly-items")
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false
                });

            if (error) throw error;

            const { data: publicData } = supabase
                .storage
                .from("reunly-items")
                .getPublicUrl(data.path);

            return res.status(201).json({
                success: true,
                message: "Image uploaded successfully.",
                image_url: publicData.publicUrl
            });

        } catch (error) {
            console.error("Image upload error:", error.message);

            return res.status(500).json({
                success: false,
                message: "Image upload failed."
            });
        }
    }
);

module.exports = router;
