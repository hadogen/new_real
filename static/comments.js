import { currentUser, currentUsername } from './auth.js';


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
