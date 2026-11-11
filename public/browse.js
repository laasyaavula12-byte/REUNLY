
const API_URL = "/api";

const container = document.getElementById("browse-items-container");
const emptyState = document.getElementById("browse-empty-state");
const resultsCount = document.getElementById("results-count");

const searchInput = document.getElementById("browse-search");
const searchButton = document.getElementById("search-button");
const categoryFilter = document.getElementById("category-filter");
const typeFilter = document.getElementById("type-filter");
const locationFilter = document.getElementById("location-filter");

const PLACEHOLDER_IMAGE =
    "https://placehold.co/600x400/F6F1E7/075C46?text=REUNLY";

// ============================================
// LOAD ITEMS
// ============================================

async function loadItems() {
    const params = new URLSearchParams();

    const search = searchInput.value.trim();
    const category = categoryFilter.value;
    const listingType = typeFilter.value;
    const location = locationFilter.value.trim();

    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (listingType) params.set("listing_type", listingType);
    if (location) params.set("location", location);

    container.innerHTML =
        '<p class="loading-message">Loading listings...</p>';

    container.style.display = "block";
    emptyState.hidden = true;

    try {
        const response = await fetch(
            `${API_URL}/items?${params.toString()}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Could not load listings.");
        }

        container.innerHTML = "";

        const items = result.items || [];

        resultsCount.textContent =
            `${items.length} ${items.length === 1 ? "item" : "items"} found`;

        if (items.length === 0) {
            container.style.display = "none";
            emptyState.hidden = false;
            return;
        }

        container.style.display = "grid";
        emptyState.hidden = true;

        items.forEach(item => createItemCard(item));

    } catch (error) {
        console.error("Browse error:", error);

        container.style.display = "block";
        container.innerHTML = "";

        const message = document.createElement("p");
        message.className = "loading-message";
        message.textContent =
            "Unable to load listings. Please check that the server is running.";

        container.appendChild(message);
        resultsCount.textContent = "Unable to load";
    }
}

// ============================================
// CREATE ITEM CARD
// ============================================

function createItemCard(item) {
    const card = document.createElement("article");
    card.className = "item-card";

    const image = document.createElement("img");
    image.className = "item-card-image";
    image.alt = item.item_name || "Reported item";
    image.src = item.image_url || PLACEHOLDER_IMAGE;

    image.onerror = () => {
        image.onerror = null;
        image.src = PLACEHOLDER_IMAGE;
    };

    const details = document.createElement("div");
    details.className = "item-card-details";

    const badge = document.createElement("span");
    badge.className =
        `item-badge ${item.listing_type === "lost" ? "lost" : "found"}`;

    badge.textContent =
        item.listing_type === "lost" ? "LOST ITEM" : "FOUND ITEM";

    const title = document.createElement("h3");
    title.textContent = item.item_name || "Untitled item";

    const category = document.createElement("p");
    category.textContent = `Category: ${item.category || "Other"}`;

    const location = document.createElement("p");
    location.textContent =
        `📍 ${item.location || "Location not specified"}`;

    const date = document.createElement("p");
    date.textContent = `Date: ${item.item_date || "Not specified"}`;

    const description = document.createElement("p");
    description.textContent =
        item.description || "No description provided.";

    details.append(
        badge,
        title,
        category,
        location,
        date,
        description
    );

    // LOST ITEM: Someone found the missing item
    if (item.listing_type === "lost") {
        createFoundResponseForm(item, details);
    }

    // FOUND ITEM: Someone wants to claim the item
    else {
        createClaimForm(item, details);
    }

    card.append(image, details);
    container.appendChild(card);
}

// ============================================
// EXISTING CLAIM FORM - FOUND ITEMS
// ============================================

function createClaimForm(item, details) {
    const claimButton = document.createElement("button");
    claimButton.type = "button";
    claimButton.className = "claim-item-button";
    claimButton.textContent = "Claim This Item";

    const claimForm = document.createElement("form");
    claimForm.className = "claim-form";
    claimForm.hidden = true;

    const messageLabel = document.createElement("label");
    messageLabel.textContent = "Why are you claiming this item?";

    const messageInput = document.createElement("textarea");
    messageInput.name = "message";
    messageInput.placeholder =
        "Describe the item or provide details to verify your claim...";
    messageInput.required = true;
    messageInput.rows = 4;
    messageInput.maxLength = 1000;

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = "Submit Claim";
    submitButton.className = "submit-claim-button";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Cancel";
    cancelButton.className = "cancel-claim-button";

    const message = document.createElement("p");
    message.className = "claim-message";
    message.setAttribute("aria-live", "polite");

    claimForm.append(
        messageLabel,
        messageInput,
        submitButton,
        cancelButton,
        message
    );

    claimButton.addEventListener("click", () => {
        if (!requireLogin()) return;

        claimForm.hidden = false;
        claimButton.hidden = true;
    });

    cancelButton.addEventListener("click", () => {
        claimForm.hidden = true;
        claimButton.hidden = false;
        messageInput.value = "";
        message.textContent = "";
        message.className = "claim-message";
    });

    claimForm.addEventListener("submit", async event => {
        event.preventDefault();

        const token = localStorage.getItem("reunly_access_token");
        const claimMessage = messageInput.value.trim();

        if (!token) {
            requireLogin();
            return;
        }

        if (!claimMessage) {
            message.textContent = "Please enter a claim message.";
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
        message.textContent = "";

        try {
            const response = await fetch(`${API_URL}/claims`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    item_id: item.id,
                    message: claimMessage
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Could not submit your claim."
                );
            }

            message.textContent =
                "Your claim has been submitted successfully!";

            message.classList.add("success");

            submitButton.textContent = "Claim Submitted";
            messageInput.disabled = true;
            cancelButton.hidden = true;

        } catch (error) {
            message.textContent = error.message;
            message.classList.add("error");

            submitButton.disabled = false;
            submitButton.textContent = "Submit Claim";
        }
    });

    details.append(claimButton, claimForm);
}

// ============================================
// NEW FOUND RESPONSE FORM - LOST ITEMS
// ============================================

function createFoundResponseForm(item, details) {
    const foundButton = document.createElement("button");
    foundButton.type = "button";
    foundButton.className = "claim-item-button";
    foundButton.textContent = "I Found This Item";

    const form = document.createElement("form");
    form.className = "claim-form found-response-form";
    form.hidden = true;

    const messageLabel = document.createElement("label");
    messageLabel.textContent = "Describe the item you found";

    const messageInput = document.createElement("textarea");
    messageInput.name = "message";
    messageInput.placeholder =
        "Describe where you found it and any details that help verify it...";
    messageInput.required = true;
    messageInput.rows = 4;
    messageInput.maxLength = 1000;

    const locationLabel = document.createElement("label");
    locationLabel.textContent = "Where did you find it?";

    const locationInput = document.createElement("input");
    locationInput.type = "text";
    locationInput.name = "found_location";
    locationInput.placeholder = "Example: Library, Block A";
    locationInput.required = true;
    locationInput.maxLength = 200;

    const dateLabel = document.createElement("label");
    dateLabel.textContent = "When did you find it?";

    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.name = "found_date";
    dateInput.required = true;
    dateInput.max = new Date().toISOString().split("T")[0];

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = "submit-claim-button";
    submitButton.textContent = "Send Found Response";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "cancel-claim-button";
    cancelButton.textContent = "Cancel";

    const responseMessage = document.createElement("p");
    responseMessage.className = "claim-message";
    responseMessage.setAttribute("aria-live", "polite");

    form.append(
        messageLabel,
        messageInput,
        locationLabel,
        locationInput,
        dateLabel,
        dateInput,
        submitButton,
        cancelButton,
        responseMessage
    );

    foundButton.addEventListener("click", () => {
        if (!requireLogin()) return;

        form.hidden = false;
        foundButton.hidden = true;
    });

    cancelButton.addEventListener("click", () => {
        form.hidden = true;
        foundButton.hidden = false;
        form.reset();
        responseMessage.textContent = "";
        responseMessage.className = "claim-message";
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const token = localStorage.getItem("reunly_access_token");

        if (!token) {
            requireLogin();
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
        responseMessage.textContent = "";

        try {
            const response = await fetch(
                `${API_URL}/found-responses`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        item_id: item.id,
                        message: messageInput.value.trim(),
                        found_location: locationInput.value.trim(),
                        found_date: dateInput.value
                    })
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Could not send your response."
                );
            }

            responseMessage.textContent =
                "Your response has been sent! The person who reported this item will be notified.";

            responseMessage.classList.add("success");

            submitButton.textContent = "Response Sent";
            messageInput.disabled = true;
            locationInput.disabled = true;
            dateInput.disabled = true;
            cancelButton.hidden = true;

        } catch (error) {
            console.error("Found response error:", error);

            responseMessage.textContent = error.message;
            responseMessage.classList.add("error");

            submitButton.disabled = false;
            submitButton.textContent = "Send Found Response";
        }
    });

    details.append(foundButton, form);
}

// ============================================
// LOGIN CHECK
// ============================================

function requireLogin() {
    const token = localStorage.getItem("reunly_access_token");

    if (!token) {
        alert("Please log in to continue.");
        window.location.href = "login.html";
        return false;
    }

    return true;
}

// ============================================
// SEARCH AND FILTERS
// ============================================

searchButton.addEventListener("click", loadItems);

searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        loadItems();
    }
});

categoryFilter.addEventListener("change", loadItems);
typeFilter.addEventListener("change", loadItems);

locationFilter.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        loadItems();
    }
});

// INITIAL LOAD
loadItems();
