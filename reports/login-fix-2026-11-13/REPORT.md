# Login connection repair

The expected local backend port 5000 was serving a separate application, **SikshaSetu**, rather than SangeetX. Its `/health` and `/login` paths returned that application's HTML. No supplied credentials were sent to it during this investigation.

Configured the local SangeetX backend on free port **5001**, started it and confirmed MongoDB connectivity. Added the machine's LAN API URL, `http://192.168.1.12:5001`, to the ignored `mobile/.env.local` file as `EXPO_PUBLIC_API_URL`. The ignored backend `.env` now selects port 5001 and explicitly allows the local Expo web origins. Existing secrets were preserved. Expo was restarted with its cache cleared to load the new environment.

Using the credentials supplied by the user, the correct SangeetX API returned **200 Login successful** and **200** for the matching user's profile. An automated Chromium run of the Expo mobile UI also logged in through the LAN API URL and reached **Home**, with no page errors. The AI recommendation response was stubbed during that UI check to avoid unnecessary generation. Test-created sessions were logged out afterward; other sessions were preserved.

Passwords, bearer tokens and account details were not written into these reports. No password reset was performed. The separate application on port 5000 was left running.

Evidence: [account-check.json](account-check.json), [mobile-ui-check.json](mobile-ui-check.json), [android-config-check.json](android-config-check.json), [lint](lint.log), [typecheck](typecheck.log).

The phone itself was not remotely operated. Reload Expo Go to use the updated default. If a server URL was previously saved in the app, that explicit preference takes precedence: change it using the login screen's settings button to `http://192.168.1.12:5001`. The phone and computer must share the reachable local network. If the computer's LAN IP changes later, update the configured URL.
