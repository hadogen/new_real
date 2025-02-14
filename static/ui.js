import { LoadPosts} from './posts.js';
import {LoadComments} from './comments.js'
import {currentUsername, currentUser, setCurrentUser, setCurrentUsername} from './auth.js'


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

    // if (sectionId === "posts" && document.getElementById("createPostForm")) {
    //     document.getElementById("createPostForm").addEventListener("submit", async (e) => {
    //         e.preventDefault();
    //         await handleCreatePost();
    //     });
    // }

    // if (sectionId === "comments" && document.getElementById("createCommentForm")) {
    //     document.getElementById("createCommentForm").addEventListener("submit", async (e) => {
    //         e.preventDefault();
    //         await handleCreateComment();
    //     });
    // }
    if (sectionId==="register" ){
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
    }
    
    // document.getElementById("logoutButton").addEventListener("click", async () => {
    //     try {
    //         const response = await fetch("/logout", { method: "POST" });
    
    //         if (!response.ok) {
    //             throw new Error("Failed to logout");
    //         }
    
    //         currentUser = null;
    //         currentUsername = null;
    //         document.getElementById("currentUser").textContent = "";
    //         ShowSection("login");
    //         logoutButton.style.display = "none";
    //         if (window.ws) {
    //             window.ws.close();
    //         }
    
    //     } catch (error) {
    //         console.error("Logout error:", error.message);
    //     }
    // });
    if (sectionId ==="login"){

    document.getElementById("loginForm").addEventListener("submit", async (e) => {
        e.preventDefault();
    
        const credentials = {
            login: document.getElementById("loginId").value,
            password: document.getElementById("loginPassword").value,
        };
        console.log(credentials)
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
    
            setCurrentUser(result.user_id);
            setCurrentUsername(result.username);
            document.getElementById("message").textContent = result.message || "Login successful!";
            LoadPosts()
            ShowSection("posts");
            document.getElementById("currentUser").textContent = currentUsername;
            ConnectWebSocket();
            fetchActiveUsers();
            logoutButton.style.display = "block"; 
        } catch (error) {
            document.getElementById("message").textContent = error.message;
        }
    });
}

if (sectionId ==="posts"){
    document.getElementById("createPostForm").addEventListener("submit", async (e) => {
        e.preventDefault(); 
    
        const post = {
            title: document.getElementById("postTitle").value,
            content: document.getElementById("postContent").value,
            category: document.getElementById("postCategory").value,
        };
    
        try {
            const response = await fetchProtectedResource("/posts/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-ID": currentUser,
                    "Username": currentUsername,
                },
                body: JSON.stringify(post),
            });
    
            if (!response) {
                throw new Error(response.error || "Failed to create post");
            }
    
            document.getElementById("message").textContent = response.message || "Post created successfully!";
            document.getElementById("createPostForm").reset();
            LoadPosts(); 
        } catch (error) {
            document.getElementById("message").textContent = error.message;
        }
    });
}
if (sectionId ==="comments"){
    document.getElementById("createCommentForm").addEventListener("submit", async (e) => {
        e.preventDefault(); 
    
        const comment = {
            post_id: document.getElementById("commentPostId").value,
            content: document.getElementById("commentContent").value,
        };
    
        try {
            const result = await fetchProtectedResource("/comments/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-ID": currentUser,
                    "Username": currentUsername,
                },
                body: JSON.stringify(comment),
            });
    
            if (!result) {
                throw new Error("Failed to create comment");
            }
    
            document.getElementById("message").textContent = result.message || "Comment created successfully!";
            document.getElementById("createCommentForm").reset();
            LoadComments(comment.post_id); 
        } catch (error) {
            document.getElementById("message").textContent = error.message;
        }
    });
}
    
}