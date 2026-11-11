
const API_URL = "/api";

const form = document.getElementById("reset-password-form");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirm-password");
const message = document.getElementById("reset-message");
const button = document.getElementById("reset-button");

// Read the recovery token from the URL hash
const hashParams = new URLSearchParams(
    window.location.hash.substring(1)
);

const accessToken = hashParams.get("access_token");
const refreshToken = hashParams.get("refresh_token");
const recoveryType = hashParams.get("type");
function showMessage(text, type) {
    message.textContent = text;
    message.className = `form-message ${type}`;
}

// Check that this is a valid recovery link
if (!accessToken || !refreshToken || recoveryType !== "recovery") {
    showMessage(
        "This password reset link is invalid or expired. Please request a new one.",
        "error"
    );

    form.querySelectorAll("input, button").forEach(element => {
        element.disabled = true;
    });
}
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!accessToken || recoveryType !== "recovery") {
        return;
    }

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password.length < 8) {
        showMessage(
            "Password must contain at least 8 characters.",
            "error"
        );
        return;
    }

    if (password !== confirmPassword) {
        showMessage(
            "Passwords do not match.",
            "error"
        );
        return;
    }

    button.disabled = true;
    button.textContent = "Updating...";
try{
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
    },
    body: JSON.stringify({
        password,
        refresh_token: refreshToken
    })
});
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Unable to update password."
            );
        }

        // Remove any old login session
        localStorage.removeItem("reunly_access_token");
        localStorage.removeItem("reunly_refresh_token");

        showMessage(
            "Your password has been updated! Redirecting to login...",
            "success"
        );

        form.reset();

        // Remove the recovery token from the browser URL
        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );

        setTimeout(() => {
            window.location.replace("login.html");
        }, 2000);

    } catch (error) {
        console.error("Password reset error:", error);

        showMessage(error.message, "error");

        button.disabled = false;
        button.textContent = "Update Password →";
    }
});
