import { ShowSection } from './ui.js';
import { logout } from './auth.js';

export function ShowComments(postId) {
    ShowSection("comments");
    document.getElementById("commentPostId").value = postId;
    LoadComments(postId);
}

export async function handleCreateComment() {
    const comment = {
        post_id: document.getElementById("commentPostId").value,
        content: document.getElementById("commentContent").value,
    };

    try {
        const response = await fetch("/comments/create", {
            method: "POST",
            body: JSON.stringify(comment),
        });
        const result = await response.json()
        if (!response.ok){
            if (result.status === 401) {
                logout();
                return;
            }
            throw new Error("Failed to create comment");
        }

        document.getElementById("message").textContent = "Comment created successfully!";
        document.getElementById("createCommentForm").reset();
        LoadComments(comment.post_id); 
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

export async function LoadComments(postId) {
    try {
        const response = await fetch(`/comments?post_id=${postId}`);

        if (!response.ok){
            if (response.status === 401) {
                logout();
                return;
            }
            throw new Error("Failed to load comments");
        }
        const comments = await response.json();

        const commentFeed = document.getElementById("commentFeed");
        commentFeed.innerHTML = ""; 

        if (Array.isArray(comments) && comments.length > 0) {
            comments.forEach(comment => {
                const commentElement = document.createElement("div");
                commentElement.classList.add("comment");

                commentElement.innerHTML = `
                    <p>${comment.content}</p>
                    <small>Posted by ${comment.username} on ${new Date(comment.created_at).toLocaleString()}</small>
                `;

                commentFeed.appendChild(commentElement);

            });
        } else {
            commentFeed.innerHTML = "<p>No comments found.</p>";
        }
        document.getElementById("message").textContent = "comments loaded"
    } catch (error) {
        document.getElementById("message").textContent = error.message + "in load comments!!!!!!!!!!";
    }
}
