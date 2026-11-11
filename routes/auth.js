
const express = require("express");
const router = express.Router();

const { createClient } = require("@supabase/supabase-js");
const supabaseAuth = require("../config/supabaseAuth");
const authenticateUser = require("../middleware/auth");

// STUDENT REGISTRATION
router.post("/register", async (req, res) => {
  try {
    const {
      full_name,
      email,
      password,
      student_id,
      department,
      academic_year,
      phone_number
    } = req.body;

    if (
      !full_name ||
      !email ||
      !password ||
      !student_id ||
      !department ||
      !academic_year ||
      !phone_number
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all registration fields."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters."
      });
    }

    const { data, error } = await supabaseAuth.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: full_name.trim(),
          student_id: student_id.trim(),
          department: department.trim(),
          academic_year: academic_year.trim(),
          phone_number: phone_number.trim()
        }
      }
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(201).json({
      success: true,
      message: data.session
        ? "Registration successful!"
        : "Please check your email to confirm your account.",
      user: {
        id: data.user.id,
        email: data.user.email
      },
      requiresEmailConfirmation: !data.session
    });

  } catch (error) {
    console.error("Registration error:", error.message);

    res.status(500).json({
      success: false,
      message: "Registration failed."
    });
  }
});

// STUDENT LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const { data, error } =
      await supabaseAuth.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

    if (error) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }

    res.status(200).json({
      success: true,
      message: "Login successful!",
      user: {
        id: data.user.id,
        email: data.user.email
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });

  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      success: false,
      message: "Login failed."
    });
  }
});

// GET LOGGED-IN STUDENT PROFILE
router.get("/me", authenticateUser, async (req, res) => {
  try {
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${req.accessToken}`
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const { data, error } = await userSupabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        student_id,
        department,
        academic_year,
        phone_number,
        role
      `)
      .eq("id", req.user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found."
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully.",
      profile: data
    });

  } catch (error) {
    console.error("Profile error:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not retrieve student profile."
    });
  }
});

// STUDENT LOGOUT
router.post("/logout", authenticateUser, async (req, res) => {
  try {
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${req.accessToken}`
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const { error } = await userSupabase.auth.signOut();

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: "Logged out successfully."
    });

  } catch (error) {
    console.error("Logout error:", error.message);

    res.status(500).json({
      success: false,
      message: "Logout failed."
    });
  }
});

// ============================================
// REQUEST PASSWORD RESET EMAIL
// ============================================

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter your registered email."
      });
    }

    const redirectTo = process.env.PASSWORD_RESET_REDIRECT_URL;

    if (!redirectTo) {
      console.error("PASSWORD_RESET_REDIRECT_URL is missing.");

      return res.status(500).json({
        success: false,
        message: "Password recovery is not configured."
      });
    }

    const { error } =
      await supabaseAuth.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo }
      );

    if (error) {
      console.error("Password reset email error:", error.message);

      return res.status(400).json({
        success: false,
        message: "Unable to send the reset email. Please try again later."
      });
    }

    res.status(200).json({
      success: true,
      message: "If an account exists for that email, a password reset link has been sent."
    });

  } catch (error) {
    console.error("Forgot password error:", error.message);

    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again."
    });
  }
});


// ============================================
// UPDATE PASSWORD AFTER RECOVERY
// ============================================


router.post("/reset-password", authenticateUser, async (req, res) => {
  try {
    const { password, refresh_token } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters."
      });
    }

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: "Recovery session is missing. Please request a new reset link."
      });
    }

    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    // Establish the recovery session
    const { data: sessionData, error: sessionError } =
      await userSupabase.auth.setSession({
        access_token: req.accessToken,
        refresh_token
      });

    if (sessionError) throw sessionError;

    if (!sessionData.session) {
      throw new Error("Could not establish the recovery session.");
    }

    // Update the password
    const { data, error } =
      await userSupabase.auth.updateUser({ password });

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: "Your password has been updated successfully."
    });

  } catch (error) {
    console.error("Password update error:", error);

    res.status(400).json({
      success: false,
      message: error.message || "Could not update your password."
    });
  }
});


module.exports = router;
