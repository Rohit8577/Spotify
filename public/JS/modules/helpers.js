export function debounce(func, delay) {
    let timer;

    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

export function formatTime(seconds) {
    const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
    const min = Math.floor(safeSeconds / 60);
    const sec = Math.floor(safeSeconds % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function escapeHtml(value) {
    if (!value) return "";

    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}
