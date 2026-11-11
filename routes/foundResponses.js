
const express = require("express");
const router = express.Router();

const { createClient } = require("@supabase/supabase-js");
const authenticateUser = require("../middleware/auth");

// ============================================
// SUPABASE CLIENT
// ============================================

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

// ============================================
// POST: Finder responds to a lost-item listing
// ============================================

router.post("/", authenticateUser, async (req, res) => {
    try {
        const {
            item_id,
            message,
            found_location,
            found_date
        } = req.body;

        if (
            !item_id ||
            typeof message !== "string" ||
            !message.trim() ||
            typeof found_location !== "string" ||
            !found_location.trim() ||
            !found_date
        ) {
            return res.status(400).json({
                success: false,
                message: "Item, message, found location and found date are required."
            });
        }

        const supabase = getUserSupabase(req.accessToken);

        const { data: item, error: itemError } = await supabase
            .from("items")
            .select("id, user_id, listing_type, status")
            .eq("id", item_id)
            .eq("listing_type", "lost")
            .eq("status", "active")
            .maybeSingle();

        if (itemError) throw itemError;

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Lost-item listing not found or no longer active."
            });
        }

        if (item.user_id === req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You cannot respond to your own listing."
            });
        }

        const { data, error } = await supabase
            .from("found_responses")
            .insert({
                item_id,
                finder_id: req.user.id,
                message: message.trim(),
                found_location: found_location.trim(),
                found_date,
                status: "pending"
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return res.status(409).json({
                    success: false,
                    message: "You have already responded to this listing."
                });
            }

            throw error;
        }

        // Notify the original reporter
        const { error: notificationError } = await supabase
            .from("notifications")
            .insert({
                user_id: item.user_id,
                title: "Someone found your lost item!",
                message: "A student has responded to your lost-item report."
            });

        if (notificationError) {
            console.error(
                "Notification error:",
                notificationError.message
            );
        }

        return res.status(201).json({
            success: true,
            message: "Your found-item response has been submitted!",
            response: data
        });

    } catch (error) {
        console.error("Submit found response error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Could not submit your response."
        });
    }
});

// ============================================
// GET: Responses received by the lost-item owner
// ============================================

router.get("/received", authenticateUser, async (req, res) => {
    try {
        const supabase = getUserSupabase(req.accessToken);

        const { data: responses, error } = await supabase
            .from("found_responses")
            .select(`
                *,
                items!inner (
                    id,
                    item_name,
                    listing_type,
                    user_id,
                    status
                )
            `)
            .eq("items.user_id", req.user.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Only accepted responses can include finder profile details.
        const acceptedFinderIds = [
            ...new Set(
                responses
                    .filter(response => response.status === "accepted")
                    .map(response => response.finder_id)
            )
        ];

        let profilesById = {};

        if (acceptedFinderIds.length > 0) {
            const { data: profiles, error: profileError } = await supabase
                .from("profiles")
                .select(`
                    id,
                    full_name,
                    email,
                    student_id,
                    department,
                    academic_year,
                    phone_number
                `)
                .in("id", acceptedFinderIds);

            if (profileError) throw profileError;

            profilesById = Object.fromEntries(
                profiles.map(profile => [profile.id, profile])
            );
        }

        // Attach profile only to accepted responses.
        const enrichedResponses = responses.map(response => ({
            ...response,
            finder_profile:
                response.status === "accepted"
                    ? profilesById[response.finder_id] || null
                    : null
        }));

        return res.status(200).json({
            success: true,
            count: enrichedResponses.length,
            responses: enrichedResponses
        });

    } catch (error) {
        console.error("Fetch found responses error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Could not retrieve found-item responses."
        });
    }
});

// ============================================
// PATCH: Accept or reject a found response
// ============================================

router.patch("/:responseId", authenticateUser, async (req, res) => {
    try {
        const { status } = req.body;
        const { responseId } = req.params;

        if (!["accepted", "rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be accepted or rejected."
            });
        }

        const supabase = getUserSupabase(req.accessToken);

        const { data, error } = await supabase.rpc(
            "review_found_response",
            {
                p_response_id: responseId,
                p_status: status
            }
        );

        if (error) {
            console.error("Review response database error:", error.message);

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(200).json({
            success: true,
            message: status === "accepted"
                ? "Response accepted! The item is now marked as claimed. Arrange a safe handover."
                : "Response rejected.",
            response: data
        });

    } catch (error) {
        console.error("Review found response error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Could not review the response."
        });
    }
});

module.exports = router;
