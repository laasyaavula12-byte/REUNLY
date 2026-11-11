
const API_URL = "/api";

const reportForm = document.getElementById("report-form");
const reportMessage = document.getElementById("report-message");
const submitButton = document.getElementById("report-submit");

const imageInput = document.getElementById("item-image");
const imagePreview = document.getElementById("image-preview");
const imagePreviewContainer = document.getElementById("image-preview-container");

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

console.log("REUNLY report.js loaded successfully");

if (!reportForm || !reportMessage || !submitButton || !imageInput) {
    console.error("Report page elements are missing. Check the HTML IDs.");
} else {

    function showMessage(message, type) {
        reportMessage.textContent = message;
        reportMessage.className = `form-message ${type}`;
    }

    // Preselect Lost or Found
    const params = new URLSearchParams(window.location.search);
    const requestedType = params.get("type");

    if (requestedType === "lost" || requestedType === "found") {
        const radio = document.querySelector(
            `input[name="listing_type"][value="${requestedType}"]`
        );
        if (radio) radio.checked = true;
    }

    // Image preview
    imageInput.addEventListener("change", () => {
        const file = imageInput.files[0];

        imagePreviewContainer.hidden = true;

        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            imageInput.value = "";
            showMessage("Only JPG, PNG and WebP images are allowed.", "error");
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            imageInput.value = "";
            showMessage("Image must be smaller than 5 MB.", "error");
            return;
        }

        imagePreview.src = URL.createObjectURL(file);
        imagePreviewContainer.hidden = false;
    });

    // Upload image
    async function uploadImage(file, token) {
        const imageData = new FormData();
        imageData.append("image", file);

        const response = await fetch(`${API_URL}/items/upload`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: imageData
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Image upload failed.");
        }

        return result.image_url;
    }

    // Submit report
    reportForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        console.log("REPORT SUBMIT HANDLER STARTED");

        const accessToken = localStorage.getItem("reunly_access_token");

        if (!accessToken) {
            showMessage("Please log in before submitting a report.", "error");
            return;
        }

        const formData = new FormData(reportForm);

        const report = {
            listing_type: formData.get("listing_type"),
            item_name: formData.get("item_name")?.trim(),
            category: formData.get("category"),
            description: formData.get("description")?.trim(),
            location: formData.get("location")?.trim(),
            item_date: formData.get("item_date"),
            image_url: null
        };

        if (
            !report.listing_type ||
            !report.item_name ||
            !report.category ||
            !report.description ||
            !report.location ||
            !report.item_date
        ) {
            showMessage("Please complete all required fields.", "error");
            return;
        }

        const imageFile = imageInput.files[0];

        submitButton.disabled = true;

        try {
            if (imageFile) {
                if (!ALLOWED_TYPES.includes(imageFile.type)) {
                    throw new Error("Please select a valid JPG, PNG or WebP image.");
                }

                if (imageFile.size > MAX_IMAGE_SIZE) {
                    throw new Error("Image must be smaller than 5 MB.");
                }

                submitButton.textContent = "Uploading image...";
                report.image_url = await uploadImage(imageFile, accessToken);
            }

            submitButton.textContent = "Submitting report...";

            const response = await fetch(`${API_URL}/items`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify(report)
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Report submission failed.");
            }

            showMessage("Your report was submitted successfully!", "success");

            reportForm.reset();
            imagePreviewContainer.hidden = true;
            imagePreview.removeAttribute("src");

        } catch (error) {
            console.error("Report submission error:", error);
            showMessage(error.message || "Something went wrong.", "error");

        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Submit Report →";
        }
    });
}
