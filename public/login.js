
const API_URL = "/api";

const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const loginButton = document.getElementById("login-button");

function showLoginMessage(message, type) {
    loginMessage.textContent = message;
    loginMessage.className = `form-message ${type}`;
}

// Check whether the existing session is still valid
async function checkExistingSession() {
    const token = localStorage.getItem("reunly_access_token");

    if (!token) return;

    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.ok) {
            window.location.replace("dashboard.html");
        }
    } catch (error) {
        console.error("Session check failed:", error);
    }
}

checkExistingSession();

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        showLoginMessage("Please enter your email and password.", "error");
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Invalid email or password.");
        }

        if (!result.session?.access_token) {
            throw new Error("Unable to establish your login session.");
        }

        // Clear any previous session
        localStorage.removeItem("reunly_access_token");
        localStorage.removeItem("reunly_refresh_token");

        // Save the new session
        localStorage.setItem(
            "reunly_access_token",
            result.session.access_token
        );

        localStorage.setItem(
            "reunly_refresh_token",
            result.session.refresh_token
        );

        showLoginMessage("Welcome back! Redirecting...", "success");

        window.location.replace("dashboard.html");

    } catch (error) {
        console.error("Login error:", error);
        showLoginMessage(error.message, "error");

    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Log In →";
    }
});
