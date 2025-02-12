import { currentUsername } from './auth.js';
import { LoadPosts } from './posts.js';


export function ShowSection(sectionId) {
    const section = document.getElementById(sectionId);
    const chat = document.getElementById("messageBox")
    if (!section) return; 
    console.log("Showing section:", sectionId);
    if (!currentUsername && sectionId !== "login" && sectionId !== "register") {
        document.getElementById("message").textContent = "You must be logged in to access this section.";
        ShowSection("login");
        return;
    }

    document.querySelectorAll(".section").forEach((section) => {
        section.classList.remove("active");
    });
    section.classList.add("active");
    if (sectionId!== "login" && sectionId!=="register")
    {
        chat.classList.add("active")
    }
}

