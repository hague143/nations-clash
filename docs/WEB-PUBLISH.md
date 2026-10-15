# Publish the browser game on GitHub Pages

The workflow in `.github/workflows/pages.yml` builds and publishes the
self-contained game HTML. Users can play from a browser without Unity or
downloading a local HTML file.

## Current access blockers

This cloud task can read `hague143/nations-clash`, but GitHub rejected the native
Git push with HTTP 403: `Permission to hague143/nations-clash.git denied to hague143`.
The code and tested game are committed locally. They are not on the remote
repository, and no public game website has been deployed.

The `/workspace/artifacts` paths and `sandbox:` links were not downloadable in
the user's chat interface. Do not present them as working public links. The game
artifacts remain available locally in the cloud environment.

The temporary-preview endpoint `https://api.trycloudflare.com/tunnel` also returned
proxy CONNECT HTTP 403, including after a turn-scoped network permission grant.
There is no verified temporary public preview URL.

## Publish once repository write access is available

1. From this checkout, push the authorized code with
   `git push origin HEAD:refs/heads/main`.
2. Confirm `git ls-remote origin refs/heads/main` matches `git rev-parse HEAD`.
3. In the repository's Settings → Pages → Build and deployment, choose
   GitHub Actions. Availability depends on repository visibility and the GitHub
   plan; preserve visibility unless the owner explicitly authorizes a change.
4. Run the Publish browser game workflow from the Actions tab, or push a
   subsequent change to main. Wait for the deployment to succeed.
5. Open the URL reported by the deployment and test country selection, entering
   a match, movement, damage and audio. Share the actual game URL after verifying it.

The workflow uses GitHub Actions `pages: write` and `id-token: write` permissions.
It needs no token embedded in the project. Do not ask for credentials in chat.
No hosted website or remote Actions run is claimed by local workflow checks.

The workflow's build and artifact-copy commands were executed locally. The staged
HTML matches the previously tested game byte for byte. An internal HTTP/Chromium
check returned 200, decoded all 196 fighters, started a match and verified damage
from a real keyboard punch with zero page errors. The test server was stopped
afterward; it is not a user-accessible public website.
