import { currentUsername } from './auth.js';
window.sendPrivateMessage = sendPrivateMessage;
let ws = null;
export {ws}

export function ConnectWebSocket() {
    10
    ws = new WebSocket("ws://localhost:8080/ws"); 


    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        const messageList = document.getElementById('messageList');
        const messageItem = document.createElement('li');
        const timeFormatted = new Date(data.time).toLocaleTimeString(); 
        messageItem.classList.add('message-item');
        messageItem.textContent = `${data.sender} [${timeFormatted}]: ${data.message}`;
        
        messageList.appendChild(messageItem); 
        messageList.scrollBottom = messageList.scrollHeight;
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
export async function fetchAllUsers() {
    try {
        const users = fetchProtectedResource("/all-users");
        if (!users){
            throw new Error(`all users error status : ${users.status}`)
        }
    }
    catch (error){
        console.log(error)
    }
}
export function sendPrivateMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value;

    if (currentUsername && message.trim()!=="" && selectedUser) {
        const messageData = {
            type: 'private',
            username: currentUsername, 
            message: message,
            receiver: selectedUser,
            time: new Date().toISOString()
        };
        console.log("from", currentUsername, "to", selectedUser);
        ws.send(JSON.stringify(messageData));

        const messageList = document.getElementById('messageList');
        const messageElement = document.createElement('li');
        const formattedTime = new Date(messageData.time).toLocaleTimeString();

        messageElement.textContent = `${currentUsername} [${formattedTime}]: ${message}`;
        messageList.appendChild(messageElement);
        messageInput.value = '';
        fetchActiveUsers();
    }
}

let lastLoadedTimestamp = null;
let isFetching = false; 

export async function fetchMessages(sender, receiver, older = false) {
    if (isFetching) return;
    isFetching = true; 

    let url = `/private-messages?sender=${sender}&receiver=${receiver}`;
    
    if (older && lastLoadedTimestamp) {
        url += `&before=${lastLoadedTimestamp}`;
    }

    try {
        let messages = await fetchProtectedResource(url);

        if (!Array.isArray(messages)) {
            messages = [];
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

            if (index === 0) {
                lastLoadedTimestamp = msg.created_at; 
            }
        });

        isFetching = false;
    } catch (error) {
        console.error("Error fetching messages:", error);
        isFetching = false;
    }
}
document.getElementById('messageList').addEventListener('scroll', function () {
    if (this.scrollTop === 0) { 
        console.log("loading another 10 messages");
        fetchMessages(currentUsername, selectedUser, true);
    }
});



export function loadChatWithUser(receiver) {
    const sender = currentUsername; 
    document.getElementById("selectedUserName").textContent = `Chat with ${receiver}`;
    fetchMessages(sender, receiver);
    console.log("Loading chat with", receiver);
}