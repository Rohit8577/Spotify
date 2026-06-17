document.addEventListener('DOMContentLoaded', function() {
    // Fetch real user data from server
    let userData = {
        username: 'Loading...',
        profilePic: 'https://cdn-icons-png.flaticon.com/512/847/847969.png',
        playlists: [],
        followers: 0,
        following: 0,
        hoursOfListening: 0
    };

    async function loadUserProfile() {
        try {
            const res = await fetch('/userprofile');
            const data = await res.json();
            userData.username = data.name || 'SangeetX User';
            userData.profilePic = data.profilePic || 'https://cdn-icons-png.flaticon.com/512/847/847969.png';
            userData.playlists = (data.lib || []).map(p => p.name);
            userData.following = (data.artist || []).length;
        } catch (e) {
            console.warn('Could not load profile data');
        }
        updateProfileDisplay();
        populatePlaylists();
    }

    function updateProfileDisplay() {
        document.getElementById('username').textContent = userData.username;
        document.getElementById('profile-pic').src = userData.profilePic;
        document.getElementById('playlist-count').textContent = userData.playlists.length;
        document.getElementById('followers-count').textContent = userData.followers;
        document.getElementById('following-count').textContent = userData.following;
        document.getElementById('listening-hours').textContent = userData.hoursOfListening;
    }

    function populatePlaylists() {
        const playlistList = document.getElementById('playlist-list');
        playlistList.innerHTML = '';
        userData.playlists.forEach(playlistName => {
            const listItem = document.createElement('li');
            listItem.textContent = playlistName;
            playlistList.appendChild(listItem);
        });
    }

    // Load profile
    loadUserProfile();

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
