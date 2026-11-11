
const API_URL = "/api";

const form = document.getElementById("forgot-password-form");
const emailInput = document.getElementById("email");
const message = document.getElementById("forgot-message");
const button = document.getElementById("forgot-button");

function showMessage(text, type) {
    message.textContent = text;
    message.className = `form-message ${type}`;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();

    if (!email) {
        showMessage("Please enter your university email.", "error");
        return;
    }

    button.disabled = true;
    button.textContent = "Sending...";

    try {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to send reset email.");
        }

        showMessage(
            "If an account exists for that email, a password reset link has been sent. Please check your inbox and spam folder.",
            "success"
        );

        form.reset();

    } catch (error) {
        console.error("Forgot password error:", error);
        showMessage(error.message, "error");

    } finally {
        button.disabled = false;
        button.textContent = "Send Reset Link →";
    }
});
