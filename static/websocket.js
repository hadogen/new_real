import { getCurrentUsername } from "./utils.js";
import { fetchProtectedResource } from "./posts.js";


let activeUsers = [];
let allUsers = [];
let isEndOfMessages = false;
let loadingDebounceTimer = null;

export let selectedUser = null;
export let ws = null;




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
      console.error("WebSocket error:", error);
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "userList":
          const currentUsername = await getCurrentUsername();
          activeUsers = data.users.filter(
            (user) => user !== currentUsername
          );
          updateUserList(activeUsers);
          break;

        case "userStatus":
          const currentUser = await getCurrentUsername();
          if (data.username !== currentUser) {
            if (data.online) {
              if (!activeUsers.includes(data.username)) {
                activeUsers.push(data.username);
              }
            } else {
              activeUsers = activeUsers.filter(user => user !== data.username);
            }
            updateUserList(activeUsers);
            
            if (selectedUser === data.username) {
              updateChatUI(data.online);
            }
          }
          break;

        case "private":
          handlePrivateMessage(data);
          break;

        default:
          console.log("Wrong message:", data.type);
      }
    };
  } catch (error) {
    console.error("Error connecting to WebSocket:", error);
  }
}

function updateChatUI(isActive) {
  const messageInput = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendButton");
  const statusMessage = document.getElementById("statusMessage");

  messageInput.disabled = !isActive;
  sendButton.disabled = !isActive;
  statusMessage.textContent = isActive ? "" : "This user is offline. Messages will be sent when they come online.";
}

function updateUserStatus(username, online) {
  const userList = document.getElementById("userList");
  if (!userList) 
    return;

  const userItems = userList.getElementsByTagName("li");
  for (let li of userItems) {

    if (li.textContent.startsWith(username)) {

      const status = li.querySelector("span");

      if (online) {
        if (!status) {
          const newStatus = document.createElement("span");
          newStatus.textContent = " (active)";
          newStatus.style.color = "#4CAF50";
          li.appendChild(newStatus);
        }
      } else if (status) {
        li.removeChild(status);
      }
      break;
    }
  }
}

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
    const currentUsername = await getCurrentUsername();
    const users = await fetchProtectedResource("/all-users");

    const otherUsers = users.filter((user) => user !== currentUsername);
    allUsers = otherUsers;
    updateUserList();
  } catch (error) {
    console.error("Error fetching users:", error);
  }
}
let oldestMessageDate = null;
let isLoadingMessages = false;

export async function loadChatWithUser(user) {
  const currentUsername = await getCurrentUsername();
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

  const messages = await fetchProtectedResource(
    `/private-messages?sender=${currentUsername}&receiver=${user}`
  );

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

  const isActive = activeUsers.includes(user);
  updateChatUI(isActive);

  scrollToBottom();

  const chatHeader = document.getElementById("chatHeader");
  if (chatHeader) {
    chatHeader.textContent = `Chat with ${user}`;
  }

  const messageInput = document.getElementById("messageInput");
  if (messageInput) {
    messageInput.focus();
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
  if (isEndOfMessages) return;
  
  isLoadingMessages = true;
  const messageBoxContent = document.getElementById("messageBoxContent");
  const messageList = document.getElementById("messageList");
  const prevHeight = messageBoxContent.scrollHeight;

  try {
    const currentUsername = await getCurrentUsername();
    const messages = await fetchProtectedResource(
      `/private-messages?sender=${currentUsername}&receiver=${selectedUser}&before=${oldestMessageDate}`
    );

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
  
  if (!activeUsers.includes(selectedUser)) {
    alert("This user is offline. You cannot send messages right now.");
    return;
  }

  if (message && selectedUser && ws) {
    const currentUsername = await getCurrentUsername();
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
  } else {
    messageBox.classList.add("collapsed");
    toggleButton.textContent = "▲";
    toggleButton.style.marginTop = "0";
  }
});




function showNotification(sender) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = `New message from ${sender}`;
    document.body.appendChild(notification);
  
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
  
  function updateUserList(activeUsers = []) {
    const userList = document.getElementById("userList");
    if (!userList) return;
  
    userList.innerHTML = "";
  
    allUsers.forEach(user => {
      const li = document.createElement('li');
      li.textContent = user;
  
      if (unreadCounts[user] > 0) {
        const badge = document.createElement('span');
        badge.textContent = ` (${unreadCounts[user]})`;
        badge.style.color = 'red';
        li.appendChild(badge);
      }
      if (!activeUsers.includes(user)) {
        const offlineStatus = document.createElement('span');
        offlineStatus.textContent = " (offline)";
        offlineStatus.style.color = "#ff4444";
        li.appendChild(offlineStatus);
      }
      if (activeUsers.includes(user)) {
        const status = document.createElement('span');
        status.textContent = " (active)";
        status.style.color = "#4CAF50";
        li.appendChild(status);
      }
  
      li.addEventListener('click', async () => {
        selectedUser = user;
        console.log(`Selected user: ${user}`);
        unreadCounts[user] = 0;
        updateUserList(activeUsers);
        loadChatWithUser(user);
  
        const messageBox = document.getElementById("messageBox");
        if (messageBox.classList.contains("collapsed")) {
          messageBox.classList.remove("collapsed");
          const toggleButton = document.getElementById("toggleMessageBox");
          if (toggleButton) {
            toggleButton.textContent = "▼";
          }
        }
  
        const chatHeader = document.getElementById("chatHeader");
        if (chatHeader) {
          chatHeader.textContent = `Chat with ${user}`;
        }
  
        const messageList = document.getElementById("messageList");
        if (messageList) {
          messageList.innerHTML = ""; 
          await loadChatWithUser(user);
        }
  
        const messageInput = document.getElementById("messageInput");
        if (messageInput) {
          messageInput.focus();
        }
      });
  
      userList.appendChild(li);
    });
  }