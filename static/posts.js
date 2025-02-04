import { currentUser, currentUsername } from './auth.js';

export async function LoadPosts() {
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

export async function LikePost(postId) {
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

export async function DislikePost(postId) {
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