
const express = require("express");
const router = express.Router();

const { createClient } = require("@supabase/supabase-js");
const authenticateUser = require("../middleware/auth");

// Create a Supabase client using the logged-in user's token
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
// POST: Submit a claim for an item
// ============================================

router.post("/", authenticateUser, async (req, res) => {
  try {
    const { item_id, message } = req.body;

    if (
      !item_id ||
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Item ID and claim message are required."
      });
    }

    const supabase = getUserSupabase(req.accessToken);

    // Check whether the item exists and is active
    const { data: item, error: itemError } = await supabase
      .from("items")
      .select("id, user_id, status")
      .eq("id", item_id)
      .eq("status", "active")
      .maybeSingle();

    if (itemError) throw itemError;

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found or no longer active."
      });
    }

    // Prevent users from claiming their own items
    if (item.user_id === req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You cannot claim your own item."
      });
    }

    // Insert the claim as pending
    const { data, error } = await supabase
      .from("claims")
      .insert({
        item_id,
        claimant_id: req.user.id,
        message: message.trim(),
        status: "pending"
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: "Your claim has been submitted!",
      claim: data
    });

  } catch (error) {
    console.error("Submit claim error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not submit your claim."
    });
  }
});

// ============================================
// GET: View claims received by the item owner
// ============================================

router.get("/received", authenticateUser, async (req, res) => {
  try {
    const supabase = getUserSupabase(req.accessToken);

    const { data, error } = await supabase
      .from("claims")
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

    return res.status(200).json({
      success: true,
      count: data.length,
      claims: data
    });

  } catch (error) {
    console.error("Fetch received claims error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve claims."
    });
  }
});

// ============================================
// PATCH: Approve or reject a claim
// ============================================

router.patch("/:claimId", authenticateUser, async (req, res) => {
  try {
    const { status } = req.body;
    const { claimId } = req.params;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected."
      });
    }

    const supabase = getUserSupabase(req.accessToken);

    // APPROVE: Call the atomic PostgreSQL function
    if (status === "approved") {
      const { data, error } = await supabase.rpc(
        "approve_item_claim",
        {
          p_claim_id: claimId
        }
      );

      if (error) {
        console.error("Approve claim error:", error.message);

        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: "Claim approved! Item marked as claimed.",
        result: data
      });
    }

    // REJECT: Update only a pending claim
    // RLS ensures only the item owner or authorized admin can do this.
    const { data, error } = await supabase
      .from("claims")
      .update({ status: "rejected" })
      .eq("id", claimId)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message:
          "Claim not found, already reviewed, or you are not authorized."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Claim rejected. The item remains available.",
      claim: data
    });

  } catch (error) {
    console.error("Update claim error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not update the claim."
    });
  }
});


// ============================================
// GET APPROVED CLAIM: ITEM OWNER CONTACT DETAILS
// ============================================

router.get("/:claimId/contact", authenticateUser, async (req, res) => {
    try {
        const adminSupabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SECRET_KEY,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            }
        );

        const { claimId } = req.params;

        // 1. Find the claim
        const { data: claim, error: claimError } = await adminSupabase
            .from("claims")
            .select("id, item_id, claimant_id, status")
            .eq("id", claimId)
            .maybeSingle();

        if (claimError) throw claimError;

        if (!claim) {
            return res.status(404).json({
                success: false,
                message: "Claim not found."
            });
        }

        // 2. Only the claimant can view these details
        if (claim.claimant_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view these details."
            });
        }

        // 3. Contact details are available only after approval
        if (claim.status !== "approved") {
            return res.status(403).json({
                success: false,
                message: "Contact details are available only after your claim is approved."
            });
        }

        // 4. Find the owner of the reported item
        const { data: item, error: itemError } = await adminSupabase
            .from("items")
            .select("user_id")
            .eq("id", claim.item_id)
            .maybeSingle();

        if (itemError) throw itemError;

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Item not found."
            });
        }

        // 5. Retrieve only the owner's contact fields
        const { data: profile, error: profileError } = await adminSupabase
            .from("profiles")
            .select("full_name, email, phone_number")
            .eq("id", item.user_id)
            .maybeSingle();

        if (profileError) throw profileError;

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Owner contact details are unavailable."
            });
        }

        return res.status(200).json({
            success: true,
            contact: profile
        });

    } catch (error) {
        console.error("Claim contact error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Could not retrieve owner contact details."
        });
    }
});


module.exports = router;
