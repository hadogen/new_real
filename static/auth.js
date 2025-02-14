import { ShowSection } from "./ui.js";
import { ConnectWebSocket, fetchActiveUsers } from "./websocket.js";

let currentUser = null;
let currentUsername = null;



function setCurrentUser(userId) {
    currentUser = userId;
}

function setCurrentUsername(username) {
    currentUsername = username;
}

export { currentUser, currentUsername, setCurrentUser, setCurrentUsername };
