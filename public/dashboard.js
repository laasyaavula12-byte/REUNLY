


const API_URL = "/api";

const accessToken = localStorage.getItem("reunly_access_token");

const studentName = document.getElementById("student-name");
const myReportsCount = document.getElementById("my-reports-count");
const claimsReceivedCount = document.getElementById("claims-received-count");
const claimsSubmittedCount = document.getElementById("claims-submitted-count");

const myItemsContainer = document.getElementById("my-items-container");
const receivedContainer = document.getElementById("claims-received-container");
const submittedContainer = document.getElementById("claims-submitted-container");
const foundResponsesContainer = document.getElementById("found-responses-container");

const logoutButton = document.getElementById("logout-button");

if (!accessToken) {
    window.location.replace("login.html");
}

// ============================================
// EMPTY MESSAGE
// ============================================

function showEmptyMessage(container, message) {
    container.innerHTML = "";

    const paragraph = document.createElement("p");
    paragraph.className = "loading-message";
    paragraph.textContent = message;

    container.appendChild(paragraph);
}

// ============================================
// STATUS BADGE
// ============================================

function createStatusBadge(status) {
    const badge = document.createElement("span");
    badge.className = "dashboard-status";
    badge.textContent = status || "Pending";

    return badge;
}

// ============================================
// DASHBOARD CARD
// ============================================

function createDashboardCard(titleText, details, status) {
    const card = document.createElement("article");
    card.className = "dashboard-list-card";

    const title = document.createElement("h3");
    title.textContent = titleText || "Unnamed item";

    card.appendChild(title);

    details.forEach(detailText => {
        const paragraph = document.createElement("p");
        paragraph.textContent = detailText;
        card.appendChild(paragraph);
    });

    card.appendChild(createStatusBadge(status));

    return card;
}

// ============================================
// MARK ITEM AS RETURNED
// ============================================

async function markItemAsReturned(itemId, button) {
    const confirmed = confirm(
        "Has the item been physically handed over? Mark it as returned?"
    );

    if (!confirmed) return;

    button.disabled = true;
    button.textContent = "Updating...";

    try {
        const response = await fetch(
            `${API_URL}/items/${encodeURIComponent(itemId)}/return`,
            {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${accessToken}`
                }
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Could not mark item as returned."
            );
        }

        alert("Item successfully marked as returned!");

        await loadDashboard();

    } catch (error) {
        console.error("Mark returned error:", error);
        alert(error.message);

        button.disabled = false;
        button.textContent = "Mark as Returned";
    }
}

// ============================================
// DISPLAY MY REPORTS
// ============================================

function renderMyItems(items) {
    myItemsContainer.innerHTML = "";

    if (!items || items.length === 0) {
        showEmptyMessage(
            myItemsContainer,
            "You haven't reported any items yet."
        );
        return;
    }

    items.forEach(item => {
        const card = createDashboardCard(
            item.item_name,
            [
                `Category: ${item.category || "Other"}`,
                `Location: ${item.location || "Not specified"}`,
                `Report type: ${item.listing_type || "Not specified"}`,
                `Date: ${item.item_date || "Not specified"}`
            ],
            item.status
        );

        if (item.image_url) {
            const image = document.createElement("img");
            image.src = item.image_url;
            image.alt = item.item_name || "Reported item";
            image.className = "dashboard-item-image";
            image.loading = "lazy";
            card.appendChild(image);
        }

        if (item.status === "claimed") {
            const returnButton = document.createElement("button");

            returnButton.type = "button";
            returnButton.className = "return-item-button";
            returnButton.textContent = "Mark as Returned";

            returnButton.addEventListener("click", () => {
                markItemAsReturned(item.id, returnButton);
            });

            card.appendChild(returnButton);
        }

        myItemsContainer.appendChild(card);
    });
}

// ============================================
// APPROVE OR REJECT CLAIM
// ============================================

async function updateClaim(claimId, status, button) {
    const action = status === "approved" ? "approve" : "reject";

    const confirmation = confirm(
        status === "approved"
            ? "Are you sure you want to approve this claim? The item will disappear from Browse."
            : "Are you sure you want to reject this claim?"
    );

    if (!confirmation) return;

    button.disabled = true;
    button.textContent =
        status === "approved" ? "Approving..." : "Rejecting...";

    try {
        const response = await fetch(
            `${API_URL}/claims/${encodeURIComponent(claimId)}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                },
                body: JSON.stringify({ status })
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || `Could not ${action} claim.`
            );
        }

        alert(
            status === "approved"
                ? "Claim approved! Item marked as claimed."
                : "Claim rejected. Item remains available in Browse."
        );

        await loadDashboard();

    } catch (error) {
        console.error("Claim update error:", error);
        alert(error.message);

        button.disabled = false;
        button.textContent =
            status === "approved" ? "Approve" : "Reject";
    }
}

