import { getCurrentUsername } from "./utils.js";
import { fetchProtectedResource } from "./posts.js";

export let ws = null;

let activeUsers = [];
let allUsers = [];

export let selectedUser = null;

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
            updateUserStatus(data.username, data.online);
          }
          break;

        case "private":
          handlePrivateMessage(data);
          console.log("Private message:", data.message, "from", data.sender);
          break;

        default:
          console.log("Unknown message type:", data.type);
      }
    };
  } catch (error) {
    console.error("Error connecting to WebSocket:", error);
  }
}



function updateUserStatus(username, online) {
  const userList = document.getElementById("userList");
  if (!userList) return;

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
    appendMessageToChat(data);
  }
}
function appendMessageToChat(data) {
    const messageList = document.getElementById("messageList");
    if (!messageList) return;
  
    const messageItem = document.createElement('li');
    const timeFormatted = new Date(data.time).toLocaleTimeString();
    messageItem.textContent = `${data.sender} [${timeFormatted}]: ${data.message}`;
    messageList.appendChild(messageItem);
  
    const messageBoxContent = document.getElementById("messageBoxContent");
    messageBoxContent.scrollTop = messageBoxContent.scrollHeight;
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

export async function loadChatWithUser(user) {
  const currentUsername = await getCurrentUsername();
  if (!currentUsername) return;

  const messageList = document.getElementById("messageList");
  if (!messageList) return;

  const messages = await fetchProtectedResource(
    `/private-messages?sender=${currentUsername}&receiver=${user}`
  );

  messageList.innerHTML = "";

  if (Array.isArray(messages)) {
    messages.forEach((msg) => {
      const messageItem = document.createElement("li");
      const timeFormatted = new Date(msg.created_at).toLocaleTimeString();
      messageItem.textContent = `${msg.sender} [${timeFormatted}]: ${msg.message}`;
      messageList.appendChild(messageItem);
    });
  }

  const messageBoxContent = document.getElementById("messageBoxContent");
  messageBoxContent.scrollTop = messageBoxContent.scrollHeight;
}

export async function sendPrivateMessage() {
  const messageInput = document.getElementById("messageInput");
  const message = messageInput.value.trim();
  console.log("Sending message:", message);
  if (message && selectedUser && ws) {
    const currentUsername = await getCurrentUsername();
    if (!currentUsername) return;
    console.log("this is the current user", currentUsername);
    ws.send(
      JSON.stringify({
        type: "message",
        username: currentUsername,
        receiver: selectedUser,
        message: message,
        time: new Date().toISOString(),
      })
    );
    messageInput.value = "";
    messageInput.value = "";

    const messageList = document.getElementById("messageList");
    if (messageList) {
      const messageItem = document.createElement("li");
      const timeFormatted = new Date().toLocaleTimeString();
      messageItem.textContent = `${currentUsername} [${timeFormatted}]: ${message}`;
      messageList.appendChild(messageItem);

      const messageBoxContent = document.getElementById("messageBoxContent");
      messageBoxContent.scrollTop = messageBoxContent.scrollHeight;
    }
  }
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