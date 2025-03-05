import { logout } from "./auth.js";
import { username } from "./app.js";

let allUsers = [];
let isEndOfMessages = false;
let loadingDebounceTimer = null;
let activeUsers = []
export let selectedUser = null;
export let ws = null;
let users = []; 

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
                        ...user,
                        unread: unreadCounts[user.username] || 0
                    }));
                    updateUserList();
                    // If selectedUser exists, check their online status
                    if (selectedUser) {
                        const user = users.find(u => u.username === selectedUser);
                        updateChatUI(user?.online || false);
                    }
                    break;

                case "userUpdate":
                    const userIndex = users.findIndex(u => u.username === data.username);
                    if (userIndex !== -1) {
                        users[userIndex].online = data.online;
                        updateUserList();
                        // If updated user is the selected one, update UI
                        if (selectedUser === data.username) {
                            updateChatUI(data.online);
                        }
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


function updateChatUI(isActive) {
    const messageInput = document.getElementById("messageInput");
    const sendButton = document.getElementById("sendMessageButton");
    const messageBox = document.getElementById("messageBox");

    if (messageInput && sendButton) {
        const shouldEnable = isActive && !messageBox?.classList.contains("collapsed");
        messageInput.disabled = !shouldEnable;
        sendButton.disabled = !shouldEnable;

        const statusElement = document.getElementById("chatStatus");
        if (statusElement) {
            statusElement.textContent = isActive ? "Online" : "Offline";
            statusElement.style.color = isActive ? "#4CAF50" : "#ff4444";
        }
    }
}

async function updateUserList() {
    const userList = document.getElementById("userList");
    if (!userList) return;

    const latestMessageTimes = await fetchLatestMessageTimes();

    users.sort((a, b) => {
        const timeA = latestMessageTimes[a.username] || "";
        const timeB = latestMessageTimes[b.username] || "";

        if (timeA && timeB) {
            return new Date(timeB) - new Date(timeA);
        } else if (timeA) {
            return -1;
        } else if (timeB) {
            return 1;
        } else {
            return a.username.localeCompare(b.username);
        }
    });

    userList.innerHTML = "";

    users.forEach(user => {
        if (user.username === username) return;
        const li = document.createElement("li");
        li.textContent = user.username;

        const status = document.createElement("span");
        status.textContent = user.online ? " (online)" : " (offline)";
        status.style.color = user.online ? "#4CAF50" : "#ff4444";
        li.appendChild(status);

        if (unreadCounts[user.username] > 0) {
            const badge = document.createElement("span");
            badge.textContent = ` (${unreadCounts[user.username]})`;
            badge.style.color = "red";
            li.appendChild(badge);
        }

        li.addEventListener("click", () => {
            selectedUser = user.username;
            unreadCounts[user.username] = 0;
            loadChatWithUser(user.username);
            openChatBox();
            updateChatUI(user.online);
        });

        userList.appendChild(li);
    });

    if (selectedUser) {
        const user = users.find(u => u.username === selectedUser);
        updateChatUI(user?.online || false);
    }
}

document.getElementById("toggleMessageBox")?.addEventListener("click", () => {
    const messageBox = document.getElementById("messageBox");
    const toggleButton = document.getElementById("toggleMessageBox");

    if (messageBox.classList.contains("collapsed")) {
        messageBox.classList.remove("collapsed");
        toggleButton.textContent = "▼";
        // Enable input only if user is online
        const userObj = users.find(u => u.username === selectedUser);
        updateChatUI(userObj?.online || false);
    } else {
        messageBox.classList.add("collapsed");
        toggleButton.textContent = "▲";
        // Disable input when collapsed
        updateChatUI(false);
    }
});

document.getElementById("sendMessageButton")?.addEventListener("click", sendPrivateMessage);

function showNotification(sender) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = `New message from ${sender}`;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

async function fetchLatestMessageTimes() {
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

// Ensure chat box opens properly
function openChatBox() {
  const messageBox = document.getElementById("messageBox");
  const toggleButton = document.getElementById("toggleMessageBox");
  if (messageBox && toggleButton) {
      messageBox.classList.remove("collapsed");
      toggleButton.textContent = "▼";
      // Focus input when opening
      const messageInput = document.getElementById("messageInput");
      if (messageInput) messageInput.focus();
  }
}

document.getElementById("toggleMessageBox")?.addEventListener("click", () => {
  const messageBox = document.getElementById("messageBox");
  const toggleButton = document.getElementById("toggleMessageBox");

  if (messageBox.classList.contains("collapsed")) {
      messageBox.classList.remove("collapsed");
      toggleButton.textContent = "▼";
      // Enable input only if user is online
      const userObj = users.find(u => u.username === selectedUser);
      updateChatUI(userObj?.online || false);
  } else {
      messageBox.classList.add("collapsed");
      toggleButton.textContent = "▲";
      // Disable input when collapsed
      updateChatUI(false);
  }
});

let messages = {};
let unreadCounts = {};

function handlePrivateMessage(data) {
    if (!messages[data.sender]) messages[data.sender] = [];
    messages[data.sender].push(data);

    if (selectedUser !== data.sender) {
        showNotification(data.sender);
        unreadCounts[data.sender] = (unreadCounts[data.sender] || 0) + 1;
        updateUserList(activeUsers);
    }

    if (selectedUser === data.sender) {
        appendMessageToChat(data, false);
        unreadCounts[data.sender] = 0;
        updateUserList(activeUsers);
    }
}

function appendMessageToChat(data, isSent) {
    const messageList = document.getElementById("messageList");
    if (!messageList) return;

    const messageItem = createMessageElement(
        data.sender,
        data.message,
        data.time,
        isSent
    );

    messageList.appendChild(messageItem);
    scrollToBottom();
}

export async function fetchAllUsers() {
    try {
        const response = await fetch("/all-users");
        const users = await response.json();
        if (!response.ok) {
            if (response.status === 401) {
                logout();
                throw new Error("Not authorized");
            }
            throw new Error(users.error);
        }
        updateUserList();
    } catch (error) {
        console.error("Error fetching users:", error);
    }
}

let oldestMessageDate = null;
let isLoadingMessages = false;

export async function loadChatWithUser(user) {
    console.log("Loading chat with user:", user);
    const currentUsername = username;
    if (!currentUsername) return;

    const messageList = document.getElementById("messageList");
    if (!messageList) return;

    isEndOfMessages = false;
    oldestMessageDate = null;
    isLoadingMessages = false;
    if (loadingDebounceTimer) {
        clearTimeout(loadingDebounceTimer);
    }

    messageList.innerHTML = "";
    try {
        const response = await fetch(
            `/private-messages?sender=${currentUsername}&receiver=${user}`
        );
        const messages = await response.json();
        if (!response.ok) {
            if (response.status === 401) {
                logout();
                throw new Error("Not authorized");
            }
            throw new Error(messages.error);
        }
        if (Array.isArray(messages)) {
            messages.reverse().forEach((msg) => {
                const messageItem = createMessageElement(
                    msg.sender,
                    msg.message,
                    msg.created_at,
                    msg.sender === currentUsername
                );
                messageList.appendChild(messageItem);
            });

            if (messages.length > 0) {
                oldestMessageDate = messages[0].created_at;
            }

            setTimeout(scrollToBottom, 0);
        }

        const messageBoxContent = document.getElementById("messageBoxContent");
        if (messageBoxContent) {
            messageBoxContent.removeEventListener("scroll", handleScroll);
            messageBoxContent.addEventListener("scroll", handleScroll);
        }

        const selectedUserObj = users.find(u => u.username === user);
        updateChatUI(selectedUserObj?.online || false);

        scrollToBottom();

        const chatHeader = document.getElementById("chatHeader");
        if (chatHeader) {
            chatHeader.textContent = `Chat with ${user}`;
        }

        const messageInput = document.getElementById("messageInput");
        if (messageInput) {
            messageInput.focus();
        }
    } catch (error) {
        console.error("Error loading chat with user:", error);
        document.getElementById("messageList").textContent = error.message;
    }
}

async function handleScroll() {
    const messageBoxContent = document.getElementById("messageBoxContent");
    if (!messageBoxContent || isLoadingMessages || !oldestMessageDate || isEndOfMessages) return;

    if (messageBoxContent.scrollTop < 100) {
        if (loadingDebounceTimer) {
            clearTimeout(loadingDebounceTimer);
        }

        loadingDebounceTimer = setTimeout(async () => {
            await loadOlderMessages();
        }, 500);
    }
}

async function loadOlderMessages() {
    console.log("Loading older messages...");
    if (isEndOfMessages) return;

    isLoadingMessages = true;
    const messageBoxContent = document.getElementById("messageBoxContent");
    const messageList = document.getElementById("messageList");
    const prevHeight = messageBoxContent.scrollHeight;

    try {
        const currentUsername = username;
        const response = await fetch(
            `/private-messages?sender=${currentUsername}&receiver=${selectedUser}&before=${oldestMessageDate}`
        );
        const messages = await response.json();
        if (!response.ok) {
            if (response.status === 401) {
                logout();
                throw new Error("Not authorized");
            }
            throw new Error(messages.error);
        }
        if (!Array.isArray(messages) || messages.length === 0) {
            isEndOfMessages = true;
            const endMessage = document.createElement('div');
            endMessage.className = 'end-messages-indicator';
            endMessage.textContent = 'No more messages to load';
            endMessage.style.textAlign = 'center';
            endMessage.style.color = '#888';
            endMessage.style.padding = '10px';
            endMessage.style.fontSize = '0.9em';
            messageList.prepend(endMessage);
            return;
        }

        oldestMessageDate = messages[0].created_at;

        messages.reverse().forEach((msg) => {
            console.log(msg);
            const messageItem = createMessageElement(
                msg.sender,
                msg.message,
                msg.created_at,
                msg.sender === currentUsername
            );
            messageList.prepend(messageItem);
        });

        messageBoxContent.scrollTop = messageBoxContent.scrollHeight - prevHeight;

    } catch (error) {
        console.error("Error loading older messages:", error);
        document.getElementById("messageList").textContent = error.message;
    } finally {
        isLoadingMessages = false;
    }
}

function scrollToBottom() {
    const messageBoxContent = document.getElementById("messageBoxContent");
    if (messageBoxContent) {
        messageBoxContent.scrollTop = messageBoxContent.scrollHeight;
    }
}

export async function sendPrivateMessage() {
    const messageInput = document.getElementById("messageInput");
    const message = messageInput.value.trim();

    const userObj = users.find(u => u.username === selectedUser);
    console.log("Selected user:", selectedUser);
    console.log("User object:", userObj);

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

function createMessageElement(sender, message, timestamp, isSent) {
    const messageItem = document.createElement('li');
    const timeFormatted = new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageItem.innerHTML = `
        ${!isSent ? `<strong>${sender}</strong>` : ''}
        <span class="message-content">${message}</span>
        <span class="message-time">${timeFormatted}</span>
    `;

    messageItem.classList.add(isSent ? 'sent-message' : 'received-message');
    return messageItem;
}

document.getElementById("toggleMessageBox")?.addEventListener("click", () => {
  const messageBox = document.getElementById("messageBox");
  const toggleButton = document.getElementById("toggleMessageBox");

  if (messageBox.classList.contains("collapsed")) {
      messageBox.classList.remove("collapsed");
      toggleButton.textContent = "▼";
      // Enable input only if user is online
      const userObj = users.find(u => u.username === selectedUser);
      updateChatUI(userObj?.online || false);
  } else {
      messageBox.classList.add("collapsed");
      toggleButton.textContent = "▲";
      // Disable input when collapsed
      updateChatUI(false);
  }
});

document.getElementById("sendMessageButton")?.addEventListener("click", sendPrivateMessage);