// ============================================
// DISPLAY CLAIMS
// ============================================

function renderClaims(container, claims, emptyMessage, allowActions = false) {
    container.innerHTML = "";

    if (!claims || claims.length === 0) {
        showEmptyMessage(container, emptyMessage);
        return;
    }

    claims.forEach(claim => {
        const card = createDashboardCard(
            claim.items?.item_name || "Claim request",
            [
                `Message: ${claim.message || "No message provided"}`,
                `Submitted: ${
                    claim.created_at
                        ? new Date(claim.created_at).toLocaleDateString()
                        : "Unknown"
                }`
            ],
            claim.status
        );

        // Approve and Reject buttons for claims received by the item owner
        if (allowActions && claim.status === "pending") {
            const actions = document.createElement("div");
            actions.className = "claim-actions";

            const approveButton = document.createElement("button");
            approveButton.type = "button";
            approveButton.className = "approve-claim-button";
            approveButton.textContent = "Approve";

            approveButton.addEventListener("click", () => {
                updateClaim(claim.id, "approved", approveButton);
            });

            const rejectButton = document.createElement("button");
            rejectButton.type = "button";
            rejectButton.className = "reject-claim-button";
            rejectButton.textContent = "Reject";

            rejectButton.addEventListener("click", () => {
                updateClaim(claim.id, "rejected", rejectButton);
            });

            actions.append(approveButton, rejectButton);
            card.appendChild(actions);
        }

        // Show the item owner's contact button only to the approved claimant
        if (!allowActions && claim.status === "approved") {
            const contactButton = document.createElement("button");

            contactButton.type = "button";
            contactButton.className = "approve-claim-button";
            contactButton.textContent = "View Owner Contact";

            contactButton.addEventListener("click", () => {
                loadClaimOwnerContact(claim.id, contactButton, card);
            });

            card.appendChild(contactButton);
        }

        container.appendChild(card);
    });
}

// ============================================
// ACCEPT OR REJECT FOUND RESPONSE
// ============================================

