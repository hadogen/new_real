import { ShowSection} from "./ui.js";
import { ws } from './websocket.js';
import {setupAuthenticatedState } from './app.js';

import {removeChatUI} from './chatUi.js'


export let username = null;


export function setUsername(newUsername) {
    username = newUsername;
}


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

        setUsername(result.username);

        await setupAuthenticatedState(username);
        document.getElementById("message").textContent = "Login successful";

    } catch (error) {
        document.getElementById("message").textContent = error.message;
        console.error('Login error:', error);
        console.log("logged out handleLogin");
    }
}

export async function handleRegister() {
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
        document.getElementById("message").textContent = result.message;
        ShowSection("login"); 
    } catch (error) {
        document.getElementById("message").textContent = error.message;
        console.log("logged out handleRegister");
    }
}

export async function logout() {
    try {
        const response = await fetch("/logout", {
            method: "POST",
        });
        const log = await response.json();
        
        if (ws) {
            ws.close(1000, "Logged out successfully");
            ws = null;
        }

        removeChatUI();
        setUsername(null);
        ShowSection("login");

        document.getElementById("username").innerHTML = ""
        document.getElementById("loginId").innerHTML = ""
        document.getElementById("loginPassword").innerHTML ="";

        document.getElementById("message").textContent = log.message;

    } catch (error) {
        document.getElementById("message").textContent = "Error during logout";
    }
}
