require("dotenv").config();

const supabase = require("./config/supabase");

async function testConnection() {
    const { data, error } = await supabase
        .from("items")
        .select("*");

    if (error) {
        console.error("Database error:", error.message);
        return;
    }

    console.log("REUNLY database connected successfully!");
    console.log("Items currently stored:", data.length);
}

testConnection();