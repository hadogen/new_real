import { ShowSection } from "./ui.js";
import { ConnectWebSocket, fetchAllUsers } from "./websocket.js";
import { LoadPosts } from './posts.js';
import { ws } from './websocket.js';

export async function handleLogin() {
    console.log("handleLogin");
    const loginButton = document.querySelector("#loginForm button[type='submit']");
    if (loginButton.disabled) return; 
    
    loginButton.disabled = true; 
    const credentials = {
        login: document.getElementById("loginId").value,
        password: document.getElementById("loginPassword").value,
    };

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
            credentials: 'include'
        });

        const result = await response.json();
        if (!response.ok) {
            document.getElementById("message").textContent = result.error || "Failed to login";
            throw new Error(result.error || "Failed to login");

        }
        document.getElementById("navLogout").style.display = "block";
        document.getElementById("navLogin").style.display = "none";
        document.getElementById("navRegister").style.display = "none";
        document.getElementById("message").textContent = result.message || "Login successful!";
        ShowSection("posts");

        await LoadPosts();
        await ConnectWebSocket();
        await fetchAllUsers();


    } catch (error) {
        document.getElementById("message").textContent = error.message;
    } finally {
        loginButton.disabled = false;
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(user),
        });
        console.log("resp test")
        const result = await response.json();
        console.log("result", result)
        if (!response.ok) {
            document.getElementById("message").textContent = result.error;
            throw new Error(result.error || "Failed to register");
        }

        document.getElementById("message").textContent = result.message || "Registration successful!";
        ShowSection("login"); 
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

export async function logout() {
    try {
        const response = await fetch("/logout", {
            method: "POST",
            credentials: "include",
        });

            if (ws) {
                ws.close(1000, "Logged out successfully");
            }
            document.getElementById("navLogout").style.display = "none";
            document.getElementById("navLogin").style.display = "block";
            document.getElementById("navRegister").style.display = "block";
                        
            const userListContainer = document.getElementById("userListContainer");
            if (userListContainer) {
                userListContainer.style.display = "none";
            }

            const messageBox = document.getElementById("messageBox");
            if (messageBox) {
                messageBox.style.display = "none";
            }
            ShowSection("login");
            document.getElementById("message").textContent = "Logged out successfully";
            
        }  catch (error) {
        console.log("Logout error:", error);
    }
}
