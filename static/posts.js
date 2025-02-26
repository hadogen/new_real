import {fetchAllUsers} from './websocket.js'
import  {ShowComments} from  './comments.js';
import {ShowSection} from './ui.js'
import { getCurrentUsername } from './utils.js';
import {logout} from './auth.js'

let isLoading = false;
let offset = 0;
let hasMore = true;
let throttleTimer;


export async function handleCreatePost() {
    const post = {
        title: document.getElementById("postTitle").value,
        content: document.getElementById("postContent").value,
        category: document.getElementById("postCategory").value,
    };

    try {
        const response = await fetch("/posts/create", {
            method: "POST",
            body: JSON.stringify(post),
        });

        if (!response.ok) {
            if(response.status===401){
                logout();
                throw new Error("not auth")
            }
            throw new Error("Failed to create post");
        }

        document.getElementById("message").textContent = "Post created successfully!";
        document.getElementById("createPostForm").reset();
        await LoadPosts(); 
    } catch (error) {
        document.getElementById("message").textContent = error.message;
    }
}


export async function LoadPosts(isInitial = true) {
    try {
        if (isInitial) {
            await ShowSection("posts");
            offset = 0;
            hasMore = true;
            const postFeed = document.getElementById("postFeed");
            postFeed.innerHTML = "";
        }

        if (!hasMore || isLoading) return;

        isLoading = true;
        const loadingIndicator = document.createElement("div");
        loadingIndicator.className = "loading";
        loadingIndicator.textContent = "Loading posts...";
        document.getElementById("postFeed").appendChild(loadingIndicator);

        const response = await fetch(`/posts?offset=${offset}` , {
            method: "GET",
        }
        );

        loadingIndicator.remove();
        const posts = await response.json();
        if (!response.ok) {
            if (response.status===401){
                logout();
                throw new Error("Not auth");
            }
            throw new Error(response.error);
        }

        const postFeed = document.getElementById("postFeed");

        if (Array.isArray(posts)) {
            if (posts.length < 10) {
                hasMore = false;
            }

            posts.forEach(post => {
                const postElement = document.createElement("div");
                postElement.classList.add("post");
                postElement.innerHTML = `
                    <h3>${post.title}</h3>
                    <p>${post.content}</p>
                    <small>Posted by ${post.username} on ${new Date(post.created_at).toLocaleString()}</small>

                    <button class="show-comments-btn" data-post-id="${post.id}">View Comments</button>
                `;

                postFeed.appendChild(postElement);
            });
            setupPostEventListeners();
            offset += posts.length;
        }
    } catch (error) {
        const messageElement = document.getElementById("message");
        if (messageElement) {
            messageElement.textContent = error.message;
        }
    } finally {
        isLoading = false;
    }
}

export function setupPostEventListeners() {
    // document.querySelectorAll(".like-btn").forEach(button => {
    //     button.addEventListener("click", async () => {
    //         await LikePost(button.dataset.postId);
    //     });
    // });

    // document.querySelectorAll(".dislike-btn").forEach(button => {
    //     button.addEventListener("click", async () => {
    //         await DislikePost(button.dataset.postId);
    //     });
    // });

    document.querySelectorAll(".show-comments-btn").forEach(button => {
        button.addEventListener("click", () => ShowComments(button.dataset.postId));
    });
}

// export async function LikePost(postId) {
//     try {
//         const response = await fetchProtectedResource(`/posts/like?post_id=${postId}`, {
//             method: "POST",
//         });

//         if (!response) {
//             throw new Error("Failed to like post");
//         }

//         const likeButton = document.querySelector(`button.like-btn[data-post-id="${postId}"]`);
//         const dislikeButton = document.querySelector(`button.dislike-btn[data-post-id="${postId}"]`);

//         let likeCount = parseInt(likeButton.textContent.match(/\d+/)[0]);

//         if (response.message.includes("removed")) {
//             likeCount--;
//         } else {
//             likeCount++;
//         }

//         likeButton.textContent = `Like (${likeCount})`;
    
//     } catch (error) {
//         document.getElementById("message").textContent = error.message;
//     }
// }

// export async function DislikePost(postId) {
//     try {
//         const response = await fetchProtectedResource(`/posts/dislike?post_id=${postId}`, {
//             method: "POST",
//         });

//         if (!response) {
//             throw new Error("Failed to dislike post");
//         }

//         const dislikeButton = document.querySelector(`button.dislike-btn[data-post-id="${postId}"]`);

//         let dislikeCount = parseInt(dislikeButton.textContent.match(/\d+/)[0]);

//         if (response.message.includes("removed")) {
//             dislikeCount--;
//         } else {
//             dislikeCount++;
//         }

//         dislikeButton.textContent = `Dislike (${dislikeCount})`;

//     } catch (error) {
//         document.getElementById("message").textContent = error.message;
//     }
// }

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

const handleScroll = throttle(() => {
    const scrollPosition = window.innerHeight + window.scrollY;
    const bodyHeight = document.body.offsetHeight;
    
    if (scrollPosition >= bodyHeight - 1000) {
        LoadPosts(false);
    }
}, 500);
document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('scroll', handleScroll);
});




