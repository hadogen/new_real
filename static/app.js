import { ShowSection, createChatUI } from './ui.js';
import { LoadPosts} from './posts.js';
import { logout } from './auth.js';
import { ConnectWebSocket, fetchAllUsers } from './websocket.js';
import { ws } from './websocket.js';

async function checkSession() {
    try {
        const response = await fetch('/auto-login');
        if (response.ok) {
            const user = await response.json();
            console.log("Auto-login with valid session for:", user.username);
            ShowSection("posts");
            await LoadPosts();
            createChatUI();
            await ConnectWebSocket();
            await fetchAllUsers();

            document.getElementById("navLogout").style.display = "block";
            document.getElementById("navLogin").style.display = "none";
            document.getElementById("navRegister").style.display = "none";
            document.getElementById("message").innerHTML = response.message
            return;
        }
        throw new Error(response.error);

    } catch (error) {
        console.error('Error checking session:', error);
        document.getElementById("message").textContent = error.message;
        ShowSection("login");
        document.getElementById("navLogout").style.display = "none";
        document.getElementById("navLogin").style.display = "block";
        document.getElementById("navRegister").style.display = "block";
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    console.log("App initialized");

    await checkSession();

    
    document.getElementById("navRegister").addEventListener("click", () => ShowSection("register"));
    document.getElementById("navLogin").addEventListener("click", () => ShowSection("login"));
    document.getElementById("navBack").addEventListener("click", () => LoadPosts());
    document.getElementById("navLogout").addEventListener("click", () => logout());

    setInterval(async () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "requestUsers" }));
        }
    }, 3000);
});