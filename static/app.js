import { ShowSection, createChatUI } from './ui.js';
import { LoadPosts} from './posts.js';
import { logout } from './auth.js';
import { ConnectWebSocket, fetchAllUsers } from './websocket.js';
import { ws } from './websocket.js';
export let username = null;

export function setUsername(newUsername) {
    username = newUsername;
}

async function initializeSession() {
    try {
        // Try auto-login first
        const autoLoginResponse = await fetch('/auto-login');
        if (autoLoginResponse.ok) {
            const userData = await autoLoginResponse.json();
            username = userData.username;
            console.log("Auto-login successful for:", username);
            
            // Setup authenticated state
            await setupAuthenticatedState();
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error during auto-login:', error);
        return false;
    }
}

export async function setupAuthenticatedState() {
    ShowSection("posts");
    await LoadPosts();
    createChatUI();
    await ConnectWebSocket();
    await fetchAllUsers();

}

document.addEventListener("DOMContentLoaded", async () => {
    console.log("App initialized");
    
    const isAuthenticated = await initializeSession();
    if (!isAuthenticated) {
        ShowSection("login");
    }

    document.getElementById("navRegister").addEventListener("click", () => ShowSection("register"));
    document.getElementById("navLogin").addEventListener("click", () => ShowSection("login"));
    document.getElementById("navBack").addEventListener("click", () => LoadPosts());
    document.getElementById("navLogout").addEventListener("click", () => logout());
       
    // setInterval(async () => {
    //     if (ws && ws.readyState === WebSocket.OPEN) {
    //         ws.send(JSON.stringify({ type: "requestUsers" }));
    //     }
    // }, 3000);
});