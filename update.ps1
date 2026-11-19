param([string]$msg = "Update from Antigravity")

git status -s
git add .
git commit -m "$msg"
git pull --rebase origin main
git push origin main
