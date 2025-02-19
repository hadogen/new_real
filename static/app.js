import { ShowSection } from './ui.js';
import { LoadPosts, fetchProtectedResource } from './posts.js';
import { logout } from './auth.js';
import { ConnectWebSocket, fetchAllUsers } from './websocket.js';

async function checkSession() {
    try {
        const response = await fetchProtectedResource('/posts');
        if (response) {
            console.log("Session valid before login");
            ConnectWebSocket();
            ShowSection("posts");
            fetchAllUsers();
            document.getElementById("navLogout").style.display = "block";
            document.getElementById("navLogin").style.display = "none";
            return;
        }
        console.log("Session invalid before login");
        ShowSection("login");
    } catch (error) {
        console.error('Error checking session:', error);
        ShowSection("login");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("App initialized");
    checkSession();

    document.getElementById("navRegister").addEventListener("click", () => ShowSection("register"));
    document.getElementById("navLogin").addEventListener("click", () => ShowSection("login"));
    document.getElementById("navBack").addEventListener("click", () => LoadPosts());
    document.getElementById("navLogout").addEventListener("click", () => logout());
});
