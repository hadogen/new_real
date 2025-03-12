import { ShowSection, createChatUI } from './ui.js';
import { LoadPosts} from './posts.js';
import { username, setUsername } from './auth.js';
import { ConnectWebSocket } from './websocket.js';


export async function setupAuthenticatedState(username) {
    const userName = document.getElementById("username")
    userName.textContent = "Welcome " + username
    userName.style.fontSize = "20px"
    userName.style.fontWeight = "Bold"
    userName.style.margin = "1rem"
    ShowSection("posts");
    await LoadPosts();
    await ConnectWebSocket();
    createChatUI();

}


async function initializeSession() {
    try {
        const autoLoginResponse = await fetch('/auto-login');
        if (autoLoginResponse.ok) {
            const userData = await autoLoginResponse.json();
            setUsername(userData.username);
            await setupAuthenticatedState(username);
            return true;
        }
        return false;
    } catch (error) {
        console.log('Error during auto-login:', error);
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
});