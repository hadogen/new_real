import { ShowSection  } from './ui.js';
import { ConnectWebSocket as connectWebSocketImpl } from './websocket.js';
import { fetchActiveUsers as fetchActiveUsersImpl } from './websocket.js';

window.ShowSection = ShowSection;
window.ConnectWebSocket = connectWebSocketImpl;
window.fetchActiveUsers = fetchActiveUsersImpl;

 console.log("app.js loaded");

import './posts.js';
import './comments.js';
import './filters.js';

