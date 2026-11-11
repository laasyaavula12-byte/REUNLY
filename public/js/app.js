async function checkServer() {
  const status = document.getElementById("server-status");

  try {
    const response = await fetch("/api/health");
    const data = await response.json();

    status.textContent = data.success
      ? "✓ Connected to the REUNLY server"
      : "Server responded, but reported an issue.";
  } catch (error) {
    status.textContent = "Unable to connect to the server. Please try again.";
    console.error("Health check failed:", error);
  }
}

checkServer();
