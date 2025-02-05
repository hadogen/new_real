import { currentUsername } from './auth.js';
import { LoadPosts } from './posts.js';

export function ShowSection(sectionId) {
    if (!currentUsername && sectionId !== "login" && sectionId !== "register") {
        alert("You must be logged in to access this section.");
        ShowSection("login");
        return;
    }

    document.querySelectorAll(".section").forEach((section) => {
        section.classList.remove("active");
    });

    document.getElementById(sectionId).classList.add("active");

}

ShowSection("register");