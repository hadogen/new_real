export async function getCurrentUsername() {
    try {
        const response = await fetch('/current-user');
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        return data.username;
    } catch (error) {
        console.error('Error getting current username:', error);
        return null;
    }
} 