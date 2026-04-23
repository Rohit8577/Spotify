export async function logBehavior({
    type,
    source = "unknown",
    song = {}
}) {
    const payload = { type, song };

    try {
        await fetch("/log-interaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.log("Tracking Error (Ignored)");
    }
}
