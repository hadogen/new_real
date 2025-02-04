import { ShowSection } from "./ui.js";
import { ConnectWebSocket, fetchActiveUsers } from "./websocket.js";

let currentUser = null;
let currentUsername = null;

document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();

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
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const credentials = {
        login: document.getElementById("loginId").value,
        password: document.getElementById("loginPassword").value,
    };

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

        setCurrentUser(result.user_id);
        setCurrentUsername(result.username);
        document.getElementById("message").textContent = result.message || "Login successful!";
        ShowSection("posts");
        document.getElementById("currentUser").textContent = currentUsername;
        ConnectWebSocket();
        fetchActiveUsers();
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
});

function setCurrentUser(userId) {
    currentUser = userId;
}

function setCurrentUsername(username) {
    currentUsername = username;
}

export { currentUser, currentUsername, setCurrentUser, setCurrentUsername };
