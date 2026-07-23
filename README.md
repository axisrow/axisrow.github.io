# axisrow.github.io

This repository is the single source of truth for
[axisrow.github.io](https://axisrow.github.io), its profile data, generators,
tests, and GitHub Pages workflows.

- Site sources live at the repository root.
- Profile data and generators live in `profile/`.
- `axisrow/axisrow` receives a generated profile README.
- `axisrow/profile` is retained as migration history and will be archived after
  the rollout soak period.

## Local checks

```bash
npm test
python3 -m unittest discover -s profile/tests
python3 profile/sync/generate.py
python3 profile/sync/build_pages.py
```

The generated site is written to `.pages-dist/`. Generation updates the copied
`index.html` inside that directory and leaves the source `index.html` unchanged.
The builder owns `.pages-dist` as its canonical output (the location is derived
from the site root, not caller-selected) and only ever writes or replaces the
known allowlisted files. If `.pages-dist` ever contains an unexpected file, the
build fails closed rather than deleting it.
