# MallWay GitHub repository setup

The product name is **MallWay**. Suggested repository name for a new upload: `mallway`. An existing `mallway-kl-east` repository may stay at its current address; the README title and description still identify the product as MallWay. KL East Mall is the current demonstration dataset.

## Upload directly through the GitHub website

1. Sign in to GitHub and create a repository, or open the existing one.
2. For a new repository, leave README, licence and gitignore creation unselected because this package already contains project files.
3. Open Upload files. Select everything inside the extracted `MallWay` folder and drag the files and folders into the upload area.
4. Wait for the uploads, enter a descriptive commit message and commit the changes.
5. To update only this introduction, upload the new `README.md` at the repository root and the revised slide/script into `submission/`.

Browser upload creates a commit for the uploaded files. It does not import the earlier commit history from `mallway-history.bundle`. The optional Git procedure below retains that history if you choose to use it later.

## Optional import of the recorded history

1. Install Git for Windows from https://git-scm.com/downloads/win if needed.
2. Create an empty repository named `mallway` in your GitHub account. Do not initialise it with a README or licence because this project already has files and history. Choose visibility according to your competition's rules.
3. Put `mallway-history.bundle` in an empty working folder. Open its terminal and run:

```sh
git clone mallway-history.bundle mallway
cd mallway
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/mallway.git
git push -u origin HEAD
```

Replace `YOUR_USERNAME` with your GitHub username. Sign in through Git's normal browser prompt. Do not put a password or access token in code or paste it into chat.

On GitHub, inspect Commits, Actions, `CHANGELOG.md`, `docs/QA_REPORT.md` and `submission/`. The workflow runs checks on future pushes and pull requests. Existing tests passed locally; GitHub Actions results exist only after GitHub runs the workflow.

## Future work

After making a real change, run the tests, then use a descriptive commit:

```sh
npm run check
npm test
python -m unittest discover -s tests -p test_local_server.py
git add .
git commit -m "Describe the actual change"
git push
```

Do not backdate commits or invent contributor activity. A private field survey belongs in a controlled folder; publish only anonymised findings with permission. Saved parking notes and journey history remain in each visitor's browser and are not published to GitHub automatically.

## Rights and secrets

The map images and directory originate from KL East Mall / Sime Darby Property. This package does not grant additional redistribution rights or imply endorsement. Third-party library notices remain in their original files. The first-party source has no blanket open-source licence assigned by this project preparation step. Do not commit API keys, `.env` files, location logs, photos of visitors or personal survey data.
