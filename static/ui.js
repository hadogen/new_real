import { handleCreateComment} from './comments.js'
import { handleCreatePost, LoadPosts} from './posts.js'
import {handleLogin, handleRegister, logout} from './auth.js'
import { sendPrivateMessage,  selectedUser, setSelectedUser } from './websocket.js'

const sectionTemplates = {
    login: `
        <div class="section" id="login">
            <h2>Login</h2>
            <form id="loginForm">
                <input type="text" id="loginId" placeholder="Nickname or Email" required>
                <input type="password" id="loginPassword" placeholder="Password" required>
                <button type="submit">Login</button>
            </form>
        </div>
    `,
    register: `
        <div class="section" id="register">
            <h2>Register</h2>
            <form id="registerForm">
                <input type="text" id="nickname" placeholder="Nickname" required>
                <input type="email" id="email" placeholder="Email" required>
                <input type="password" id="password" placeholder="Password" required>
                <input type="number" id="age" placeholder="Age" required>
                <select id="gender" required>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                </select>
                <input type="text" id="firstName" placeholder="First Name" required>
                <input type="text" id="lastName" placeholder="Last Name" required>
                <button type="submit">Register</button>
            </form>
        </div>
    `,
    posts: `
        <div class="section" id="posts">
            <h2>Posts</h2>
            <div class="post-controls">
                <form id="createPostForm">
                    <input type="text" id="postTitle" placeholder="Title" required>
                    <textarea id="postContent" placeholder="Content" required></textarea>
                    <select id="postCategory" required>
                        <option value="Technology">Technology</option>
                        <option value="Science">Science</option>
                        <option value="Entertainement">Entertainement</option>
                        <option value="Random">Random</option>
                        <option value="Politics">Politics</option>
                        <option value="DIY">DIY</option>
                        <option value="News">News</option>
                    </select>
                    <button type="submit">Create Post</button>
                </form>
            </div>
            <div id="postFeed"></div>
        </div>
    `,
    comments: `
        <div class="section" id="comments">
            <h2>Comments</h2>
            <form id="createCommentForm">
                <input type="hidden" id="commentPostId">
                <textarea id="commentContent" placeholder="Add a comment..." required></textarea>
                <button type="submit">Comment</button>
            </form>
            <div id="commentFeed"></div>
        </div>
    `
};

export async function ShowSection(sectionId) {
    const dynamicContent = document.getElementById("dynamicContent");
    dynamicContent.innerHTML = sectionTemplates[sectionId] || "<p>Section not found.</p>";

    const navElements = {
        navBack: document.getElementById("navBack"),
        navLogout: document.getElementById("navLogout"),
        navLogin: document.getElementById("navLogin"),
        navRegister: document.getElementById("navRegister")
    };

    if (sectionId === "login" || sectionId === "register") {
        navElements.navBack.style.display = "none";
        navElements.navLogout.style.display = "none";
        navElements.navLogin.style.display = "block";
        navElements.navRegister.style.display = "block";
    } else if (sectionId === "posts" || sectionId === "comments") {
        document.getElementById("navBack").addEventListener("click", () => LoadPosts());
        document.getElementById("navLogout").addEventListener("click", () => logout());
        navElements.navBack.style.display = "block";
        navElements.navLogout.style.display = "block";
        navElements.navLogin.style.display = "none";
        navElements.navRegister.style.display = "none";
    }

    const eventSetup = {
        register: () => {
            const form = document.getElementById("registerForm");
            form?.addEventListener("submit", async (e) => {
                e.preventDefault();
                await handleRegister(e);
            });
        },
        login: () => {
            const form = document.getElementById("loginForm");
            form?.addEventListener("submit", async (e) => {
                e.preventDefault();
                await handleLogin(e);
            });
        },
        posts: () => {
            const createPostForm = document.getElementById("createPostForm");
            const sendMessageBtn = document.getElementById("sendMessageButton");

            createPostForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                await handleCreatePost(e);
            });
            sendMessageBtn?.addEventListener("click", sendPrivateMessage);
        },
        comments: () => {
            const form = document.getElementById("createCommentForm");
            form?.addEventListener("submit", async (e) => {
                e.preventDefault();
                await handleCreateComment(e);
            });
        }
    };

    if (eventSetup[sectionId]) {
        eventSetup[sectionId]();
    }
}

export function createChatUI() {
    // Create the user list container
    const userListContainer = document.createElement('div');
    userListContainer.id = 'userListContainer';
    userListContainer.innerHTML = `
        <div class="user-list-header">
            <h2>Users</h2>
            <button id="toggleUserList">▼</button>
        </div>
        <ul id="userList"></ul>
    `;

    // Create the message box
    const messageBox = document.createElement('div');
    messageBox.id = 'messageBox';
    messageBox.className = 'collapsed';
    messageBox.innerHTML = `
        <div id="messageBoxHeader">
            <div>
                <h3>Send a Private Message</h3>
                <h4 id="selectedUserName"></h4>
            </div>
            <button id="toggleMessageBox">▼</button>
        </div>
        <div id="messageBoxContent">
            <ul id="messageList"></ul>
        </div>
        <input type="text" id="messageInput" placeholder="Type your message" />
        <button id="sendMessageButton">Send</button>
    `;

    // Append both containers to the body
    document.body.appendChild(userListContainer);
    document.body.appendChild(messageBox);

    // Add toggle functionality for the user list
    document.getElementById("toggleUserList").addEventListener("click", () => {
        userListContainer.classList.toggle("collapsed");
        const button = document.getElementById("toggleUserList");
        button.textContent = userListContainer.classList.contains("collapsed") ? "▲" : "▼";
    });

    // Add toggle functionality for the message box
    document.getElementById("toggleMessageBox").addEventListener("click", () => {
        const messageBox = document.getElementById("messageBox");
        const toggleButton = document.getElementById("toggleMessageBox");
        const selectedUserName = document.getElementById("selectedUserName");

        if (messageBox.classList.contains("collapsed")) {
            messageBox.classList.remove("collapsed");
            selectedUserName.textContent = selectedUser;
            toggleButton.textContent = "▼";
        } else {
            messageBox.classList.add("collapsed");
            toggleButton.textContent = "▲";
            setSelectedUser(null);
            selectedUserName.textContent = "";
            document.getElementById("messageList").innerHTML = "";
        }
    });

    const sendMessageButton = document.getElementById("sendMessageButton");
    sendMessageButton.addEventListener("click", sendPrivateMessage);
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

const handleScroll = throttle(() => {
    const scrollPosition = window.innerHeight + window.scrollY;
    const bodyHeight = document.body.offsetHeight;
    
    if (scrollPosition >= bodyHeight - 1000) {
        LoadPosts(false);
    }
}, 500);



