import { username } from "./auth.js";
import {  
    updateChatUI, 
    showNotification, 
    appendMessageToChat,
    updateUserList,
} from "./chatUi.js";

export let selectedUser = null;
export let ws = null;
export let users = []; 

export function setSelectedUser(user) {
    selectedUser = user;
}

export async function ConnectWebSocket() {
    try {
        ws = new WebSocket("ws://localhost:8080/ws");

        ws.onopen = () => {
            console.log("WebSocket connection opened");
            ws.send(JSON.stringify({ type: "requestUsers" }));
        };

        ws.onclose = () => {
            console.log("WebSocket connection closed");
            ws = null;
        };

        ws.onerror = (error) => {
            console.log("WebSocket error:", error);
        };

        ws.onmessage = async (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case "fullUserStatus":
                    users = data.users.map(user => ({
                        ...user, unread: unreadCounts[user.username] || 0
                    }));
                    updateUserList();
                    break;

                case "userUpdate":
                    const userIndex = users.findIndex(u => u.username === data.username);
                    if (userIndex !== -1) {
                        users[userIndex].online = data.online;
                        updateUserList();
                    }
                    break;

                case "private":
                    handlePrivateMessage(data);
                    break;

                default:
                    console.log("Unknown message type:", data.type);
            }
        };
    } catch (error) {
        console.error("Error connecting to WebSocket:", error);
    }
}

export async function fetchLatestMessageTimes() {
    try {
        const response = await fetch(`/latest-messages?username=${username}`);
        if (!response.ok) {
            throw new Error("Failed to fetch latest message times");
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching latest message times:", error);
        return {};
    }
}

let messages = {};
export let unreadCounts = {};

function handlePrivateMessage(data) {
    if (!messages[data.sender]) messages[data.sender] = [];
    messages[data.sender].push(data);

    if (selectedUser !== data.sender) {
        showNotification(data.sender);
        unreadCounts[data.sender] = (unreadCounts[data.sender] || 0) + 1;
        updateUserList()
    }

    if (selectedUser === data.sender) {
        appendMessageToChat(data, false);
        unreadCounts[data.sender] = 0;
        updateUserList()
    }
}


export async function sendPrivateMessage() {
    const messageInput = document.getElementById("messageInput");
    const message = messageInput.value.trim();

    const userObj = users.find(u => u.username === selectedUser);

    if (!userObj || !userObj.online) {
      console.log(userObj.online)
        alert("This user is offline. You cannot send messages right now.");
        return;
    }

    if (message && selectedUser && ws) {
        const currentUsername = username;
        if (!currentUsername) return;

        const timestamp = new Date().toISOString();
        ws.send(
            JSON.stringify({
                type: "message",
                username: currentUsername,
                receiver: selectedUser,
                message: message,
                time: timestamp,
            })
        );

        appendMessageToChat({
            sender: currentUsername,
            message: message,
            time: timestamp
        }, true);

        messageInput.value = "";
    }
}