async function updateFoundResponse(responseId, status, button) {
    const action = status === "accepted" ? "accept" : "reject";

    const confirmation = confirm(
        status === "accepted"
            ? "Does this response appear to match your lost item? Accept this response?"
            : "Are you sure you want to reject this response?"
    );

    if (!confirmation) return;

    button.disabled = true;
    button.textContent =
        status === "accepted" ? "Accepting..." : "Rejecting...";

    try {
        const response = await fetch(
            `${API_URL}/found-responses/${encodeURIComponent(responseId)}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                },
                body: JSON.stringify({ status })
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || `Could not ${action} response.`
            );
        }

        alert(
            status === "accepted"
                ? "Response accepted! You can now view the finder's contact details and arrange a safe handover."
                : "Response rejected."
        );

        await loadDashboard();

    } catch (error) {
        console.error("Found response update error:", error);
        alert(error.message);

        button.disabled = false;
        button.textContent =
            status === "accepted" ? "Accept Response" : "Reject";
    }
}

// ============================================
// ADD FINDER PROFILE DETAILS
// ============================================

function renderFinderProfile(card, profile) {
    if (!profile) {
        const message = document.createElement("p");
        message.textContent =
            "Finder profile details are currently unavailable.";
        message.className = "response-note";
        card.appendChild(message);
        return;
    }

    const profileSection = document.createElement("div");
    profileSection.className = "finder-profile";

    const heading = document.createElement("h4");
    heading.textContent = "Finder's Student Details";

    profileSection.appendChild(heading);

    const fields = [
        ["Full name", profile.full_name],
        ["Student ID", profile.student_id],
        ["Department", profile.department],
        ["Academic year", profile.academic_year],
        ["Email", profile.email],
        ["Phone number", profile.phone_number]
    ];

    fields.forEach(([label, value]) => {
        const paragraph = document.createElement("p");

        const strong = document.createElement("strong");
        strong.textContent = `${label}: `;

        const span = document.createElement("span");
        span.textContent = value || "Not provided";

        paragraph.append(strong, span);
        profileSection.appendChild(paragraph);
    });

    card.appendChild(profileSection);
}

// ============================================
// DISPLAY FOUND RESPONSES
// ============================================

function renderFoundResponses(responses) {
    foundResponsesContainer.innerHTML = "";

    if (!responses || responses.length === 0) {
        showEmptyMessage(
            foundResponsesContainer,
            "No one has responded to your Lost Item reports yet. Check back later!"
        );
        return;
    }

    responses.forEach(foundResponse => {
        const itemName =
            foundResponse.items?.item_name || "Your lost item";

        const card = createDashboardCard(
            `Response for: ${itemName}`,
            [
                `Found at: ${foundResponse.found_location || "Not specified"}`,
                `Found date: ${foundResponse.found_date || "Not specified"}`,
                `Finder's message: ${foundResponse.message || "No message provided"}`,
                `Received: ${
                    foundResponse.created_at
                        ? new Date(foundResponse.created_at).toLocaleDateString()
                        : "Unknown"
                }`
            ],
            foundResponse.status
        );

        if (foundResponse.status === "accepted") {
            const note = document.createElement("p");

            note.textContent =
                "Accepted. Contact the finder and arrange a safe handover.";

            note.className = "response-note";
            card.appendChild(note);

            // Show profile only when the backend provides it.
            renderFinderProfile(
                card,
                foundResponse.finder_profile
            );
        }

        if (foundResponse.status === "pending") {
            const actions = document.createElement("div");
            actions.className = "claim-actions";

            const acceptButton = document.createElement("button");
            acceptButton.type = "button";
            acceptButton.className = "approve-claim-button";
            acceptButton.textContent = "Accept Response";

            acceptButton.addEventListener("click", () => {
                updateFoundResponse(
                    foundResponse.id,
                    "accepted",
                    acceptButton
                );
            });

            const rejectButton = document.createElement("button");
            rejectButton.type = "button";
            rejectButton.className = "reject-claim-button";
            rejectButton.textContent = "Reject";

            rejectButton.addEventListener("click", () => {
                updateFoundResponse(
                    foundResponse.id,
                    "rejected",
                    rejectButton
                );
            });

            actions.append(acceptButton, rejectButton);
            card.appendChild(actions);
        }

        foundResponsesContainer.appendChild(card);
    });
}

// ============================================
// LOAD FOUND RESPONSES
// ============================================

async function loadFoundResponses() {
    try {
        const response = await fetch(
            `${API_URL}/found-responses/received`,
            {
                headers: {
                    "Authorization": `Bearer ${accessToken}`
                }
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Could not load found-item responses."
            );
        }

        renderFoundResponses(result.responses || []);

    } catch (error) {
        console.error("Load found responses error:", error);

        showEmptyMessage(
            foundResponsesContainer,
            "Unable to load found-item responses. Please refresh the page."
        );
    }
}

// ============================================
// LOAD DASHBOARD
// ============================================

async function loadDashboard() {
    if (!accessToken) return;

    try {
        const response = await fetch(`${API_URL}/dashboard`, {
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });

        const result = await response.json();

        if (response.status === 401) {
            localStorage.removeItem("reunly_access_token");
            localStorage.removeItem("reunly_refresh_token");
            window.location.replace("login.html");
            return;
        }

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Unable to load dashboard."
            );
        }

        const summary = result.dashboard || {};
        const profile = result.profile || {};
        const items = result.items || [];
        const receivedClaims = result.claimsReceived || [];
        const submittedClaims = result.claimsSubmitted || [];

        studentName.textContent =
            profile.full_name || profile.email || "Student";

        myReportsCount.textContent =
            summary.totalReports ?? items.length;

        claimsReceivedCount.textContent =
            summary.claimsReceived ?? receivedClaims.length;

        claimsSubmittedCount.textContent =
            summary.claimsSubmitted ?? submittedClaims.length;

        renderMyItems(items);

        renderClaims(
            receivedContainer,
            receivedClaims,
            "You haven't received any claims yet.",
            true
        );

        renderClaims(
            submittedContainer,
            submittedClaims,
            "You haven't submitted any claims yet."
        );

        await loadFoundResponses();

        console.log("REUNLY dashboard loaded successfully.");

    } catch (error) {
        console.error("Dashboard error:", error);

        showEmptyMessage(myItemsContainer, "Unable to load your reports.");
        showEmptyMessage(receivedContainer, "Unable to load received claims.");
        showEmptyMessage(submittedContainer, "Unable to load submitted claims.");
        showEmptyMessage(foundResponsesContainer, "Unable to load found-item responses.");
    }
}

