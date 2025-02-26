import { handleCreateComment} from './comments.js'
import { handleCreatePost} from './posts.js'
import {handleLogin, handleRegister} from './auth.js'
import {FilterByCategory, FilterByCreatedPosts} from './filters.js'
import { sendPrivateMessage} from './websocket.js'
import { getCurrentUsername } from './utils.js'
const activeListeners = new Map();

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
                        <option value="Art">Art</option>
                    </select>
                    <button type="submit">Create Post</button>
                </form>
                
                <div>
                    <label for="categoryFilter">Filter by Category:</label>
                    <select id="categoryFilter">
                        <option value="">All</option>
                        <option value="Technology">Technology</option>
                        <option value="Science">Science</option>
                        <option value="Art">Art</option>
                        <option value="Music">Music</option>
                        <option value="Sports">Sports</option>
                    </select>
                    <button id="btn-filter">Apply</button>
                    <button id="btn-filter-created">My Posts</button>
                </div>
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

function cleanupEventListeners() {
    for (const [element, listeners] of activeListeners.entries()) {
        for (const { event, handler } of listeners) {
            element.removeEventListener(event, handler);
        }
    }
    activeListeners.clear();
}

function addTrackedEventListener(element, event, handler) {
    if (!element) return;
    
    if (activeListeners.has(element)) {
        const listeners = activeListeners.get(element);
        const existingListener = listeners.find(l => l.event === event);
        if (existingListener) {
            element.removeEventListener(event, existingListener.handler);
            listeners.splice(listeners.indexOf(existingListener), 1);
        }
    }

    element.addEventListener(event, handler);
    
    if (!activeListeners.has(element)) {
        activeListeners.set(element, []);
    }
    activeListeners.get(element).push({ event, handler });
}

export async function ShowSection(sectionId) {
    cleanupEventListeners();
    
    const dynamicContent = document.getElementById("dynamicContent");
    dynamicContent.innerHTML = sectionTemplates[sectionId] || "<p>Section not found.</p>";

    const username = await getCurrentUsername();
    const navElements = {
        navBack: document.getElementById("navBack"),
        navLogout: document.getElementById("navLogout"),
        navLogin: document.getElementById("navLogin"),
        navRegister: document.getElementById("navRegister")
    };

    if (navElements.navBack) {
        navElements.navBack.style.display = ["posts", "comments"].includes(sectionId) ? "block" : "none";
    }
    if (navElements.navLogout) {
        navElements.navLogout.style.display = username ? "block" : "none";
    }
    if (navElements.navLogin) {
        navElements.navLogin.style.display = username ? "none" : "block";
    }
    if (navElements.navRegister) {
        navElements.navRegister.style.display = username ? "none" : "block";
    }

    const eventSetup = {
        register: () => {
            const form = document.getElementById("registerForm");
            addTrackedEventListener(form, "submit", async (e) => {
                e.preventDefault();
                await handleRegister(e);
            });
        },
        login: () => {
            const form = document.getElementById("loginForm");
            addTrackedEventListener(form, "submit", async (e) => {
                e.preventDefault();
                console.log("Login");
                await handleLogin(e);
            });
        },
        posts: () => {
            const createPostForm = document.getElementById("createPostForm");
            const filterBtn = document.getElementById("btn-filter");
            const filterCreatedBtn = document.getElementById("btn-filter-created");
            const sendMessageBtn = document.getElementById("sendMessageButton");

            addTrackedEventListener(createPostForm, "submit", async (e) => {
                e.preventDefault();
                await handleCreatePost(e);
            });
            addTrackedEventListener(filterBtn, "click", FilterByCategory);
            addTrackedEventListener(filterCreatedBtn, "click", FilterByCreatedPosts);
            addTrackedEventListener(sendMessageBtn, "click", sendPrivateMessage);
        },
        comments: () => {
            const form = document.getElementById("createCommentForm");
            addTrackedEventListener(form, "submit", async (e) => {
                e.preventDefault();
                await handleCreateComment(e);
            });
        }
    };
    if (eventSetup[sectionId]) {
        eventSetup[sectionId]();
    }
}

// Add these functions to handle chat UI creation/removal
export function createChatUI() {
    // Create user list container
    const userListContainer = document.createElement('div');
    userListContainer.id = 'userListContainer';
    userListContainer.innerHTML = `
        <h2>Users</h2>
        <ul id="userList"></ul>
    `;

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

    document.body.appendChild(userListContainer);
    document.body.appendChild(messageBox);

    document.getElementById("toggleMessageBox").addEventListener("click", () => {
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

    const messageInput = document.getElementById("messageInput");
    const sendMessageButton = document.getElementById("sendMessageButton");
    sendMessageButton.addEventListener("click", sendPrivateMessage);
}

export function removeChatUI() {
    const userListContainer = document.getElementById('userListContainer');
    const messageBox = document.getElementById('messageBox');
    
    if (userListContainer) {
        userListContainer.remove();
    }
    if (messageBox) {
        messageBox.remove();
    }
}