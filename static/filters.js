import { LikePost, DislikePost } from './posts.js'; 
import { ShowComments } from './comments.js';
import { setupPostEventListeners } from './posts.js';
import { getCurrentUsername } from './utils.js';

window.LikePost = LikePost; 
window.DislikePost = DislikePost;
window.ShowComments = ShowComments; 
window.FilterByCategory = FilterByCategory;
window.FilterByCreatedPosts = FilterByCreatedPosts;
window.FilterByLikedPosts  = FilterByLikedPosts;

export async function FilterByCategory() {
    const category = document.getElementById("categoryFilter").value;
    try {
        const posts = await fetchProtectedResource(`/posts/category?category=${category}`);
        if (!posts) {
            throw new Error(posts.error || "Failed to fetch posts");
        }

        const postFeed = document.getElementById("postFeed");
        if (Array.isArray(posts) && posts.length > 0) {
            postFeed.innerHTML = posts.map(post => `
                <div class="post">
                    <h3>${post.title}</h3>
                    <p>${post.content}</p>
                    <small>Posted by ${post.username} on ${new Date(post.created_at).toLocaleString()}</small>
                    <div>
                        <button class="like-btn" data-post-id="${post.id}">Like (${post.likes || 0})</button>
                        <button class="dislike-btn" data-post-id="${post.id}">Dislike (${post.dislikes || 0})</button>
                    </div>
                    <button class="show-comments-btn" data-post-id="${post.id}">View Comments</button>
                </div>
            `).join("");
            setupPostEventListeners();
        } else {
            postFeed.innerHTML = "<p>No posts found.</p>";
        }
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

export async function FilterByCreatedPosts() {
    const username = await getCurrentUsername();
    if (!username) {
        document.getElementById("message").textContent = "You must be logged in to view your posts.";
        return;
    }

    try {
        const posts = await fetchProtectedResource(`/posts/created?username=${username}`);
        if (!posts) {
            throw new Error(posts.error || "Failed to fetch posts");
        }

        const postFeed = document.getElementById("postFeed");
        if (Array.isArray(posts) && posts.length > 0) {
            postFeed.innerHTML = posts.map(post => `
                <div class="post">
                    <h3>${post.title}</h3>
                    <p>${post.content}</p>
                    <small>Posted by ${post.username} on ${new Date(post.created_at).toLocaleString()}</small>
                    <div>
                        <button class="like-btn" data-post-id="${post.id}">Like (${post.likes || 0})</button>
                        <button class="dislike-btn" data-post-id="${post.id}">Dislike (${post.dislikes || 0})</button>
                    </div>
                    <button class="show-comments-btn" data-post-id="${post.id}">View Comments</button>
                </div>
            `).join("");
            setupPostEventListeners();
        } else {
            postFeed.innerHTML = "<p>No posts found.</p>";
        }
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

export async function FilterByLikedPosts() {
    const username = await getCurrentUsername();
    if (!username) {
        document.getElementById("message").textContent = "You must be logged in to view liked posts.";
        return;
    }

    try {
        const posts = await fetchProtectedResource(`/posts/liked?username=${username}`);
        if (!posts) {
            throw new Error(posts.error || "Failed to fetch posts");
        }

        const postFeed = document.getElementById("postFeed");
        if (Array.isArray(posts) && posts.length > 0) {
            postFeed.innerHTML = posts.map(post => `
                <div class="post">
                    <h3>${post.title}</h3>
                    <p>${post.content}</p>
                    <small>Posted by ${post.username} on ${new Date(post.created_at).toLocaleString()}</small>
                    <div>
                        <button class="like-btn" data-post-id="${post.id}">Like (${post.likes || 0})</button>
                        <button class="dislike-btn" data-post-id="${post.id}">Dislike (${post.dislikes || 0})</button>
                    </div>
                    <button class="show-comments-btn" data-post-id="${post.id}">View Comments</button>
                </div>
            `).join("");
            setupPostEventListeners();
        } else {
            postFeed.innerHTML = "<p>No posts found.</p>";
        }
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

