export async function getCurrentUsername() {
    try {
        const response = await fetch('/current-user');
        if (!response.ok) {
            document.getElementById("message").textContent = response.error;
            return null;
        }
        const data = await response.json();
        if (!data.username) {
            return null;
        }
        return data.username;
    } catch (error) {
        console.error('Error getting current username:', error);
        return null;
    }
} 