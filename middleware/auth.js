
const { createClient } = require("@supabase/supabase-js");

async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Please log in first."
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify the token with Supabase Auth
    const { data, error } = await createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    ).auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session."
      });
    }

    req.user = data.user;
    req.accessToken = token;

    next();

  } catch (error) {
    console.error("Authentication error:", error.message);

    res.status(500).json({
      success: false,
      message: "Authentication failed."
    });
  }
}

module.exports = authenticateUser;
