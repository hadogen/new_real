import { ShowSection, createChatUI } from './ui.js';
import { LoadPosts} from './posts.js';
import { logout, username, setUsername } from './auth.js';
import { ConnectWebSocket } from './websocket.js';
import { ws } from './websocket.js';


export async function setupAuthenticatedState() {
    ShowSection("posts");
    await LoadPosts();
    createChatUI();
    await ConnectWebSocket();

}


async function initializeSession() {
    try {
        const autoLoginResponse = await fetch('/auto-login');
        if (autoLoginResponse.ok) {
            const userData = await autoLoginResponse.json();
            setUsername(userData.username);
            console.log("Auto-login successful for:", username);
            
            await setupAuthenticatedState();
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error during auto-login:', error);
        return false;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    console.log("App initialized");
    
    const isAuthenticated = await initializeSession();
    if (!isAuthenticated) {
        ShowSection("login");
        return
    }

    document.getElementById("navRegister").addEventListener("click", () => ShowSection("register"));
    document.getElementById("navLogin").addEventListener("click", () => ShowSection("login"));

       

});