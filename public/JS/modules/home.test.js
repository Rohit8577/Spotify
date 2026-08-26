import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAlbumDetails } from './home.js';

// Mock dependencies
vi.mock('./navigation.js', () => ({ navigateTo: vi.fn() }));
vi.mock('./search.js', () => ({ addToRecentActivity: vi.fn() }));
vi.mock('./favorites.js', () => ({ addFavorite: vi.fn(), addSearchSongFavorite: vi.fn() }));
vi.mock('./playlist.js', () => ({ toggleDropdown: vi.fn(), songToggleDropdown: vi.fn(), updateInitialPlaylist: vi.fn(), addToPlaylist: vi.fn(), playPlaylistSongs: vi.fn() }));
vi.mock('./player.js', () => ({ playsong: vi.fn(), fetchSongs: vi.fn() }));
vi.mock('./utils.js', () => ({ highlight: vi.fn(), formatTime: vi.fn(), logBehavior: vi.fn(), popupAlert: vi.fn() }));
vi.mock('./state.js', () => ({ default: { globalAlbumId: null, globalLibrary: null, currentSong: null } }));

describe('getAlbumDetails', () => {
  let mainHomePageMock;
  const mockAlbumId = 'album123';
  
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `<div id="MainHomePage-2" class="hidden"></div>`;
    mainHomePageMock = document.getElementById('MainHomePage-2');
    global.fetch = vi.fn();
  });
  
  afterEach(() => { vi.restoreAllMocks(); });
  
  it('should navigate to album view if isBack is false', async () => {
    global.fetch.mockResolvedValue({ json: vi.fn().mockResolvedValue(null) });
    await getAlbumDetails(mockAlbumId, false);
    const { navigateTo } = await import('./navigation.js');
    expect(navigateTo).toHaveBeenCalledWith({ view: 'MainHomePage-2', type: 'album', id: mockAlbumId });
  });

  it('should NOT navigate to album view if isBack is true', async () => {
    global.fetch.mockResolvedValue({ json: vi.fn().mockResolvedValue(null) });
    await getAlbumDetails(mockAlbumId, true);
    const { navigateTo } = await import('./navigation.js');
    expect(navigateTo).not.toHaveBeenCalled();
  });
  
  it('should show loading indicator and remove hidden class', async () => {
    let resolveFetch;
    const fetchPromise = new Promise(resolve => { resolveFetch = resolve; });
    global.fetch.mockReturnValue(fetchPromise);
    
    const promise = getAlbumDetails(mockAlbumId, true);
    await new Promise(r => setTimeout(r, 0));
    
    expect(mainHomePageMock.classList.contains('hidden')).toBe(false);
    expect(mainHomePageMock.innerHTML).toContain('Loading Album Details...');
    
    resolveFetch({ json: vi.fn().mockResolvedValue(null) });
    await promise;
  });

  it('should render album details and setup event listeners when fetch is successful', async () => {
    const mockAlbumData = {
      data: { data: {
        name: 'Test Album', year: '2023', song_count: 1,
        artist_map: { artists: [{ name: 'Test Artist' }] },
        image: [{}, {}, { link: 'album-image-link' }],
        songs: [{
          id: 'song1', name: 'Test Song', duration: 200,
          artist_map: { artists: [{ name: 'Test Artist' }] },
          image: [{}, {}, { link: 'song-image-link' }],
          download_url: [{}, {}, {}, {}, { link: 'song-dl-link' }]
        }]
      }}
    };
    const mockFavData = { arr: [{ songId: 'song1' }] };
    
    global.fetch
      .mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(mockAlbumData) }) 
      .mockResolvedValueOnce({ json: vi.fn().mockResolvedValue(mockFavData) }); 
      
    await getAlbumDetails(mockAlbumId, true);
    
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(1, `/search?type=albumID&query=${mockAlbumId}`);
    expect(global.fetch).toHaveBeenNthCalledWith(2, "/get-favorite");
    
    const { addToRecentActivity } = await import('./search.js');
    expect(addToRecentActivity).toHaveBeenCalledWith({
      type: "album",
      id: mockAlbumId,
      name: 'Test Album',
      image: 'album-image-link',
      artist: 'Test Artist'
    });
    
    expect(mainHomePageMock.innerHTML).toContain('Test Album');
    expect(mainHomePageMock.innerHTML).toContain('Test Artist • 2023');
    expect(mainHomePageMock.innerHTML).toContain('1 songs');
    expect(mainHomePageMock.innerHTML).toContain('Test Song');
    
    const heartIcon = mainHomePageMock.querySelector('.bxs-heart');
    expect(heartIcon.className).toContain('text-danger');
    
    const playAllBtn = document.getElementById('playAllAlbumBtn');
    playAllBtn.click();
    
    const { playsong } = await import('./player.js');
    expect(playsong).toHaveBeenCalledWith(
      'song-image-link', 'Test Song', 'Test Artist', 'song1', 'song-dl-link', 200, 'album'
    );
    
    const songPlayInfo = mainHomePageMock.querySelector('[data-play]');
    songPlayInfo.click();
    expect(playsong).toHaveBeenCalledTimes(2);
    
    const { addFavorite } = await import('./favorites.js');
    heartIcon.click();
    expect(addFavorite).toHaveBeenCalled();
    
    const { toggleDropdown } = await import('./playlist.js');
    const dropdownBtn = mainHomePageMock.querySelector('[data-dropdown]');
    dropdownBtn.click();
    expect(toggleDropdown).toHaveBeenCalled();
  });
  
  it('should show error placeholder when fetch fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockRejectedValue(new Error('Network error'));
    
    await getAlbumDetails(mockAlbumId, true);
    
    expect(consoleSpy).toHaveBeenCalledWith("Album fetch error:", expect.any(Error));
    expect(mainHomePageMock.innerHTML).toContain('Error fetching album details.');
  });
});
