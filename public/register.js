
const API_URL = "/api";

const registerForm = document.getElementById("register-form");
const registerMessage = document.getElementById("register-message");
const registerButton = document.getElementById("register-button");

function showRegisterMessage(message, type) {
    registerMessage.textContent = message;
    registerMessage.className = `form-message ${type}`;
}

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullName = document.getElementById("full-name").value.trim();
    const studentId = document.getElementById("student-id").value.trim();
    const department = document.getElementById("department").value.trim();
    const academicYear = document.getElementById("academic-year").value;
    const phoneNumber = document.getElementById("phone-number").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (
        !fullName ||
        !studentId ||
        !department ||
        !academicYear ||
        !phoneNumber ||
        !email
    ) {
        showRegisterMessage("Please complete all required fields.", "error");
        return;
    }

    if (password !== confirmPassword) {
        showRegisterMessage("Passwords do not match.", "error");
        return;
    }

    if (password.length < 8) {
        showRegisterMessage(
            "Password must contain at least 8 characters.",
            "error"
        );
        return;
    }

    registerButton.disabled = true;
    registerButton.textContent = "Creating account...";

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                full_name: fullName,
                student_id: studentId,
                department,
                academic_year: academicYear,
                phone_number: phoneNumber,
                email,
                password
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Registration failed.");
        }

        showRegisterMessage(
            result.message || "Account created! Please check your email.",
            "success"
        );

        registerForm.reset();

    } catch (error) {
        console.error("Registration error:", error);
        showRegisterMessage(
            error.message || "Something went wrong. Please try again.",
            "error"
        );

    } finally {
        registerButton.disabled = false;
        registerButton.textContent = "Create Account →";
    }
});
