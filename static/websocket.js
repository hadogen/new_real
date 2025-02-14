import { currentUsername } from './auth.js';
window.sendPrivateMessage = sendPrivateMessage;
let ws = null;
export {ws}

export function ConnectWebSocket() {
    ws = new WebSocket("ws://localhost:8080/ws"); 


    ws.onmessage = function(event) {
        const messageList = document.getElementById('messageList');
        if (!messageList) return;
        const data = JSON.parse(event.data);
        const messageItem = document.createElement('li');
        const timeFormatted = new Date(data.time).toLocaleTimeString(); 
        messageItem.classList.add('message-item');
        messageItem.textContent = `${data.sender} [${timeFormatted}]: ${data.message}`;
        
        messageList.appendChild(messageItem);
        const messageBoxContent = document.getElementById('messageBoxContent');
        messageBoxContent.scrollTop = messageBoxContent.scrollHeight; 
        fetchMessages(data.sender, currentUsername);
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
        if (!userList) return; 

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
        const messageBoxContent = document.getElementById('messageBoxContent');
        messageBoxContent.scrollTop = messageBoxContent.scrollHeight; 
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

        if (!Array.isArray(messages) || messages.length === 0) {
            console.log("No more messages to load.");
            isFetching = false;
            return;
        }

        const messageList = document.getElementById("messageList");

        if (!older) {
            messageList.innerHTML = ""; 
        }
        console.log(messages)
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


document.getElementById('messageBoxContent').addEventListener('scroll', debounce(function () {
    const messageBoxContent = document.getElementById('messageBoxContent');
    
    if (isFetching) {
        return;
    }

    if (messageBoxContent.scrollTop === 0) { 
        console.log("loading another 10 messages");
        fetchMessages(currentUsername, selectedUser, true); 
    }
}, 200)); 

function debounce(func, delay) {
    let timer;
    return function() {
        clearTimeout(timer);
        timer = setTimeout(func, delay);
    };
}
export function loadChatWithUser(receiver) {
    const sender = currentUsername; 
    document.getElementById("selectedUserName").textContent = `Chat with ${receiver}`;
    fetchMessages(sender, receiver);
    const messageBoxContent = document.getElementById('messageBoxContent');
    messageBoxContent.scrollTop = messageBoxContent.scrollHeight; 
    console.log("Loading chat with", receiver);
}