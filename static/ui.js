
import { handleCreateComment} from './comments.js'
import { handleCreatePost} from './posts.js'
import {currentUsername, currentUser, setCurrentUser, setCurrentUsername, handleLogin, handleRegister} from './auth.js'
import {FilterByCategory, FilterByCreatedPosts, FilterByLikedPosts} from './filters.js'
import { sendPrivateMessage} from './websocket.js'


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
    posts:  `
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
                    <!-- Add more categories as needed -->
                </select>
                <button id="btn-filter">Apply</button>
                <button id="btn-filter-created">My Posts</button>
                <button id="btn-filter-liked">Liked Posts</button>
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
    `,
};





export function ShowSection(sectionId) {
    const dynamicContent = document.getElementById("dynamicContent");
    dynamicContent.innerHTML = sectionTemplates[sectionId] || "<p>Section not found.</p>";

    const navBack = document.getElementById("navBack");
    const navLogout = document.getElementById("navLogout");
    const navLogin = document.getElementById("navLogin");
    
    if (navBack) navBack.style.display = ["posts", "comments"].includes(sectionId) ? "block" : "none";
    if (navLogout) navLogout.style.display = currentUsername ? "block" : "none";
    if (navLogin) navLogin.style.display = currentUsername ? "none" : "block";

    setupEventListeners(sectionId);
}

function setupEventListeners(sectionId) {
    // Register form
    const registerForm = document.getElementById("registerForm");
    if (sectionId === "register" && registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await handleRegister(e);
        });
    }

    // Login form
    const loginForm = document.getElementById("loginForm");
    if (sectionId === "login" && loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await handleLogin(e);
        });
    }

    // Create post form
    const createPostForm = document.getElementById("createPostForm");
    const filter = document.getElementById("btn-filter")
    const filterLiked = document.getElementById("btn-filter-liked")
    const filterCreated = document.getElementById("btn-filter-created")
    if (sectionId === "posts" && createPostForm) {
        createPostForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await handleCreatePost(e);
        });
        filter.addEventListener("click", async ()=>{
            await FilterByCategory()
        } )
        filterLiked.addEventListener("click", async ()=>{
            await FilterByLikedPosts()
        } )
        filterCreated.addEventListener("click", async ()=>{
            await FilterByCreatedPosts()
        } )
        document.getElementById("sendMessageButton").addEventListener("click",  ()=>{
            sendPrivateMessage();
        })
    }

    // Create comment form
    const createCommentForm = document.getElementById("createCommentForm");
    if (sectionId === "comments" && createCommentForm) {
        createCommentForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await handleCreateComment(e);
        });
    }
}




