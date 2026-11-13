
const express = require("express");
const router = express.Router();

const { createClient } = require("@supabase/supabase-js");
const authenticateUser = require("../middleware/auth");

// Server-side Supabase client
function getAdminSupabase() {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        }
    );
}

// GET: Fetch logged-in student's notifications
router.get("/", authenticateUser, async (req, res) => {
    try {
        const supabase = getAdminSupabase();

        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", req.user.id)
            .order("created_at", { ascending: false })
            .limit(50);

        if (error) throw error;

        res.json({
            success: true,
            notifications: data
        });

    } catch (error) {
        console.error("Notifications error:", error.message);

        res.status(500).json({
            success: false,
            message: "Could not load notifications."
        });
    }
});

// GET: Count unread notifications
router.get("/unread-count", authenticateUser, async (req, res) => {
    try {
        const supabase = getAdminSupabase();

        const { count, error } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", req.user.id)
            .eq("is_read", false);

        if (error) throw error;

        res.json({
            success: true,
            unreadCount: count || 0
        });

    } catch (error) {
        console.error("Unread count error:", error.message);

        res.status(500).json({
            success: false,
            message: "Could not load unread count."
        });
    }
});

// PATCH: Mark one notification as read
router.patch("/:id/read", authenticateUser, async (req, res) => {
    try {
        const supabase = getAdminSupabase();

        const { data, error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", req.params.id)
            .eq("user_id", req.user.id)
            .select()
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Notification not found."
            });
        }

        res.json({
            success: true,
            notification: data
        });

    } catch (error) {
        console.error("Mark notification read error:", error.message);

        res.status(500).json({
            success: false,
            message: "Could not update notification."
        });
    }
});

// PATCH: Mark all notifications as read
router.patch("/read-all", authenticateUser, async (req, res) => {
    try {
        const supabase = getAdminSupabase();

        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", req.user.id)
            .eq("is_read", false);

        if (error) throw error;

        res.json({
            success: true,
            message: "All notifications marked as read."
        });

    } catch (error) {
        console.error("Mark all read error:", error.message);

        res.status(500).json({
            success: false,
            message: "Could not update notifications."
        });
    }
});

module.exports = router;
