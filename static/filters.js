

import { currentUser } from './auth.js';
import { LikePost, DislikePost } from './posts.js'; 
import { ShowComments } from './comments.js';

window.LikePost = LikePost; 
window.DislikePost = DislikePost;
window.ShowComments = ShowComments; 
window.FilterByCategory = FilterByCategory;
window.FilterByCreatedPosts = FilterByCreatedPosts;
window.FilterByLikedPosts  = FilterByLikedPosts;

export async function FilterByCategory() {
    const category = document.getElementById("categoryFilter").value;
    try {
        const response = await fetch(`/posts/category?category=${category}`);
        const posts = await response.json();
        if (!response.ok) {
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
                        <button onclick="LikePost('${post.id}')">Like (${post.likes || 0})</button>
                        <button onclick="DislikePost('${post.id}')">Dislike (${post.dislikes || 0})</button>
                    </div>
                    <button onclick="ShowComments('${post.id}')">View Comments</button>
                </div>
            `).join("");
        } else {
            postFeed.innerHTML = "<p>No posts found.</p>";
        }
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

export async function FilterByCreatedPosts() {
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
            postFeed.innerHTML = posts.map(post => `
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
            `).join("");
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

