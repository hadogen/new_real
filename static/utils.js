import { logout } from './auth.js';
export async function getCurrentUsername() {
    try {
        const response = await fetch('/current-user');

    } catch (error) {
        console.log('Error getting current username:', error.message);
        return null;
    }
} 