# Onboarding card reliability
- [x] Add onboarding-only card edit sheet and optional photos; store resized copies locally and attach private uploads after signup; verify Save, Cancel and continuation.
- [x] Reuse the existing centered memory card in an onboarding swipe carousel with Keep this, gold Edit and Dismiss actions.
- [x] Restyle location, add expanded/world globe states and pinch return, lazy country city suggestions, typing focus and city confirmation; test persistence without coordinates.
- [x] Keep country focus orthographic with 600ms rotation/zoom, 70% width fitting, and a visible globe edge/graticule; verify desktop and phone.
- [x] Add and verify the offline onboarding globe, country regions, and ranked local city suggestions.
- [x] Add signed-in city matching and Settings autocomplete without coordinates; test save rules.
- [ ] Validate Google city matching and suggestions on the deployed site; Google live testing is unavailable in the sandbox.
- [x] Preserve extracted cards and review progress across reloads; show extraction failures without skipping review.
- [x] Save kept cards after authentication, retain drafts through email confirmation and failed saves, and prevent duplicate saves.
- [x] Run focused tests and verify the public flow on desktop and phone.
- [x] Verify cards and privately uploaded photos read back in an authenticated archive.
- [x] Move the birth-screen privacy line directly below “When were you born”.
# Sign-in routing and Google onboarding account
- [x] Add "Continue with Google" below the email/password form on /onboarding/create-account using lovable.auth.signInWithOAuth with redirect_uri ${origin}/onboarding/create-account; on return run draft migration, kept-card migration, city match, set ts_onboarding_complete, go to /archive.
- [x] After any sign-in: no profile city, ts_onboarding_complete unset, no onboarding draft waiting -> /onboarding-name instead of /archive.
- [x] Signed-in user finishing /onboarding/location: skip /onboarding/ready and /onboarding/create-account, save name/birth/location straight to profile, set ts_onboarding_complete, go to /archive.
- [x] Onboarding location saves only city, country_code, region_code; never lat/lng. Report existing lat/lng columns and whether rows hold values.
# Review card vertical placement
- [x] Keep the touchstone card and its Keep this/Edit row centered slightly above mid-screen at any card height; verify desktop and phone.
- [x] Swap the review card's Keep this and Edit button positions.
# Zoomed country view and selection highlighting
- [ ] Make the zoomed-in US view match the reference: full-bleed rectangular map, contiguous US spanning ~75% of the frame, graticule and state borders visible, no circular edge while zoomed.
- [ ] Do not highlight the country once a more specific region is selected; only the chosen region is gold.
- [ ] Tapping a region country leaves it cream with 1px #1E2E3E admin-1 borders and zooms; only the tapped region is gold, and country_code is stored on country tap, region_code only on region tap. Non-region countries keep one-tap gold.
- [ ] US zoom framed by contiguous 48 + DC only via per-country FOCUS_OVERRIDES (excluded region codes); rotate to ~[-98.5, 39], scale so those bounds fill the 342px globe minus 16px each side; AK/HI still drawn and tappable; 600ms animation.
- [ ] At /onboarding/create-account, check whether the email already has an account before continuing to the password step.
- [ ] Put "Continue with Google" in a proper button on /onboarding/create-account (both sub-steps).
- [ ] /archive page itself must not scroll; only the touchstone grid scrolls.
- [ ] Double the "touchstones" label font on /archive (10px -> 20px).
- [ ] Phone archive: shrink the fixed parts (category tiles, ALL bar, buttons) so the card grid gets roughly twice the room.
- [ ] Bottom nav pill: extend it so its edges line up with the page content column.
- [ ] Remove Settings from bottom nav; open /settings from the profile circle top-right of /archive.
# Story delete and hands-free telling
- [x] Swipe a story left in Recent Stories to delete it, with a confirmation that says saved touchstones are not deleted.
- [x] Tell Me A Story opens already listening: Web Speech API started in the tap handler, continuous + interimResults, all transcription behind one swappable transcribe service module.
- [x] Listening screen: ivory background, 64px gold pulsing mic (0.5-1 opacity over 1.6s), "I'm listening." Playfair 28px navy, live transcript Jost 18px #2C3E50 that scrolls as it grows, pinned Done (56px navy fill, ivory text) and Pause text button.
- [x] Never stop on silence; only Done ends it, and quietly restart if the browser ends recognition itself.
- [x] Done hands the transcript to the existing story unfold flow; mic denied or unsupported browser falls back to the typed input with "You can type your story instead."

- [x] Story transcript card: bring to the 1/3 fold

- [x] Bottom nav: remove headroom above and room below at the bottom

# Card glow and category heading rule
- [x] Make each glow behind a touchstone card use that category's highlight color; verify desktop and phone.
- [x] Add a 3pt line separating the category heading on the touchstone card; verify desktop and phone.

- [x] Reduce the category heading rule from 3pt to 2pt.
