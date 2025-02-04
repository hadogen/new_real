let currentUser = null;
let currentUsername = null;

// Function to show/hide sections
function ShowSection(sectionId) {
    document.querySelectorAll(".section").forEach((section) => {
        section.classList.remove("active");
    });

    // Show the selected section
    document.getElementById(sectionId).classList.add("active");

    // Load posts when the posts section is shown
    if (sectionId === "posts") {
        if (!currentUser) {
            document.getElementById("message").textContent = "You must be logged in to view posts.";
            ShowSection("login");
        } else {
            LoadPosts();
        }
    }
}

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

let socket = null;

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

// Function to initialize user session from cookies
function InitSession() {
    currentUser = getCookie("user_id");
    currentUsername = getCookie("username");
    
    if (IsLoggedIn()) {
        ConnectWebSocket();
        LoadActiveUsers();
        document.getElementById("privateMessagingSection").style.display = "block";
        document.getElementById("postsSection").style.display = "block";
    } else {
        document.getElementById("privateMessagingSection").style.display = "none";
        document.getElementById("postsSection").style.display = "none";
    }
}

// Function to show sections only if logged in
function ShowSection(sectionId) {
    if (!IsLoggedIn()) {
        alert("You must be logged in to access this section.");
        return;
    }
    document.querySelectorAll(".section").forEach((section) => {
        section.classList.remove("active");
    });
    document.getElementById(sectionId).classList.add("active");
    if (sectionId === "posts") LoadPosts();
}

// Connect to WebSocket
function ConnectWebSocket() {
    if (socket) socket.close();
    socket = new WebSocket(`ws://localhost:8080/ws?user_id=${currentUser}`);
    
    socket.onopen = () => console.log("WebSocket connected");
    socket.onmessage = (event) => DisplayMessage(JSON.parse(event.data));
    socket.onclose = () => console.log("WebSocket disconnected");
}

// Display message in chat history
function DisplayMessage(message) {
    if (message.receiver_id !== currentUser) return;
    const chatHistory = document.getElementById("chatHistory");
    const messageElement = document.createElement("div");
    messageElement.innerHTML = `<p><strong>${message.senderUsername}</strong>: ${message.content}</p>`;
    chatHistory.appendChild(messageElement);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Load active users
async function LoadActiveUsers() {
    try {
        const response = await fetch("/online-users");
        const users = await response.json();
        if (!response.ok) throw new Error(users.error || "Failed to load users");
        const userList = document.getElementById("activeUsers");
        userList.innerHTML = users.map(user => `<li onclick="ShowChat('${user.id}', '${user.username}')">${user.username}</li>`).join("");
    } catch (error) {
        console.error("Error loading users:", error);
    }
}

// Show chat with a user
function ShowChat(userId, username) {
    document.getElementById("receiverId").value = userId;
    document.getElementById("chatHeader").textContent = `Chat with ${username}`;
    LoadChatHistory(userId);
    ShowSection("chat");
}

// Load chat history
async function LoadChatHistory(receiverId) {
    try {
        const response = await fetch(`/private-messages?sender_id=${currentUser}&receiver_id=${receiverId}`);
        const messages = await response.json();
        if (!response.ok) throw new Error(messages.error || "Failed to load messages");
        const chatHistory = document.getElementById("chatHistory");
        chatHistory.innerHTML = messages.map(msg => `<div><p><strong>${msg.senderUsername}</strong>: ${msg.content}</p></div>`).join("");
        chatHistory.scrollTop = chatHistory.scrollHeight;
    } catch (error) {
        console.error("Error loading chat history:", error);
    }
}

// Send a message
async function SendMessage(event) {
    event.preventDefault();
    if (!IsLoggedIn()) {
        alert("You must be logged in to send messages.");
        return;
    }
    const receiverId = document.getElementById("receiverId").value;
    const content = document.getElementById("messageContent").value;
    if (!receiverId || !content) return alert("Please select a user and enter a message.");
    socket.send(JSON.stringify({ sender_id: currentUser, senderUsername: currentUsername, receiver_id: receiverId, content }));
    document.getElementById("messageContent").value = "";
}

document.getElementById("sendMessageForm").addEventListener("submit", SendMessage);

InitSession();
