# Publish the browser game on GitHub Pages

The browser builder writes `browser/index.html` and the accompanying
`browser/country-art/` directory. The Pages workflow copies both; publishing only
the HTML would omit the 196 match atlases. The portable game is also available
as [a self-contained HTML inside the offline ZIP](../downloads/NationClash-Windows.zip).
That packaged HTML embeds all atlases and requires no companion folder; it is
separate from the smaller hosted source HTML.

GitHub write access was successfully restored. The preserved code and supplied
artwork are saved on `backup/nationclash-2026-10-15`. No public game website has
been deployed or verified as part of this update.

To publish a website when ready:

1. Review the backup branch and merge the game into main.
2. In repository Settings → Pages → Build and deployment, choose GitHub Actions.
3. Run the Publish browser game workflow, or let the main-branch push trigger it.
4. Wait for the deployment result, then open the actual reported page URL and
   verify country selection, both loaded fighters, keyboard damage and audio.

The workflow uses Pages and identity-token permissions; no token is embedded.
Local build and browser checks establish the package behavior, not a remote
Pages deployment. Internal cloud test-server addresses are not public previews.
