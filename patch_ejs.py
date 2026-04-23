with open('views/spotify.ejs', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the hardcoded request sections in modal with clean empty ones with IDs
old_block = '''        <h3>Search Results</h3>
        <div class="friend-search-result"></div>
        <h3>Friend Requests</h3>
        
        <div class="request-section">
            <h4>Received Requests (3)</h4>
            
            <div class="request-list">
                <div class="request-card">
                    <img src="https://via.placeholder.com/50" alt="User Avatar" class="request-avatar">
                    <div class="request-info">
                        <span class="request-name">TechFreak_01</span>
                        <span class="request-time">5 minutes ago</span>
                    </div>
                    <div class="request-actions">
                        <button class="accept-btn">Accept</button>
                        <button class="reject-btn">Reject</button>
                    </div>
                </div>

                <div class="request-card">
                    <img src="https://via.placeholder.com/50" alt="User Avatar" class="request-avatar">
                    <div class="request-info">
                        <span class="request-name">DJ_Karan</span>
                        <span class="request-time">Yesterday</span>
                    </div>
                    <div class="request-actions">
                        <button class="accept-btn">Accept</button>
                        <button class="reject-btn">Reject</button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="request-section">
            <h4>Sent Requests (2)</h4>
            
            <div class="request-list">
                <div class="request-card sent">
                    <img src="https://via.placeholder.com/50" alt="User Avatar" class="request-avatar">
                    <div class="request-info">
                        <span class="request-name">PlaylistPro</span>
                        <span class="request-time">Pending</span>
                    </div>
                    <div class="request-actions">
                        <button class="cancel-btn">Cancel</button>
                    </div>
                </div>
            </div>
        </div>

        
    </div>
</div>'''

new_block = '''        <h3>Search Results</h3>
        <div class="friend-search-result" id="friend-search-result"></div>
        <h3>Friend Requests</h3>

        <div class="request-section" id="received-requests-section">
            <h4 id="received-requests-count">Received Requests (0)</h4>
            <div class="request-list" id="received-requests-list">
                <p style="color:#9a9a9a; padding:10px">Loading...</p>
            </div>
        </div>

        <div class="request-section" id="sent-requests-section">
            <h4 id="sent-requests-count">Sent Requests (0)</h4>
            <div class="request-list" id="sent-requests-list">
                <p style="color:#9a9a9a; padding:10px">Loading...</p>
            </div>
        </div>

    </div>
</div>'''

if old_block in content:
    content = content.replace(old_block, new_block, 1)
    with open('views/spotify.ejs', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Modal HTML patched! Length:', len(content))
else:
    # Try to find what's there
    idx = content.find('Search Results')
    print('NOT FOUND. Around Search Results:')
    print(repr(content[idx-50:idx+200]))
