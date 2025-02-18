import { ShowSection } from './ui.js';
import { LoadPosts } from './posts.js';
import {logout} from './auth.js'

document.addEventListener("DOMContentLoaded", () => {
    console.log("App initialized");
    ShowSection("login");

    document.getElementById("navRegister").addEventListener("click", () => ShowSection("register"));
    document.getElementById("navLogin").addEventListener("click", () => ShowSection("login"));
    document.getElementById("navBack").addEventListener("click", () => LoadPosts());
    document.getElementById("navLogout").addEventListener("click", () => logout());

});
