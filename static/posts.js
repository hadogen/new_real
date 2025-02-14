import { currentUser, currentUsername } from './auth.js';
import {fetchActiveUsers} from './websocket.js'
import  {ShowComments} from  './comments.js';
import {ShowSection} from './ui.js'

window.fetchProtectedResource = fetchProtectedResource;
async function fetchProtectedResource(url, options = {}) {
    try {
        const response = await fetch(url, options);
        
        if (response.status === 401) {
            ShowSection("login");
            document.getElementById("currentUser").textContent = "";
            document.getElementById("message").textContent = "Please log in";
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching resource:", error);
    }
}

export async function LoadPosts() {
    try {
        const posts = await fetchProtectedResource("/posts", {
            headers: {
                "User-ID": currentUser,
                "Username": currentUsername,
            },
        });

        if (!posts) {
            throw new Error("Failed to load posts");
        }

        const postFeed = document.getElementById("postFeed");
        // postFeed.innerHTML = "";


        if (Array.isArray(posts) && posts.length > 0) {
            posts.forEach(post => {
                const postElement = document.createElement("div");
                postElement.classList.add("post");

                postElement.innerHTML = `
                    <h3>${post.title}</h3>
                    <p>${post.content}</p>
                    <small>Posted by ${post.username} on ${new Date(post.created_at).toLocaleString()}</small>
                    <div>
                        <button class="like-btn" data-post-id="${post.id}">Like (${post.likes || 0})</button>
                        <button class="dislike-btn" data-post-id="${post.id}">Dislike (${post.dislikes || 0})</button>
                    </div>
                    <button class="show-comments-btn" data-post-id="${post.id}">View Comments</button>
                `;

                postFeed.appendChild(postElement);
            });

            // Add event listeners for like, dislike, and comments
            document.querySelectorAll(".like-btn").forEach(button => {
                button.addEventListener("click", () => LikePost(button.dataset.postId));
            });

            document.querySelectorAll(".dislike-btn").forEach(button => {
                button.addEventListener("click", () => DislikePost(button.dataset.postId));
            });

            document.querySelectorAll(".show-comments-btn").forEach(button => {
                button.addEventListener("click", () => ShowComments(button.dataset.postId));
            });

            // fetchActiveUsers();
            ShowSection("posts");
            console.log("Posts loaded");
        } else {
            postFeed.innerHTML = "<p>No posts found.</p>";
            fetchActiveUsers();
        }
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}


export async function LikePost(postId) {
    try {
        const response = await fetchProtectedResource(`/posts/like?post_id=${postId}`, {
            method: "POST",
            headers: {
                "User-ID": currentUser,
            },
        });

        if (!response) {
            throw new Error(response.error || "Failed to like post");
        }

        document.getElementById("message").textContent = response.message || "Post liked successfully!";
        LoadPosts(); 
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

export async function DislikePost(postId) {
    try {
        const response = await fetchProtectedResource(`/posts/dislike?post_id=${postId}`, {
            method: "POST",
            headers: {
                "User-ID": currentUser,
            },
        });

        if (!response) {
            throw new Error(response.error || "Failed to dislike post");
        }

        document.getElementById("message").textContent = response.message || "Post disliked successfully!";
        LoadPosts(); 
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}




window.LoadPosts = LoadPosts;
