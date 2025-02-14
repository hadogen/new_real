import { currentUser, currentUsername } from './auth.js';
import {ShowSection} from './ui.js';
export function ShowComments(postId) {
    ShowSection("comments");
    document.getElementById("commentPostId").value = postId;
    LoadComments(postId);
}
export async function handleCreateComment(){
    
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
}

export async function LoadComments(postId) {
    try {
        const comments = await fetchProtectedResource(`/comments?post_id=${postId}`);
        if (!comments) {
            throw new Error("Failed to load comments");
        }

        const commentFeed = document.getElementById("commentFeed");
        commentFeed.innerHTML = ""; 

        if (Array.isArray(comments) && comments.length > 0) {
            comments.forEach(comment => {
                const commentElement = document.createElement("div");
                commentElement.classList.add("comment");

                commentElement.innerHTML = `
                    <p>${comment.content}</p>
                    <small>Posted by ${comment.username} on ${new Date(comment.created_at).toLocaleString()}</small>
                    <div>
                        <button class="like-comment-btn" data-comment-id="${comment.id}">Like (${comment.likes || 0})</button>
                        <button class="dislike-comment-btn" data-comment-id="${comment.id}">Dislike (${comment.dislikes || 0})</button>
                    </div>
                `;

                commentFeed.appendChild(commentElement);
            });

            document.querySelectorAll(".like-comment-btn").forEach(button => {
                button.addEventListener("click", () => LikeComment(button.dataset.commentId));
            });

            document.querySelectorAll(".dislike-comment-btn").forEach(button => {
                button.addEventListener("click", () => DislikeComment(button.dataset.commentId));
            });

        } else {
            commentFeed.innerHTML = "<p>No comments found.</p>";
        }
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}



export async function LikeComment(commentId) {
    try {
        const result = await fetchProtectedResource(`/comments/like?comment_id=${commentId}`, {
            method: "POST",
            headers: {
                "User-ID": currentUser,
            },
        });

        if (!result) {
            throw new Error("Failed to like comment");
        }

        document.getElementById("message").textContent = result.message || "Comment liked successfully!";
        LoadComments(document.getElementById("commentPostId").value); 
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

export async function DislikeComment(commentId) {
    try {
        const result = await fetchProtectedResource(`/comments/dislike?comment_id=${commentId}`, {
            method: "POST",
            headers: {
                "User-ID": currentUser,
            },
        });

        if (!result) {
            throw new Error("Failed to dislike comment");
        }

        document.getElementById("message").textContent = result.message || "Comment disliked successfully!";
        LoadComments(document.getElementById("commentPostId").value); 
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}

window.LikeComment = LikeComment;
window.DislikeComment = DislikeComment;
