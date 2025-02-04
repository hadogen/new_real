let currentUser = null;
let currentUsername = null;
let ws = null
///registration
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
        ShowSection("login"); 
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
});

// Login 
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

        currentUser = result.user_id; 
        currentUsername = result.username;
        document.getElementById("message").textContent = result.message || "Login successful!";
        ShowSection("posts");
        document.getElementById("currentUser").textContent = currentUsername;
        ws = ConnectWebSocket()
        fetchActiveUsers()

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
                fetchActiveUsers();
        } else {
            postFeed.innerHTML = "<p>No posts found.</p>";
            fetchActiveUsers();
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
        LoadPosts(); 
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

// Dislike
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
        LoadPosts(); 
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

function ShowComments(postId) {
    document.getElementById("commentPostId").value = postId;

    ShowSection("comments");
    LoadComments(postId);
}

// Load comments 
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
    e.preventDefault(); 

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
        LoadPosts(); 
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
});

// Create a comment
document.getElementById("createCommentForm").addEventListener("submit", async (e) => {
    e.preventDefault(); 

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
        LoadComments(comment.post_id); 
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
        LoadComments(document.getElementById("commentPostId").value); 
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}
// Filter 
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


ShowSection("register");


// Show sections
function ShowSection(sectionId) {
    if (!currentUsername && sectionId !== "login" && sectionId !== "register") {
        alert("You must be logged in to access this section.");
        ShowSection("login");
        return;
    }

    document.querySelectorAll(".section").forEach((section) => {
        section.classList.remove("active");
    });

    document.getElementById(sectionId).classList.add("active");

    if (sectionId === "posts") {
        LoadPosts();
    }
}

var counter = 0

function ConnectWebSocket() {
    const ws = new WebSocket("ws://localhost:8080/ws"); 

    ws.onmessage = function(event) {
        const data = JSON.parse(event.data); 
            const messageList = document.getElementById('messageList'); 
            const messageItem = document.createElement('li');
            messageItem.classList.add('message-item');
            messageItem.textContent = `${data.sender} [${data.time}]: ${data.message}`;
            messageList.appendChild(messageItem);
            console.log(`${data.sender} : ${data.message}`)
    };
    return ws
}

let selectedUser = null; 

function fetchActiveUsers() {
    fetch('/online-users')
        .then(response => response.json())
        .then(users => {
            const userList = document.getElementById('userList');
            userList.innerHTML = '';
            console.log("users fetched", users)
            users.forEach(user => {
                const userItem = document.createElement('li');
                userItem.classList.add('user-item');
                userItem.textContent = user;

                userItem.addEventListener('click', () => {
                     selectedUser = user;
                     loadChatWithUser();
                    document.getElementById('messageBox').style.display = 'block';
                    document.getElementById('selectedUserName').textContent = selectedUser;
                });

                userList.appendChild(userItem);
            });
        })
        .catch(error => console.error('Error fetching active users:', error));
}

// Dms
function sendPrivateMessage() {
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
async function fetchMessages(sender, receiver) {
    try {
        const response = await fetch(`/private-messages?sender=${sender}&receiver=${receiver}`);
        const messages = await response.json();
        
        console.log("Messages:", messages);

        const messageList = document.getElementById("messageList");
        messageList.innerHTML = "";

        messages.forEach(msg => {
            const messageElement = document.createElement("li");
            messageElement.textContent = `${msg.sender}: ${msg.message}`;
            messageList.appendChild(messageElement);
        });
        messageList.style.display = 'block';
    } catch (error) {
        console.error("Error fetching messages:", error);
    }
}

function loadChatWithUser(receiver) {
    const sender = currentUsername; 
    document.getElementById("selectedUserName").textContent = `Chat with ${receiver}`;
    fetchMessages(sender, receiver);
}


fetchActiveUsers();