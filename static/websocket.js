import { currentUsername } from './auth.js';
window.sendPrivateMessage = sendPrivateMessage;
let ws = null;
export {ws}

export function ConnectWebSocket() {
    ws = new WebSocket("ws://localhost:8080/ws"); 

    ws.onmessage = function(event) {
        const data = JSON.parse(event.data); 
        const messageList = document.getElementById('messageList'); 
        const messageItem = document.createElement('li');
        messageItem.classList.add('message-item');
        messageItem.textContent = `${data.sender} [${data.time}]: ${data.message}`;
        messageList.appendChild(messageItem);
        console.log(`Received message: ${data.sender} : ${data.message}`)
    };
    return ws;
}

let selectedUser = null; 

export async function fetchActiveUsers() {
    try {
        const users = await fetchProtectedResource('/online-users');
        if (!users) {
            throw new Error(`HTTP error! Status: ${users.status}`);
        }

        const userList = document.getElementById('userList');
        userList.innerHTML = '';
        console.log("Active users:", users);

        const otherUsers = users.filter(user => user !== currentUsername);

        otherUsers.forEach(user => {
            const userItem = document.createElement('li');
            userItem.classList.add('user-item');
            userItem.textContent = user;

            userItem.addEventListener('click', () => {
                selectedUser = user;
                loadChatWithUser(selectedUser);
                document.getElementById('messageBox').style.display = 'block';
                document.getElementById('selectedUserName').textContent = selectedUser;
            });

            userList.appendChild(userItem);
        });
    } catch (error) {
        console.error('Error fetching active users:', error);
    }
}
export function sendPrivateMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value;

    if (currentUsername && message && selectedUser) {
        const messageData = {
            type: 'private',
            username: currentUsername, 
            message: message,
            receiver: selectedUser,
            time: new Date().toISOString()
        };

        ws.send(JSON.stringify(messageData));

        messageInput.value = '';
        fetchActiveUsers();
    }
}

export async function fetchMessages(sender, receiver) {
    try {
        const messages = await fetchProtectedResource(`/private-messages?sender=${sender}&receiver=${receiver}`);

        if (!Array.isArray(messages)) {
            messages = [];
            console.log("not array")
        }

        const messageList = document.getElementById("messageList");
        messageList.innerHTML = "";

        messages.forEach(msg => {
            console.log("Stored message:", msg);
            const messageElement = document.createElement("li");
            messageElement.textContent = `${msg.sender}: ${msg.message}`;
            messageList.appendChild(messageElement);
        });

        messageList.style.display = 'block';
    } catch (error) {
        console.error("Error fetching messages:", error);
    }
}

export function loadChatWithUser(receiver) {
    const sender = currentUsername; 
    document.getElementById("selectedUserName").textContent = `Chat with ${receiver}`;
    fetchMessages(sender, receiver);
}