import  {ShowComments} from  './comments.js';
import {ShowSection} from './ui.js'
import {logout} from './auth.js'

let offset = 0;
let hasMore = true;


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

        if (!hasMore) return;


        const response = await fetch(`/posts?offset=${offset}` , {
            method: "GET",
        }
        );

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
                button?.addEventListener("click", () => ShowComments(button.dataset.postId));
            });
            offset += posts.length;
        }
    } catch (error) {
        const messageElement = document.getElementById("message");
        messageElement.textContent = error.message;
    } 
}


let lastScrollTime = 0;

const handleScroll = () => {
    const currentTime = Date.now();
    
    if (currentTime - lastScrollTime > 500) {
        lastScrollTime = currentTime;
        
        const scrollPosition = window.innerHeight + window.scrollY;
        const bodyHeight = document.body.offsetHeight;

        if (scrollPosition >= bodyHeight - 1000) {
            LoadPosts(false);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('scroll', handleScroll);
});

