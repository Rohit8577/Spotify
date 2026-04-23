export function initAiSearchMode({ getIsAiMode, setIsAiMode }) {
    const searchInput = document.getElementById("searchPageInput");
    const searchWrapper = document.getElementById("searchWrapper");
    const aiButton = document.getElementById("aiToggleBtn");

    if (!searchInput || !searchWrapper || !aiButton) return;

    aiButton.addEventListener("click", () => {
        const nextValue = !getIsAiMode();
        setIsAiMode(nextValue);

        if (nextValue) {
            searchWrapper.classList.add("ai-glow-mode");
            searchWrapper.classList.remove("normal-focus-mode");
            aiButton.classList.add("ai-icon-active");
            searchInput.placeholder = "Describe a vibe (e.g. Gym motivation)...";
            searchInput.focus();
            return;
        }

        searchWrapper.classList.remove("ai-glow-mode");
        aiButton.classList.remove("ai-icon-active");
        searchInput.placeholder = "Search for Artists or Albums...";

        if (document.activeElement === searchInput) {
            searchWrapper.classList.add("normal-focus-mode");
        }
    });

    searchInput.addEventListener("focus", () => {
        if (!getIsAiMode()) {
            searchWrapper.classList.add("normal-focus-mode");
        }
    });

    searchInput.addEventListener("blur", () => {
        searchWrapper.classList.remove("normal-focus-mode");
    });
}
