import { ShowSection } from './ui.js';
import { ConnectWebSocket } from './websocket.js';
import { fetchActiveUsers } from './websocket.js';
import { LoadPosts } from './posts.js';

document.addEventListener("DOMContentLoaded", () => {
    console.log("App initialized");
    ShowSection("login");

    document.getElementById("navRegister").addEventListener("click", () => ShowSection("register"));
    document.getElementById("navLogin").addEventListener("click", () => ShowSection("login"));
    document.getElementById("navBack").addEventListener("click", () => LoadPosts());
    document.getElementById("navLogout").addEventListener("click", () => logout());

    ConnectWebSocket();
    fetchActiveUsers();
});

async function logout() {
    const response = await fetch("/logout", {
        method: "POST",
        credentials: "include",
    });

    if (response.ok) {
        ShowSection("login");
        document.getElementById("navLogout").style.display = "none";
        document.getElementById("navLogin").style.display = "block";
        document.getElementById("message").textContent = "Logged out successfully";
    } else {
        document.getElementById("message").textContent = "Logout failed";
    }
}