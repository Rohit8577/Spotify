document.addEventListener('DOMContentLoaded', function() {
    // Placeholder data, now with listening hours
    const userData = {
        username: 'Spotify User',
        profilePic: 'https://via.placeholder.com/150/1DB954/FFFFFF?Text=S',
        playlists: [
            'My Awesome Mix',
            'Chill Vibes',
            'Workout Beats',
            'Indie Discovery'
        ],
        followers: 123,
        following: 45,
        hoursOfListening: 1245 // New data point
    };

    function updateProfileDisplay() {
        document.getElementById('username').textContent = userData.username;
        document.getElementById('profile-pic').src = userData.profilePic;
        document.getElementById('playlist-count').textContent = userData.playlists.length;
        document.getElementById('followers-count').textContent = userData.followers;
        document.getElementById('following-count').textContent = userData.following;
        document.getElementById('listening-hours').textContent = userData.hoursOfListening; // Update hours
    }

    // Populate playlists
    const playlistList = document.getElementById('playlist-list');
    userData.playlists.forEach(playlistName => {
        const listItem = document.createElement('li');
        listItem.textContent = playlistName;
        playlistList.appendChild(listItem);
    });

    // Initial profile load
    updateProfileDisplay();

    // --- Modal Logic ---
    const modal = document.getElementById('edit-profile-modal');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const closeBtn = document.querySelector('.close-btn');
    const editForm = document.getElementById('edit-profile-form');

    // Open the modal
    editProfileBtn.addEventListener('click', () => {
        // Pre-fill the form with the current username
        document.getElementById('new-username').value = userData.username;
        modal.style.display = 'block';
    });

    // Function to close the modal
    function closeModal() {
        modal.style.display = 'none';
        // Clear password fields for security
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
    }

    // Close the modal via the 'x' button
    closeBtn.addEventListener('click', closeModal);

    // Close the modal if the user clicks outside of it
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            closeModal();
        }
    });

    // Handle form submission for changing name and password
    editForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevents the form from reloading the page

        // Update username
        const newUsername = document.getElementById('new-username').value.trim();
        if (newUsername && newUsername !== userData.username) {
            userData.username = newUsername;
            updateProfileDisplay();
            alert('Username updated successfully!');
        }

        // Simulate password change
        const newPassword = document.getElementById('new-password').value;
        if (newPassword) {
            // In a real application, you would add validation and call an API
            alert('Password change is simulated. In a real app, it would be securely updated.');
        }

        closeModal();
    });

    // Event listener for the "View Playlists" button
    document.getElementById('view-playlists-btn').addEventListener('click', () => {
        document.querySelector('.playlists-section').scrollIntoView({ behavior: 'smooth' });
    });
});
