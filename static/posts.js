import {fetchAllUsers} from './websocket.js'
import  {ShowComments} from  './comments.js';
import {ShowSection} from './ui.js'
import { getCurrentUsername } from './utils.js';

window.fetchProtectedResource = fetchProtectedResource;

export async function handleCreatePost() {
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
}

export async function fetchProtectedResource(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            credentials: 'include'
        });
        
        if (response.status === 401) {
            console.log("Unauthorized");
            ShowSection("login");
            document.getElementById("message").textContent = "Please log in";
            return null;
        }
        if (response.status === 204){
            console.log("No content");
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching resource:", error);
    }
}

export async function LoadPosts() {
    try {
        ShowSection("posts")
        const postFeed = document.getElementById("postFeed");

        const posts = await fetchProtectedResource("/posts")

        if (!posts) {
            throw new Error("Failed to load posts");
        }
      
        postFeed.innerHTML = ""; 

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
            setupPostEventListeners();

        } else {
            postFeed.innerHTML = "<p>No posts found.</p>";
        }
        fetchAllUsers()
    } catch (error) {
        const messageElement = document.getElementById("message");
        if (messageElement) {
            messageElement.textContent = error.message;
        }
    }
}

export function setupPostEventListeners() {
    document.querySelectorAll(".like-btn").forEach(button => {
        button.addEventListener("click", async () => {
            await LikePost(button.dataset.postId);
        });
    });

    document.querySelectorAll(".dislike-btn").forEach(button => {
        button.addEventListener("click", async () => {
            await DislikePost(button.dataset.postId);
        });
    });

    document.querySelectorAll(".show-comments-btn").forEach(button => {
        button.addEventListener("click", () => ShowComments(button.dataset.postId));
    });
}

export async function LikePost(postId) {
    try {
        const response = await fetchProtectedResource(`/posts/like?post_id=${postId}`, {
            method: "POST",
        });

        if (!response) {
            throw new Error("Failed to like post");
        }

        const likeButton = document.querySelector(`button.like-btn[data-post-id="${postId}"]`);
        const dislikeButton = document.querySelector(`button.dislike-btn[data-post-id="${postId}"]`);

        let likeCount = parseInt(likeButton.textContent.match(/\d+/)[0]);

        if (response.message.includes("removed")) {
            likeCount--;
        } else {
            likeCount++;
        }

        likeButton.textContent = `Like (${likeCount})`;
        
        document.getElementById("message").textContent = response.message;
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

export async function DislikePost(postId) {
    try {
        const response = await fetchProtectedResource(`/posts/dislike?post_id=${postId}`, {
            method: "POST",
        });

        if (!response) {
            throw new Error("Failed to dislike post");
        }

        const dislikeButton = document.querySelector(`button.dislike-btn[data-post-id="${postId}"]`);

        let dislikeCount = parseInt(dislikeButton.textContent.match(/\d+/)[0]);

        if (response.message.includes("removed")) {
            dislikeCount--;
        } else {
            dislikeCount++;
        }

        dislikeButton.textContent = `Dislike (${dislikeCount})`;

        document.getElementById("message").textContent = response.message;
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}




