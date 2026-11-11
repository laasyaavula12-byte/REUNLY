
const express = require("express");
const router = express.Router();

const { createClient } = require("@supabase/supabase-js");
const authenticateUser = require("../middleware/auth");

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

// GET: Student dashboard
router.get("/", authenticateUser, async (req, res) => {
    try {
        const supabase = getUserSupabase(req.accessToken);

        // 1. Get student's own reports
        const { data: items, error: itemsError } = await supabase
            .from("items")
            .select("*")
            .eq("user_id", req.user.id)
            .order("created_at", { ascending: false });

        if (itemsError) throw itemsError;

        // 2. Get claims received on student's reports
        let receivedClaims = [];

        if (items.length > 0) {
            const itemIds = items.map(item => item.id);

            const { data, error } = await supabase
                .from("claims")
                .select("id, item_id, claimant_id, message, status, created_at")
                .in("item_id", itemIds);

            if (error) throw error;

            receivedClaims = data || [];
        }

        // 3. Get claims submitted by student
        const { data: submittedClaims, error: submittedError } =
            await supabase
                .from("claims")
                .select("id, item_id, claimant_id, message, status, created_at")
                .eq("claimant_id", req.user.id)
                .order("created_at", { ascending: false });

        if (submittedError) throw submittedError;

        // 4. Get student profile
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, email, student_id, role")
            .eq("id", req.user.id)
            .maybeSingle();

        if (profileError) throw profileError;

        // 5. Return complete dashboard data
        res.status(200).json({
            success: true,
            dashboard: {
                totalReports: items.length,
                activeReports: items.filter(item => item.status === "active").length,
                returnedItems: items.filter(item => item.status === "returned").length,
                claimsReceived: receivedClaims.length,
                claimsSubmitted: submittedClaims.length,
                pendingClaims: receivedClaims.filter(claim => claim.status === "pending").length
            },
            profile: profile || {},
            items: items || [],
            claimsReceived: receivedClaims,
            claimsSubmitted: submittedClaims || []
        });

    } catch (error) {
        console.error("Dashboard error:", error.message);

        res.status(500).json({
            success: false,
            message: "Could not load dashboard."
        });
    }
});

module.exports = router;