// ============================================
// LOGOUT
// ============================================

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = "Logging out...";

    try {
        const response = await fetch(`${API_URL}/auth/logout`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            console.error("Server logout returned:", response.status);
        }

    } catch (error) {
        console.error("Logout request failed:", error);

    } finally {
        localStorage.removeItem("reunly_access_token");
        localStorage.removeItem("reunly_refresh_token");

        window.location.replace("login.html");
    }
});

function updateStudentProfile(profile) {
    const nameElement = document.getElementById("student-name");
    const avatarElement = document.getElementById("student-avatar");

    if (!nameElement || !avatarElement) {
        console.error("Student profile HTML elements not found.");
        return;
    }

    const fullName =
        profile?.full_name?.trim() ||
        profile?.email?.split("@")[0] ||
        "Student";

    const names = fullName.split(/\s+/);

    // Display first name
    nameElement.textContent = names[0];

    // Generate initials
    const initials = names.length > 1
        ? names[0][0] + names[names.length - 1][0]
        : names[0].substring(0, 2);

    avatarElement.textContent = initials.toUpperCase();
}

document.addEventListener("DOMContentLoaded", () => {
    const nameElement = document.getElementById("student-name");

    if (nameElement) {
        const observer = new MutationObserver(updateStudentAvatar);
        observer.observe(nameElement, {
            childList: true,
            characterData: true,
            subtree: true
        });

        updateStudentAvatar();
    }
});


// ============================================
// LOAD ITEM OWNER CONTACT DETAILS
// ============================================

async function loadClaimOwnerContact(claimId, button, card) {
    button.disabled = true;
    button.textContent = "Loading contact...";

    try {
        const response = await fetch(
            `${API_URL}/claims/${encodeURIComponent(claimId)}/contact`,
            {
                headers: {
                    "Authorization": `Bearer ${accessToken}`
                }
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Could not load contact details."
            );
        }

        const profile = result.contact;

        const section = document.createElement("div");
        section.className = "finder-profile";

        const heading = document.createElement("h4");
        heading.textContent = "Found Item Owner's Contact Details";
        section.appendChild(heading);

        const fields = [
            ["Name", profile.full_name],
            ["Email", profile.email],
            ["Phone", profile.phone_number]
        ];

        fields.forEach(([label, value]) => {
            const paragraph = document.createElement("p");

            const strong = document.createElement("strong");
            strong.textContent = `${label}: `;

            const span = document.createElement("span");
            span.textContent = value || "Not provided";

            paragraph.append(strong, span);
            section.appendChild(paragraph);
        });

        button.remove();
        card.appendChild(section);

    } catch (error) {
        console.error("Owner contact error:", error);
        alert(error.message);

        button.disabled = false;
        button.textContent = "View Owner Contact";
    }
}

// ============================================
// REUNLY NOTIFICATION SYSTEM
// ============================================

