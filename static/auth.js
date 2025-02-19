import { ShowSection } from "./ui.js";
import {ConnectWebSocket, fetchAllUsers } from "./websocket.js";
import {LoadPosts} from './posts.js'
import { getCurrentUsername } from "./utils.js";
import{ ws} from './websocket.js'

export async function handleLogin(){
    await logout()
    const credentials = {
        login: document.getElementById("loginId").value,
        password: document.getElementById("loginPassword").value,
    };
    console.log(credentials)
    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to login");
        }
        ConnectWebSocket();
        ShowSection("posts");
        fetchAllUsers();
        document.getElementById("navLogout").style.display = "block";
        document.getElementById("navLogin").style.display = "none";
        document.getElementById("message").textContent = result.message || "Login successful!";
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

export async function  handleRegister(){
    await logout()
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

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to register");
        }

        document.getElementById("message").textContent = result.message || "Registration successful!";
        ShowSection("login"); 
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

export async function logout() {
    const response = await fetch("/logout", {
        method: "POST",
        credentials: "include",
    });

    if (response.ok) {
        ws.close(1000, "closed succesfully")
        ShowSection("login");
        document.getElementById("navLogout").style.display = "none";
        document.getElementById("navLogin").style.display = "block";
        document.getElementById("message").textContent = "Logged out successfully";
    } else {
        document.getElementById("message").textContent = "Logout failed";
    }
}
