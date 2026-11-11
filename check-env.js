require("dotenv").config();

console.log("SUPABASE_URL:", !!process.env.SUPABASE_URL);
console.log("SUPABASE_SECRET_KEY:", !!process.env.SUPABASE_SECRET_KEY);
console.log("JWT_SECRET:", !!process.env.JWT_SECRET);