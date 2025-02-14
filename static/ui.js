import { currentUsername } from './auth.js';
import { LoadPosts } from './posts.js';

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

    // Update navigation visibility
    document.getElementById("navBack").style.display = ["posts", "comments"].includes(sectionId) ? "block" : "none";
    document.getElementById("navLogout").style.display = currentUsername ? "block" : "none";
    document.getElementById("navLogin").style.display = currentUsername ? "none" : "block";
}