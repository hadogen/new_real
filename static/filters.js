import { ShowComments } from './comments.js';
import { setupPostEventListeners } from './posts.js';
import {username} from './app.js';


export async function FilterByCategory() {
    const category = document.getElementById("categoryFilter").value;
    try {
        const response = await fetch(`/posts/category?category=${category}`, {
            method: "GET"
        });
        const posts = await response.json();
        if (!response.ok) {
            if (response.status===401){
                logout();
                console.log("logged out FilterByCategory");
                throw new Error("Not auth");
            }
            throw new Error(posts.error);
        }

        const postFeed = document.getElementById("postFeed");
        postFeed.innerHTML = ""
        if (Array.isArray(posts) && posts.length > 0) {
            postFeed.innerHTML = posts.map(post => `
                <div class="post">
                    <h3>${post.title}</h3>
                    <p>${post.content}</p>
                    <small>Posted by ${post.username} on ${new Date(post.created_at).toLocaleString()}</small>
                    <button class="show-comments-btn" data-post-id="${post.id}">View Comments</button>
                </div>
            `).join("");
            setupPostEventListeners();
            document.getElementById("message").textContent = "Filtered by category successfully!";
        } else {
            postFeed.innerHTML = "<p>No posts found.</p>";
        }
    } catch (error) {
        document.getElementById("message").textContent = error.message;
        console.log("logged out FilterByCategory");
    }
}

export async function FilterByCreatedPosts() {
    // need to logout here
    if (!username) {
        document.getElementById("message").textContent = "You must be logged in to view your posts.";
        return;
    }

    try {
        const response = await fetch(`/posts/created?username=${username}`,{
            method: "GET"
        });

        if (!response.ok){
            if (response.status===401){
                logout();
                console.log("logged out FilterByCreatedPosts");
                throw new Error("Not auth");
            }
        }
        const posts = await response.json()

        const postFeed = document.getElementById("postFeed");
        if (Array.isArray(posts) && posts.length > 0) {
            postFeed.innerHTML = posts.map(post => `
                <div class="post">
                    <h3>${post.title}</h3>
                    <p>${post.content}</p>
                    <small>Posted by ${post.username} on ${new Date(post.created_at).toLocaleString()}</small>
                    <button class="show-comments-btn" data-post-id="${post.id}">View Comments</button>
                </div>
            `).join("");
            setupPostEventListeners();
        } else {
            postFeed.innerHTML = "<p>No posts found.</p>";
        }
    } catch (error) {
        document.getElementById("message").textContent = error.message;
        console.log("logged out FilterByCreatedPosts");
    }
}

// export async function FilterByLikedPosts() {
//     const username = await getCurrentUsername();
//     if (!username) {
//         document.getElementById("message").textContent = "You must be logged in to view liked posts.";
//         return;
//     }

//     try {
//         const posts = await fetchProtectedResource(`/posts/liked?username=${username}`, {
//             method : "GET"
//         });
//         if (!posts) {
//             throw new Error("Failed to fetch posts");
//         }

//         const postFeed = document.getElementById("postFeed");
//         if (Array.isArray(posts) && posts.length > 0) {
//             postFeed.innerHTML = posts.map(post => `
//                 <div class="post">
//                     <h3>${post.title}</h3>
//                     <p>${post.content}</p>
//                     <small>Posted by ${post.username} on ${new Date(post.created_at).toLocaleString()}</small>
//                     <div>
//                         <button class="like-btn" data-post-id="${post.id}">Like (${post.likes || 0})</button>
//                         <button class="dislike-btn" data-post-id="${post.id}">Dislike (${post.dislikes || 0})</button>
//                     </div>
//                     <button class="show-comments-btn" data-post-id="${post.id}">View Comments</button>
//                 </div>
//             `).join("");
//             setupPostEventListeners();
//         } else {
//             postFeed.innerHTML = "<p>No posts found.</p>";
//         }
//     } catch (error) {
//         document.getElementById("message").textContent = error.message;
//     }
// }

