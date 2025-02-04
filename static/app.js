let currentUser = null;
let currentUsername = null;

// Register form submission
document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = {
        nickname: document.getElementById("nickname").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        age: parseInt(document.getElementById("age").value),
        gender: document.getElementById("gender").value,
        first_name: document.getElementById("firstName").value,
        last_name: document.getElementById("lastName").value,
    };

    try {
        const response = await fetch("/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(user),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to register");
        }

        document.getElementById("message").textContent = result.message || "Registration successful!";
        ShowSection("login"); // Redirect to login after registration
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
});

// Login form submission
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const credentials = {
        login: document.getElementById("loginId").value,
        password: document.getElementById("loginPassword").value,
    };

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to login");
        }

        currentUser = result.user_id; // Set the current user
        currentUsername = result.username; // Set the current username
        document.getElementById("message").textContent = result.message || "Login successful!";
        ShowSection("posts"); // Redirect to the posts section after login
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
});

// Load posts from the backend
async function LoadPosts() {
    try {
        const response = await fetch("/posts", {
            headers: {
                "User-ID": currentUser,
                "Username": currentUsername,
            },
        });
        const posts = await response.json();
        if (!response.ok) {
            throw new Error(posts.error || "Failed to load posts");
        }

        const postFeed = document.getElementById("postFeed");
        if (Array.isArray(posts) && posts.length > 0) {
            postFeed.innerHTML = posts
                .map(
                    (post) => `
                    <div class="post">
                        <h3>${post.title}</h3>
                        <p>${post.content}</p>
                        <small>Posted by ${post.username} on ${new Date(post.created_at).toLocaleString()}</small>
                        <div>
                            <button onclick="LikePost('${post.id}')">Like (${post.likes || 0})</button>
                            <button onclick="DislikePost('${post.id}')">Dislike (${post.dislikes || 0})</button>
                        </div>
                        <button onclick="ShowComments('${post.id}')">View Comments</button>
                    </div>
                `
                )
                .join("");
        } else {
            postFeed.innerHTML = "<p>No posts found.</p>";
        }
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

// Like a post
async function LikePost(postId) {
    try {
        const response = await fetch(`/posts/like?post_id=${postId}`, {
            method: "POST",
            headers: {
                "User-ID": currentUser,
            },
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to like post");
        }

        document.getElementById("message").textContent = result.message || "Post liked successfully!";
        LoadPosts(); // Refresh the post feed
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

// Dislike a post
async function DislikePost(postId) {
    try {
        const response = await fetch(`/posts/dislike?post_id=${postId}`, {
            method: "POST",
            headers: {
                "User-ID": currentUser,
            },
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to dislike post");
        }

        document.getElementById("message").textContent = result.message || "Post disliked successfully!";
        LoadPosts(); // Refresh the post feed
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

// Show comments for a post
function ShowComments(postId) {
    // Set the post ID in the hidden input field
    document.getElementById("commentPostId").value = postId;

    // Show the comments section
    ShowSection("comments");

    // Load comments for the selected post
    LoadComments(postId);
}

// Load comments for a post
async function LoadComments(postId) {
    try {
        const response = await fetch(`/comments?post_id=${postId}`);
        const comments = await response.json();
        if (!response.ok) {
            throw new Error(comments.error || "Failed to load comments");
        }

        const commentFeed = document.getElementById("commentFeed");
        if (Array.isArray(comments) && comments.length > 0) {
            commentFeed.innerHTML = comments
                .map(
                    (comment) => `
                    <div class="comment">
                        <p>${comment.content}</p>
                        <small>Posted by ${comment.username} on ${new Date(comment.created_at).toLocaleString()}</small>
                        <div>
                            <button onclick="LikeComment('${comment.id}')">Like (${comment.likes || 0})</button>
                            <button onclick="DislikeComment('${comment.id}')">Dislike (${comment.dislikes || 0})</button>
                        </div>
                    </div>
                `
                )
                .join("");
        } else {
            commentFeed.innerHTML = "<p>No comments found.</p>";
        }
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

// Create a post
document.getElementById("createPostForm").addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent the default form submission behavior

    const post = {
        title: document.getElementById("postTitle").value,
        content: document.getElementById("postContent").value,
        category: document.getElementById("postCategory").value,
    };

    try {
        const response = await fetch("/posts/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-ID": currentUser,
                "Username": currentUsername,
            },
            body: JSON.stringify(post),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to create post");
        }

        document.getElementById("message").textContent = result.message || "Post created successfully!";
        document.getElementById("createPostForm").reset();
        LoadPosts(); // Refresh the post feed
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
});

// Create a comment
document.getElementById("createCommentForm").addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent the default form submission behavior

    const comment = {
        post_id: document.getElementById("commentPostId").value,
        content: document.getElementById("commentContent").value,
    };

    try {
        const response = await fetch("/comments/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-ID": currentUser,
                "Username": currentUsername,
            },
            body: JSON.stringify(comment),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to create comment");
        }

        document.getElementById("message").textContent = result.message || "Comment created successfully!";
        document.getElementById("createCommentForm").reset();
        LoadComments(comment.post_id); // Refresh the comment feed
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
});

// Like a comment
async function LikeComment(commentId) {
    try {
        const response = await fetch(`/comments/like?comment_id=${commentId}`, {
            method: "POST",
            headers: {
                "User-ID": currentUser,
            },
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to like comment");
        }

        document.getElementById("message").textContent = result.message || "Comment liked successfully!";
        LoadComments(document.getElementById("commentPostId").value); // Refresh the comment feed
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

// Dislike a comment
async function DislikeComment(commentId) {
    try {
        const response = await fetch(`/comments/dislike?comment_id=${commentId}`, {
            method: "POST",
            headers: {
                "User-ID": currentUser,
            },
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to dislike comment");
        }

        document.getElementById("message").textContent = result.message || "Comment disliked successfully!";
        LoadComments(document.getElementById("commentPostId").value); // Refresh the comment feed
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}
// Filter posts by category
async function FilterByCategory() {
    const category = document.getElementById("categoryFilter").value;
    try {
        const response = await fetch(`/posts/category?category=${category}`);
        const posts = await response.json();
        if (!response.ok) {
            throw new Error(posts.error || "Failed to fetch posts");
        }

        const postFeed = document.getElementById("postFeed");
        if (Array.isArray(posts) && posts.length > 0) {
            postFeed.innerHTML = posts
                .map(
                    (post) => `
                    <div class="post">
                        <h3>${post.title}</h3>
                        <p>${post.content}</p>
                        <small>Posted by ${post.username} on ${new Date(post.created_at).toLocaleString()}</small>
                        <div>
                            <button onclick="LikePost('${post.id}')">Like (${post.likes || 0})</button>
                            <button onclick="DislikePost('${post.id}')">Dislike (${post.dislikes || 0})</button>
                        </div>
                        <button onclick="ShowComments('${post.id}')">View Comments</button>
                    </div>
                `
                )
                .join("");
        } else {
            postFeed.innerHTML = "<p>No posts found.</p>";
        }
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

// Filter posts created by the logged-in user
async function FilterByCreatedPosts() {
    if (!currentUser) {
        document.getElementById("message").textContent = "You must be logged in to view your posts.";
        return;
    }

    try {
        const response = await fetch(`/posts/created?user_id=${currentUser}`);
        const posts = await response.json();
        if (!response.ok) {
            throw new Error(posts.error || "Failed to fetch posts");
        }

        const postFeed = document.getElementById("postFeed");
        if (Array.isArray(posts) && posts.length > 0) {
            postFeed.innerHTML = posts
                .map(
                    (post) => `
                    <div class="post">
                        <h3>${post.title}</h3>
                        <p>${post.content}</p>
                        <small>Posted by ${post.username} on ${new Date(post.created_at).toLocaleString()}</small>
                        <div>
                            <button onclick="LikePost('${post.id}')">Like (${post.likes || 0})</button>
                            <button onclick="DislikePost('${post.id}')">Dislike (${post.dislikes || 0})</button>
                        </div>
                        <button onclick="ShowComments('${post.id}')">View Comments</button>
                    </div>
                `
                )
                .join("");
        } else {
            postFeed.innerHTML = "<p>No posts found.</p>";
        }
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

// Filter posts liked by the logged-in user
async function FilterByLikedPosts() {
    if (!currentUser) {
        document.getElementById("message").textContent = "You must be logged in to view liked posts.";
        return;
    }

    try {
        const response = await fetch(`/posts/liked?user_id=${currentUser}`);
        const posts = await response.json();
        if (!response.ok) {
            throw new Error(posts.error || "Failed to fetch posts");
        }

        const postFeed = document.getElementById("postFeed");
        if (Array.isArray(posts) && posts.length > 0) {
            postFeed.innerHTML = posts
                .map(
                    (post) => `
                    <div class="post">
                        <h3>${post.title}</h3>
                        <p>${post.content}</p>
                        <small>Posted by ${post.username} on ${new Date(post.created_at).toLocaleString()}</small>
                        <div>
                            <button onclick="LikePost('${post.id}')">Like (${post.likes || 0})</button>
                            <button onclick="DislikePost('${post.id}')">Dislike (${post.dislikes || 0})</button>
                        </div>
                        <button onclick="ShowComments('${post.id}')">View Comments</button>
                    </div>
                `
                )
                .join("");
        } else {
            postFeed.innerHTML = "<p>No posts found.</p>";
        }
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

// Show the register section by default



ShowSection("register");



// Improved JavaScript Code
// Global variables

let socket = null;
const RECONNECT_DELAY = 3000; // Reconnect delay in milliseconds

// Function to get cookies
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Function to check if the user is logged in
function IsLoggedIn() {
    return currentUser !== null;
}

// Initialize session from cookies
function InitSession() {
    currentUser = getCookie("user_id");
    currentUsername = getCookie("username");

    if (IsLoggedIn()) {
        ConnectWebSocket();
        LoadActiveUsers();
        ShowSection("posts");
    } else {
        ShowSection("login");
    }
}

// Show/hide sections
function ShowSection(sectionId) {
    if (!IsLoggedIn() && sectionId !== "login" && sectionId !== "register") {
        alert("You must be logged in to access this section.");
        ShowSection("login");
        return;
    }

    document.querySelectorAll(".section").forEach((section) => {
        section.classList.remove("active");
    });

    document.getElementById(sectionId).classList.add("active");

    // Load posts when the posts section is shown
    if (sectionId === "posts") {
        LoadPosts();
    }
}

// Connect to WebSocket
function ConnectWebSocket() {
    if (socket) socket.close();

    const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    socket = new WebSocket(`${wsProtocol}${window.location.host}/ws?user_id=${currentUser}`);

    socket.onopen = () => {
        console.log("WebSocket connected");
        LoadActiveUsers();
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "error") {
            ShowError(message.content);
        } else if (message.type === "private_message") {
            DisplayMessage(message);
        } else if (message.type === "user_status") {
            UpdateUserList(message.users);
        }
    };

    socket.onclose = (event) => {
        console.log(`WebSocket closed: ${event.reason}`);
        setTimeout(ConnectWebSocket, RECONNECT_DELAY);
    };

    socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        socket.close();
    };
}

// Display a message in the chat history
function DisplayMessage(message) {
    const chatHistory = document.getElementById("chatHistory");
    const isOutgoing = message.sender_id === currentUser;

    const messageElement = document.createElement("div");
    messageElement.className = `message ${isOutgoing ? 'outgoing' : 'incoming'} ${message.status || ''}`;
    messageElement.innerHTML = `
        <div class="message-meta">
            <span class="username">${message.senderUsername}</span>
            <span class="timestamp">${new Date(message.timestamp).toLocaleTimeString()}</span>
            ${message.status === 'pending' ? '<span class="status">🕒</span>' : ''}
            ${message.status === 'delivered' ? '<span class="status">✓</span>' : ''}
        </div>
        <div class="message-content">${message.content}</div>
    `;

    chatHistory.appendChild(messageElement);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Load active users
async function LoadActiveUsers() {
    try {
        const response = await fetch("/online-users");
        if (!response.ok) {
            throw new Error(`Failed to fetch active users: ${response.statusText}`);
        }

        const users = await response.json();
        const userList = document.getElementById("userList");

        if (!userList) {
            console.error("Active users list element not found!");
            return;
        }

        // Clear the list before populating
        userList.innerHTML = "";

        // Add each user to the list
        users.forEach(user => {
            if (user.id !== currentUser) { // Exclude the current user
                const userItem = document.createElement("li");
                userItem.className = "user-item";
                userItem.dataset.userId = user.id;
                userItem.innerHTML = `
                    <span class="user-status ${user.online ? 'online' : 'offline'}"></span>
                    ${user.username}
                `;
                userItem.onclick = () => ShowChat(user.id, user.username);
                userList.appendChild(userItem);
            }
        });

        console.log("Active users loaded:", users);
    } catch (error) {
        console.error("Error loading active users:", error);
        ShowError("Failed to load active users. Please try again.");
    }
}

// Function to update the user list with real-time status
function UpdateUserList(users) {
    const userList = document.getElementById("userList");
    if (!userList) {
        console.error("Active users list element not found!");
        return;
    }

    users.forEach(user => {
        const userItem = userList.querySelector(`[data-user-id="${user.id}"]`);
        if (userItem) {
            const statusIndicator = userItem.querySelector(".user-status");
            if (statusIndicator) {
                statusIndicator.classList.toggle("online", user.online);
                statusIndicator.classList.toggle("offline", !user.online);
            }
        }
    });
}

// Load chat history
async function LoadChatHistory(receiverId) {
    try {
        const response = await fetch(`/private-messages?sender_id=${currentUser}&receiver_id=${receiverId}`);
        if (!response.ok) throw new Error('Failed to load history');

        const messages = await response.json();
        const chatHistory = document.getElementById("chatHistory");
        chatHistory.innerHTML = messages
            .map(msg => CreateMessageElement(msg))
            .join("");

        chatHistory.scrollTop = chatHistory.scrollHeight;
    } catch (error) {
        ShowError("Failed to load chat history");
        console.error("Chat history error:", error);
    }
}

// Create a message element for the chat history
function CreateMessageElement(msg) {
    const isOutgoing = msg.sender_id === currentUser;
    return `
        <div class="message ${isOutgoing ? 'outgoing' : 'incoming'}">
            <div class="message-meta">
                <span class="username">${msg.senderUsername}</span>
                <span class="timestamp">${new Date(msg.created_at).toLocaleTimeString()}</span>
            </div>
            <div class="message-content">${msg.content}</div>
        </div>
    `;
}

// Send a message
async function SendMessage(event) {
    event.preventDefault();
    const receiverId = document.getElementById("receiverId").value;
    const content = document.getElementById("messageContent").value.trim();

    if (!content || !receiverId) return;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
        ShowError("Connection lost. Reconnecting...");
        ConnectWebSocket();
        return;
    }

    try {
        const message = {
            type: "private_message",
            receiver_id: receiverId,
            content: content,
            timestamp: new Date().toISOString()
        };

        socket.send(JSON.stringify(message));
        document.getElementById("messageContent").value = "";

        // Optimistically add message to UI
        DisplayMessage({
            ...message,
            sender_id: currentUser,
            senderUsername: currentUsername,
            status: 'pending'
        });

    } catch (error) {
        ShowError("Failed to send message");
        console.error("Message send error:", error);
    }
}

// Logout function
function Logout() {
    document.cookie = "user_id=; path=/; max-age=0";
    document.cookie = "username=; path=/; max-age=0";

    currentUser = null;
    currentUsername = null;

    if (socket) {
        socket.close();
        socket = null;
    }

    ShowSection("login");
}

// Show error message
function ShowError(message) {
    const errorElement = document.getElementById("message");
    errorElement.textContent = message;
    errorElement.classList.add("error");
    setTimeout(() => errorElement.classList.remove("error"), 3000);
}

// Event listeners
document.getElementById("sendMessageForm").addEventListener("submit", SendMessage);
document.getElementById("logoutButton").addEventListener("click", Logout);

// Initialize session on page load
InitSession();
