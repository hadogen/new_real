import  {ShowComments} from  './comments.js';
import {ShowSection} from './ui.js'
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
        console.log("logged out handleCreatePost");
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
                   <h1 id="post-cat">${post.category}</h1>
                    <h2>${post.title}</h2>
                 

                    <p>${post.content}</p>
                    <small>Posted by ${post.username} on ${new Date(post.created_at).toLocaleString()}</small>
                    <button class="show-comments-btn" data-post-id="${post.id}">View Comments</button>
                `;

                postFeed.appendChild(postElement);
            });
            document.querySelectorAll(".show-comments-btn").forEach(button => {
                button.addEventListener("click", () => ShowComments(button.dataset.postId));
            });
            offset += posts.length;
        }
    } catch (error) {
        const messageElement = document.getElementById("message");
        if (messageElement) {
            messageElement.textContent = error.message;
        }
        console.log("logged out LoadPosts");
    } finally {
        isLoading = false;
    }
}









