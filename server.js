
// REUNLY - Smart Campus Lost and Found Portal

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const supabase = require("./config/supabase");

// Import routes
const itemRoutes = require("./routes/items");
const authRoutes = require("./routes/auth");
const claimRoutes = require("./routes/claims");
const dashboardRoutes = require("./routes/dashboard");
const foundResponseRoutes = require("./routes/foundResponses");
const notificationRoutes = require("./routes/notifications");

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ============================================
// API ROUTES
// ============================================

app.use("/api/items", itemRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/claims", claimRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/found-responses", foundResponseRoutes);
app.use("/api/notifications", notificationRoutes);

// ============================================
// SERVER HEALTH CHECK
// ============================================

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "REUNLY server is running"
    });
});

// ============================================
// DATABASE HEALTH CHECK
// ============================================

app.get("/api/health/database", async (req, res) => {
    try {
        const { error } = await supabase
            .from("items")
            .select("id", { count: "exact", head: true });

        if (error) throw error;

        res.status(200).json({
            success: true,
            message: "REUNLY database connected successfully"
        });

    } catch (error) {
        console.error("Database health check failed:", error.message);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});

// ============================================
// HOME PAGE
// ============================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`REUNLY server running at http://localhost:${PORT}`);
});
