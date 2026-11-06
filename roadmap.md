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
