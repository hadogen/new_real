import { ShowSection, createChatUI, removeChatUI } from "./ui.js";
import { ConnectWebSocket, fetchAllUsers } from "./websocket.js";
import { LoadPosts } from './posts.js';
import { ws } from './websocket.js';
import { setUsername, setupAuthenticatedState } from './app.js';

export async function handleLogin() {
    const credentials = {
        login: document.getElementById("loginId").value,
        password: document.getElementById("loginPassword").value,
    };

    try {
        const response = await fetch("/login", {
            method: "POST",
            body: JSON.stringify(credentials)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error);
        }

        // After successful login, get username
        const userResponse = await fetch('/current-user');
        if (!userResponse.ok) {
            throw new Error('Failed to get user information');
        }
        const userData = await userResponse.json();
        setUsername(userData.username); // Use the setter function instead

        // Setup authenticated state
        await setupAuthenticatedState();
        document.getElementById("message").textContent = "Login successful";

    } catch (error) {
        document.getElementById("message").textContent = error.message;
        console.error('Login error:', error);
    }
}

export async function  handleRegister(){

    
    const user = {
        nickname: document.getElementById("nickname").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        age: parseInt(document.getElementById("age").value),
        gender: document.getElementById("gender").value,
        first_name: document.getElementById("firstName").value,
        last_name: document.getElementById("lastName").value,
    };

    try {
        const response = await fetch("/register", {
            method: "POST",
            body: JSON.stringify(user),
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error);
        }
        document.getElementById("message").textContent =  result.message;
        ShowSection("login"); 
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

export async function logout() {
    try {
        // Attempt to logout on server
        const response = await fetch("/logout", {
            method: "POST",
            credentials: "include"
        });

        // Close WebSocket connection if it exists
        if (ws) {
            ws.close(1000, "Logged out successfully");
        }
        
        // Clean up UI and show login section
        removeChatUI();
        ShowSection("login");
        
        // Clear login form
        document.getElementById("loginId").value = "";
        document.getElementById("loginPassword").value = "";
        
        // Show success message
        document.getElementById("message").textContent = "Logged out successfully";

    } catch (error) {
        console.error("Logout error:", error.message);
        document.getElementById("message").textContent = "Error during logout";
    }
}