function initializeNotifications() {
    const bell = document.getElementById("notification-bell");
    const countBadge = document.getElementById("notification-count");
    const dropdown = document.getElementById("notification-dropdown");
    const list = document.getElementById("notification-list");
    const subtitle = document.getElementById("notification-subtitle");
    const markAllButton = document.getElementById("mark-all-read");

    if (!bell || !countBadge || !dropdown || !list || !markAllButton) {
        console.error("Notification HTML elements are missing.");
        return;
    }

    const authHeaders = {
        "Authorization": `Bearer ${accessToken}`
    };

    function updateUnreadBadge(count) {
        const unread = Number(count) || 0;

        countBadge.textContent = unread > 99 ? "99+" : String(unread);
        countBadge.hidden = unread === 0;

        bell.setAttribute(
            "aria-label",
            unread > 0
                ? `Open notifications, ${unread} unread`
                : "Open notifications"
        );

        subtitle.textContent = unread > 0
            ? `${unread} unread notification${unread === 1 ? "" : "s"}`
            : "You're all caught up!";
    }

    function formatNotificationDate(dateValue) {
        if (!dateValue) return "";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return "";

        return date.toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short"
        });
    }

    async function loadUnreadCount() {
        try {
            const response = await fetch(
                `${API_URL}/notifications/unread-count`,
                { headers: authHeaders }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Could not load unread count."
                );
            }

            updateUnreadBadge(result.unreadCount);

        } catch (error) {
            console.error("Unread notification count error:", error);
        }
    }

    async function loadNotifications() {
        list.innerHTML = "";

        const loading = document.createElement("p");
        loading.className = "loading-message";
        loading.textContent = "Loading notifications...";
        list.appendChild(loading);

        try {
            const response = await fetch(
                `${API_URL}/notifications`,
                { headers: authHeaders }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Could not load notifications."
                );
            }

            const notifications = result.notifications || [];

            list.innerHTML = "";

            if (notifications.length === 0) {
                const empty = document.createElement("p");
                empty.className = "notification-empty";
                empty.textContent = "No notifications yet.";
                list.appendChild(empty);
                updateUnreadBadge(0);
                return;
            }

            let unread = 0;

            notifications.forEach(notification => {
                if (!notification.is_read) unread++;

                const item = document.createElement("button");
                item.type = "button";
                item.className = "notification-item";

                if (!notification.is_read) {
                    item.classList.add("unread");
                }

                const content = document.createElement("span");
                content.className = "notification-content";

                const title = document.createElement("strong");
                title.className = "notification-item-title";
                title.textContent = notification.title || "REUNLY update";

                const message = document.createElement("span");
                message.className = "notification-message";
                message.textContent = notification.message || "";

                const date = document.createElement("small");
                date.className = "notification-date";
                date.textContent = formatNotificationDate(
                    notification.created_at
                );

                content.append(title, message, date);

                const status = document.createElement("span");
                status.className = "notification-dot";
                status.textContent = notification.is_read ? "" : "●";
                status.setAttribute("aria-hidden", "true");

                item.append(content, status);

                item.addEventListener("click", async () => {
                    if (notification.is_read) return;

                    item.disabled = true;

                    try {
                        const readResponse = await fetch(
                            `${API_URL}/notifications/${encodeURIComponent(notification.id)}/read`,
                            {
                                method: "PATCH",
                                headers: authHeaders
                            }
                        );

                        const readResult = await readResponse.json();

                        if (!readResponse.ok || !readResult.success) {
                            throw new Error(
                                readResult.message ||
                                "Could not mark notification as read."
                            );
                        }

                        await loadNotifications();
                        await loadUnreadCount();

                    } catch (error) {
                        console.error("Mark notification read error:", error);
                        item.disabled = false;
                    }
                });

                list.appendChild(item);
            });

            updateUnreadBadge(unread);

        } catch (error) {
            console.error("Load notifications error:", error);

            list.innerHTML = "";

            const errorMessage = document.createElement("p");
            errorMessage.className = "notification-empty";
            errorMessage.textContent =
                "Unable to load notifications. Please try again.";

            list.appendChild(errorMessage);
        }
    }

    // Open and close notification dropdown
    bell.addEventListener("click", async () => {
        const isOpening = dropdown.hidden;

        dropdown.hidden = !isOpening;
        bell.setAttribute("aria-expanded", String(isOpening));

        if (isOpening) {
            await loadNotifications();
            await loadUnreadCount();
        }
    });

    // Mark all notifications as read
    markAllButton.addEventListener("click", async () => {
        markAllButton.disabled = true;
        markAllButton.textContent = "Updating...";

        try {
            const response = await fetch(
                `${API_URL}/notifications/read-all`,
                {
                    method: "PATCH",
                    headers: authHeaders
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Could not update notifications."
                );
            }

            await loadNotifications();
            await loadUnreadCount();

        } catch (error) {
            console.error("Mark all notifications read error:", error);
            alert(error.message);

        } finally {
            markAllButton.disabled = false;
            markAllButton.textContent = "Mark all as read";
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", event => {
        if (!event.target.closest(".notification-wrapper")) {
            dropdown.hidden = true;
            bell.setAttribute("aria-expanded", "false");
        }
    });

    // Initial unread count
    loadUnreadCount();

    // Refresh unread count every 30 seconds
    setInterval(loadUnreadCount, 30000);
}

// ============================================
// START DASHBOARD
// ============================================

loadDashboard();
initializeNotifications();