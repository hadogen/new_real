export async function getCurrentUsername() {
    try {
        const response = await fetch('/current-user');
        if (!response.ok) {
            if(response.status===401){
                logout();
                throw new Error("Not auth")
            }
            throw new Error(response.error);}
        const data = await response.json();
        if (!data.username) {
            return null;
        }
        return data.username;
    } catch (error) {
        console.error('Error getting current username:', error.message);
        return null;
    }
} 