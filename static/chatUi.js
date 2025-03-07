import { username } from './auth.js';
import { selectedUser, setSelectedUser, sendPrivateMessage, ws } from './websocket.js';
import { logout } from './auth.js';
import {fetchLatestMessageTimes, users, unreadCounts} from './websocket.js'

export function scrollToBottom() {
    const messageBoxContent = document.getElementById("messageBoxContent");
    if (messageBoxContent) {
        messageBoxContent.scrollTop = messageBoxContent.scrollHeight;
    }
}
// todo
export function updateChatUI(isActive) {
    const messageInput = document.getElementById("messageInput");
    const sendButton = document.getElementById("sendMessageButton");
    const messageBox = document.getElementById("messageBox");

    if (messageInput && sendButton) {
        const shouldEnable = isActive && !messageBox?.classList.contains("collapsed");
        messageInput.disabled = !shouldEnable;
        sendButton.disabled = !shouldEnable;
    }
}

export async function updateUserList() {
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
            setSelectedUser(user.username)
            unreadCounts[user.username] = 0;
            console.log("rest to zero notif", user.username)
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

document.getElementById("sendMessageButton")?.addEventListener("click", sendPrivateMessage);

export function showNotification(sender) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = `New message from ${sender}`;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 2000);
}

function openChatBox() {
    const messageBox = document.getElementById("messageBox");
    const toggleButton = document.getElementById("toggleMessageBox");
    if (messageBox && toggleButton) {
        messageBox.classList.remove("collapsed");
        toggleButton.textContent = "▼";
        const messageInput = document.getElementById("messageInput");
        if (messageInput) messageInput.focus();
    }
  }

export function removeChatUI() {
    const userListContainer = document.getElementById('userListContainer');
    const messageBox = document.getElementById('messageBox');
    
    if (userListContainer) {
        userListContainer.remove();
    }
    if (messageBox) {
        messageBox.remove();
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

document.getElementById("toggleMessageBox")?.addEventListener("click", () => {
    const messageBox = document.getElementById("messageBox");
    const toggleButton = document.getElementById("toggleMessageBox");
  
    if (messageBox.classList.contains("collapsed")) {
        messageBox.classList.remove("collapsed");
        toggleButton.textContent = "▼";

        const userObj = users.find(u => u.username === selectedUser);
        updateChatUI(userObj?.online);
    } else {
        messageBox.classList.add("collapsed");
        toggleButton.textContent = "▲";
        updateChatUI(false);
    }
  });
  

  
export function createMessageElement(sender, message, timestamp, isSent) {
    const messageItem = document.createElement('li');
    const timeFormatted = new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageItem.innerHTML = `
        ${!isSent ? `<strong>${sender}</strong>` : `<strong>${username}</strong>`}
        <span class="message-content">${message}</span>
        <span class="message-time">${timeFormatted}</span>
    `;

    messageItem.classList.add(isSent ? 'sent-message' : 'received-message');
    return messageItem;
}

let isEndOfMessages = false;
let loadingDebounceTimer = null;
let oldestMessageDate = null;
let isLoadingMessages = false;

export async function loadChatWithUser(user) {

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

        scrollToBottom();

    } catch (error) {
        console.error("Error loading chat with user:", error);
        document.getElementById("messageList").textContent = error.message;
    }
}


export async function loadOlderMessages() {
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

export function appendMessageToChat(data, isSent) {
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
