import { currentUsername } from './auth.js';
window.sendPrivateMessage = sendPrivateMessage;

 let ws = null
export function ConnectWebSocket() {
     ws = new WebSocket("ws://localhost:8080/ws"); 

    console.log("ws connected", ws)

    ws.onopen = ()=> {
        console.log("websocket connection opened")
    }
    ws.onclose =()=> {
        console.log("websocket closed succesfully")
    }
    ws.onerror = (e)=>{
        console.log("websocket error :" , e)
    }
    ws.onmessage = function(event) {
        const messageList = document.getElementById('messageList');
        const messageBoxContent = document.getElementById('messageBoxContent');

        if (!messageList) return;

        const data = JSON.parse(event.data);
        const messageItem = document.createElement('li');
        const timeFormatted = new Date(data.time).toLocaleTimeString(); 

        messageItem.classList.add('message-item');
        messageItem.textContent = `${data.sender} [${timeFormatted}]: ${data.message}`;
        messageList.appendChild(messageItem);
        messageBoxContent.scrollTop = messageBoxContent.scrollHeight; 
        
        fetchMessages(data.sender, currentUsername);

        //create notification
        const notification = document.createElement()
    };
}

let selectedUser = null; 

// export async function fetchActiveUsers() {
//     try {
//         const users = await fetchProtectedResource('/online-users');
//         const userList = document.getElementById('userList');
//         if (!users) {
//             userList.innerHTML = '';
//             return
//         }
//         userList.innerHTML = '';
//         console.log("Active users:", users);

//         const otherUsers = users.filter(user => user !== currentUsername);
    
//         otherUsers.forEach(user => {
//             const userItem = document.createElement('li');
//             userItem.classList.add('user-item');
//             userItem.textContent = user;

//             userItem.addEventListener('click', () => {
//                 selectedUser = user;
//                 loadChatWithUser(selectedUser);
//                 document.getElementById('messageBox').style.display = 'none' ? 'block' : 'none';
//                 console.log(document.getElementById("messageBox").style.display)
//                 document.getElementById('selectedUserName').textContent = selectedUser;
//             });
//             userList.appendChild(userItem);
//         });
//     } catch (error) {
//         console.error('Error fetching active users:', error);
//     }
// }
export async function fetchAllUsers() {
    try {
        const users = await fetchProtectedResource("/all-users");
        const activeUsers = await fetchProtectedResource("/online-users");
        
        if (!users || !activeUsers) {
            throw new Error(`Error fetching users`);
        }

        const otherUsers = users.filter(user => user !== currentUsername);

        const userMessages = await Promise.all(otherUsers.map(async user => {
            const messages = await fetchProtectedResource(`/private-messages?sender=${user}&receiver=${currentUsername}&limit=1`);
            return { user, lastMessage: messages[0] || null };
        }));

        userMessages.sort((a, b) => {
            if (a.lastMessage && b.lastMessage) {
                return new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at);
            } else if (a.lastMessage) {
                return -1;
            } else if (b.lastMessage) {
                return 1;
            } else {
                return a.user.localeCompare(b.user);
            }
        });

        const userList = document.getElementById('userList');
        userList.innerHTML = '';

        userMessages.forEach(({ user }) => {
            const userItem = document.createElement('li');
            userItem.classList.add('user-item');
            userItem.textContent = user;

            if (activeUsers.includes(user)) {
                userItem.textContent += ' (active)';
            }

            userItem.addEventListener('click', () => {
                selectedUser = user;
                loadChatWithUser(selectedUser);
                const messageBox = document.getElementById('messageBox');
                messageBox.classList.remove('collapsed');
                document.getElementById('toggleMessageBox').textContent = '▼';
                document.getElementById('selectedUserName').textContent = selectedUser;
            });
            userList.appendChild(userItem);
        });
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

async function isUserActive(username) {
    try {
        const activeUsers = await fetchProtectedResource("/online-users");
        return activeUsers.includes(username);
    } catch (error) {
        console.error('Error checking user status:', error);
        return false;
    }
}

export async function loadChatWithUser(receiver) {
    try {
        const isActive = await isUserActive(receiver);
        const messageBox = document.getElementById('messageBox');
        const sendButton = document.getElementById('sendMessageButton');
        const messageBoxContent = document.getElementById('messageBoxContent');
        const messageInput = document.getElementById('messageInput');
        
        document.getElementById("selectedUserName").textContent = `Chat with ${receiver}`;
        
        if (!isActive) {
            // Handle inactive user
            sendButton.disabled = true;
            sendButton.classList.add('tooltip');
            sendButton.setAttribute('data-tooltip', 'User is not currently active');
            messageBox.classList.add('collapsed');
            document.getElementById('toggleMessageBox').textContent = '▲';
            messageBoxContent.style.display = 'none';
            messageInput.style.display = 'none';
            sendButton.style.display = 'none';
            return; // Exit early without fetching messages
        }

        // Handle active user
        sendButton.disabled = false;
        sendButton.classList.remove('tooltip');
        sendButton.removeAttribute('data-tooltip');
        messageBox.classList.remove('collapsed');
        document.getElementById('toggleMessageBox').textContent = '▼';
        messageBoxContent.style.display = 'block';
        messageInput.style.display = 'block';
        sendButton.style.display = 'block';
        
        // Only fetch messages if user is active
        fetchMessages(currentUsername, receiver);
        messageBoxContent.scrollTop = messageBoxContent.scrollHeight;
        
    } catch (error) {
        console.error('Error loading chat:', error);
    }
}

export async function sendPrivateMessage() {
    // Double-check if user is still active before sending
    if (!await isUserActive(selectedUser)) {
        const sendButton = document.getElementById('sendMessageButton');
        sendButton.disabled = true;
        sendButton.classList.add('tooltip');
        sendButton.setAttribute('data-tooltip', 'User is not currently active');
        return;
    }

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
        fetchAllUsers()    
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

export {ws}

// Add this near the top of the file with other initialization code
document.getElementById('toggleMessageBox').addEventListener('click', () => {
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