import { username } from './auth.js';
import { selectedUser, setSelectedUser, sendPrivateMessage, ws } from './websocket.js';
import { logout } from './auth.js';
import {fetchLatestMessageTimes, users, unreadCounts} from './websocket.js'
import { toggleElement } from './ui.js';

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
            updateUserList();
            loadChatWithUser(user.username);
            updateChatUI(user.online);
            openChatBox();
        });

        userList.appendChild(li);
    });
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
    toggleElement("messageBox", "toggleMessageBox", true);
    const messageInput = document.getElementById("messageInput");
    const userObj = users.find(u => u.username === selectedUser);
    updateChatUI(userObj?.online);
    if (messageInput) messageInput.focus();
}

export function removeChatUI() {
    const userListContainer = document.getElementById('userListContainer');
    const messageBox = document.getElementById('messageBox');

        userListContainer?.remove();
        messageBox?.remove();
    }

let lastScrollTime = 0;
async function handleScroll() {
    const messageBoxContent = document.getElementById("messageBoxContent");
    if (!messageBoxContent || isLoadingMessages || !oldestMessageDate || isEndOfMessages) return;

    const currentTime = Date.now();
    
    if (messageBoxContent.scrollTop < 100 && currentTime - lastScrollTime > 500) {
        lastScrollTime = currentTime; 
        await loadOlderMessages(); 
    }
}

document.getElementById("toggleMessageBox")?.addEventListener("click", toggleElement);
  

  
export function createMessageElement(sender, message, timestamp, isSent) {
    const messageItem = document.createElement('li');
    const timeFormatted = new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });


    messageItem.innerHTML = `
        ${!isSent ? `<strong>${sender}</strong>` : `<strong>${username}</strong>`}
        <span class="message-content"></span>
        <span class="message-time">${timeFormatted}</span>
    `;
    messageItem.querySelector(".message-content").textContent = message;

    messageItem.classList.add(isSent ? 'sent-message' : 'received-message');
    return messageItem;
}

let isEndOfMessages = false;
let oldestMessageDate = null;
let isLoadingMessages = false;

export async function loadChatWithUser(user) {
    const currentUsername = username;
    const messageList = document.getElementById("messageList");
    if (!messageList) return;

    messageList.innerHTML = "";

    try {
        const response = await fetch(`/private-messages?sender=${currentUsername}&receiver=${user}`);
        const messages = await response.json();

        // Reverse the messages to display oldest first
        const reversedMessages = messages.reverse();

        reversedMessages.forEach((msg) => {
            const messageItem = createMessageElement(
                msg.sender,
                msg.message,
                msg.created_at,
                msg.sender === currentUsername
            );
            messageList.appendChild(messageItem); // Append to list
        });

        // Set oldestMessageDate to the oldest message in the current batch
        if (reversedMessages.length > 0) {
            oldestMessageDate = reversedMessages[0].created_at;
        }
        const messageBoxContent = document.getElementById("messageBoxContent");
        if (messageBoxContent) {
            messageBoxContent.removeEventListener("scroll", handleScroll);
            messageBoxContent.addEventListener("scroll", handleScroll);
        }
        scrollToBottom(); // Scroll to the bottom (newest message)
    } catch (error) {
        console.error("Error loading chat:", error);
    }
}

export async function loadOlderMessages() {
    if (isEndOfMessages || isLoadingMessages || !oldestMessageDate) return;

    isLoadingMessages = true;
    const currentUsername = username;
    const messageList = document.getElementById("messageList");
    const prevScrollHeight = messageBoxContent.scrollHeight;

    try {
        const response = await fetch(
            `/private-messages?sender=${currentUsername}&receiver=${selectedUser}&before=${oldestMessageDate}`
        );
        const messages = await response.json();

        if (messages.length === 0) {
            isEndOfMessages = true;
            return;
        }

        // Reverse the new messages to maintain chronological order
        // const reversedMessages = messages.reverse();


        messages.forEach((msg) => {
            const messageItem = createMessageElement(
                msg.sender,
                msg.message,
                msg.created_at,
                msg.sender === currentUsername
            );
            messageList.prepend(messageItem); 
        });

        oldestMessageDate = messages[messages.length-1].created_at;

        messageBoxContent.scrollTop = messageBoxContent.scrollHeight - prevScrollHeight;
    } catch (error) {
        console.error("Error loading older messages:", error);
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
