import { ShowSection, createChatUI, removeChatUI } from "./ui.js";
import { ConnectWebSocket, fetchAllUsers } from "./websocket.js";
import { LoadPosts } from './posts.js';
import { ws } from './websocket.js';

export async function handleLogin() {
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
            body: JSON.stringify(credentials)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error);

        }
        document.getElementById("navLogout").style.display = "block";
        document.getElementById("navLogin").style.display = "none";
        document.getElementById("navRegister").style.display = "none";
        document.getElementById("message").textContent = "Login successful!";
        ShowSection("posts");

        await LoadPosts();
        createChatUI(); 
        await ConnectWebSocket();
        await fetchAllUsers();


    } catch (error) {
        document.getElementById("message").textContent = error.message;
        console.log(error, "error message" ,error.message)
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
        const response = await fetch("/logout", {
            method: "POST",
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error);
        }

        if (ws) {
            ws.close(1000, "Logged out successfully");
        }
        
        document.getElementById("navLogout").style.display = "none";
        document.getElementById("navLogin").style.display = "block";
        document.getElementById("navRegister").style.display = "block";
        
        removeChatUI();
        ShowSection("login");
        document.getElementById("message").textContent = result.message;
            
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}
