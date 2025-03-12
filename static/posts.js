import  {ShowComments} from  './comments.js';
import {ShowSection} from './ui.js'
import {logout} from './auth.js'

let offset = 0;
let hasMore = true;
let postsArray = [];


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
                await logout();
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
            postsArray = []; 
        }

        if (!hasMore) return;

        const response = await fetch(`/posts?offset=${offset}` , {
            method: "GET",
        });

        const posts = await response.json();
        if (!response.ok) {
            if (response.status===401){
                await logout();
                throw new Error("Not auth");
            }
            throw new Error(response.error);
        }

        postsArray = [...postsArray, ...posts];

        renderPosts();

        if (posts.length < 10) {
            hasMore = false;
        }

        offset += posts.length;
    } catch (error) {
        const messageElement = document.getElementById("message");
        messageElement.textContent = error.message;
    } 
}

function renderPosts() {
    const postFeed = document.getElementById("postFeed");
    postFeed.innerHTML = "";

    postsArray.forEach(post => {
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
}


let lastScrollTime = 0;

export const handleScroll = () => {
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

