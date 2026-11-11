
const API_URL = "/api";

document.addEventListener("DOMContentLoaded", () => {
    loadRecentItems();
});

async function loadRecentItems() {
    const container = document.getElementById("items-container");
    const emptyState = document.getElementById("empty-state");

    if (!container || !emptyState) return;

    try {
        const response = await fetch(`${API_URL}/items`);
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to load items.");
        }

        container.innerHTML = "";

        const items = (result.items || []).slice(0, 3);

        if (items.length === 0) {
            container.style.display = "none";
            emptyState.hidden = false;
            return;
        }

        container.style.display = "grid";
        emptyState.hidden = true;

        items.forEach(item => {
            const card = document.createElement("article");
            card.className = "item-card";

            const image = document.createElement("img");
            image.className = "item-card-image";
            image.alt = item.item_name || "Reported item";
            image.src = item.image_url || "https://placehold.co/600x400/F6F1E7/075C46?text=REUNLY";
            image.onerror = () => {
                image.src = "https://placehold.co/600x400/F6F1E7/075C46?text=REUNLY";
            };

            const details = document.createElement("div");
            details.className = "item-card-details";

            const badge = document.createElement("span");
            badge.className = `item-badge ${item.listing_type === "lost" ? "lost" : "found"}`;
            badge.textContent = item.listing_type === "lost" ? "LOST ITEM" : "FOUND ITEM";

            const title = document.createElement("h3");
            title.textContent = item.item_name || "Untitled item";

            const category = document.createElement("p");
            category.textContent = item.category || "Uncategorized";

            const location = document.createElement("p");
            location.textContent = `📍 ${item.location || "Location not specified"}`;

            const link = document.createElement("a");
            link.href = "browse.html";
            link.className = "item-card-link";
            link.textContent = "View items →";

            details.append(badge, title, category, location, link);
            card.append(image, details);
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading recent items:", error);

        container.innerHTML = "";
        const message = document.createElement("p");
        message.className = "loading-message";
        message.textContent = "Unable to load items right now. Please try again later.";
        container.appendChild(message);
    }
}
