import { getCurrentUsername } from './utils.js';
import { fetchProtectedResource } from './posts.js';
window.sendPrivateMessage = sendPrivateMessage;

export let ws = null;

export async function ConnectWebSocket() {
    try {
        ws = new WebSocket("ws://localhost:8080/ws");
        
        ws.onopen = () => {
            console.log("websocket connection opened");
        };
        
        ws.onclose = () => {
            console.log("websocket closed successfully");
        };
        
        ws.onerror = (e) => {
            console.error("websocket error:", e);
            setTimeout(ConnectWebSocket, 3000);
        };
        
        ws.onmessage = async function(event) {
            const messageList = document.getElementById('messageList');
            const messageBoxContent = document.getElementById('messageBoxContent');

            if (!messageList) return;

            const data = JSON.parse(event.data);
            const messageItem = document.createElement('li');
            const timeFormatted = new Date(data.time).toLocaleTimeString(); 
            const currentUsername = await getCurrentUsername();

            messageItem.classList.add('message-item');
            messageItem.textContent = `${data.sender} [${timeFormatted}]: ${data.message}`;
            messageList.appendChild(messageItem);
            messageBoxContent.scrollTop = messageBoxContent.scrollHeight; 
            
            fetchMessages(data.sender, currentUsername);
        };
    } catch (error) {
        console.error("Error connecting to WebSocket:", error);
    }
}

let selectedUser = null;

export async function fetchAllUsers() {
    try {
        const users = await fetchProtectedResource('/all-users');
        const userList = document.getElementById('userList');
        const currentUsername = await getCurrentUsername();
        
        if (!users) {
            userList.innerHTML = '';
            return;
        }
        userList.innerHTML = '';

        const otherUsers = users.filter(user => user !== currentUsername);
    
        otherUsers.forEach(user => {
            const userItem = document.createElement('li');
            userItem.classList.add('user-item');
            userItem.textContent = user;

            userItem.addEventListener('click', async () => {
                selectedUser = user;
                await loadChatWithUser(selectedUser);
                document.getElementById('messageBox').classList.remove('collapsed');
                document.getElementById('selectedUserName').textContent = selectedUser;
            });
            userList.appendChild(userItem);
        });
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

export async function loadChatWithUser(user) {
    const currentUsername = await getCurrentUsername();
    await fetchMessages(user, currentUsername);
}

let isFetching = false;
let lastLoadedTimestamp = null;

export async function sendPrivateMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (message && selectedUser && ws) {
        const currentUsername = await getCurrentUsername();
        ws.send(JSON.stringify({
            type: "message",
            sender: currentUsername,
            receiver: selectedUser,
            message: message
        }));

        const messageElement = document.createElement('li');
        messageElement.textContent = `${currentUsername}: ${message}`;
        const messageList = document.getElementById('messageList');
        messageList.appendChild(messageElement);
        const messageBoxContent = document.getElementById('messageBoxContent');
        messageBoxContent.scrollTop = messageBoxContent.scrollHeight; 
        messageInput.value = '';
        fetchAllUsers();    
    }
}

export async function fetchMessages(sender, receiver, older = false) {
    if (isFetching) return;
    isFetching = true;

    const currentUsername = await getCurrentUsername();
    let url = `/private-messages?sender=${sender}&receiver=${receiver || currentUsername}`;
    
    if (older && lastLoadedTimestamp) {
        url += `&before=${lastLoadedTimestamp}`;
    }

    try {
        const messages = await fetchProtectedResource(url);
        if (!Array.isArray(messages) || messages.length === 0) {
            console.log("No more messages to load.");
            isFetching = false;
            return;
        }

        const messageList = document.getElementById("messageList");

        if (!older) {
            messageList.innerHTML = ""; 
        }

        messages.reverse().forEach((msg, index) => {
            const messageElement = document.createElement("li");
            const timeFormatted = new Date(msg.created_at).toLocaleTimeString();
            messageElement.textContent = `${msg.sender} [${timeFormatted}]: ${msg.message}`;
            
            if (older) {
                messageList.prepend(messageElement); 
            } else {
                messageList.appendChild(messageElement); 
            }
            if (index === messages.length - 1) {
                lastLoadedTimestamp = msg.created_at; 
            }
        });
        isFetching = false;
    } catch (error) {
        console.error("Error fetching messages:", error);
        isFetching = false;
    }
}

document.getElementById('messageBoxContent')?.addEventListener('scroll', debounce(async function () {
    const messageBoxContent = document.getElementById('messageBoxContent');
    
    if (isFetching) {
        return;
    }

    if (messageBoxContent.scrollTop === 0) { 
        console.log("loading another 10 messages");
        const currentUsername = await getCurrentUsername();
        fetchMessages(selectedUser, currentUsername, true); 
    }
}, 200));

function debounce(func, delay) {
    let timer;
    return function() {
        clearTimeout(timer);
        timer = setTimeout(func, delay);
    };
}

document.getElementById('toggleMessageBox')?.addEventListener('click', () => {
    const messageBox = document.getElementById('messageBox');
    const toggleButton = document.getElementById('toggleMessageBox');
    
    if (messageBox.classList.contains('collapsed')) {
        messageBox.classList.remove('collapsed');
        toggleButton.textContent = '▼';
    } else {
        messageBox.classList.add('collapsed');
        toggleButton.textContent = '▲';
    }
});