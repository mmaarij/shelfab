param(
    [ValidateSet("patch", "minor", "major")]
    [string]$Type = "patch"
)

Write-Host "Bumping package version to $Type..." -ForegroundColor Cyan

# Bump the version without auto-committing or tagging yet (we handle that manually)
$newVersion = npm version $Type --no-git-tag-version

# Make sure the version has a 'v' prefix for the tag
if (-not $newVersion.StartsWith('v')) {
    $newVersion = "v" + $newVersion
}

Write-Host "Staging files..." -ForegroundColor Cyan
git add .

Write-Host "Committing changes..." -ForegroundColor Cyan
git commit -m "chore: release $newVersion"

Write-Host "Applying Git Tag ($newVersion)..." -ForegroundColor Cyan
git tag $newVersion

$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "Pushing to remote repository ($currentBranch) and triggering GitHub Action..." -ForegroundColor Cyan
git push origin "$currentBranch" --tags

Write-Host "`nRelease $newVersion successfully prepared and pushed!" -ForegroundColor Green
Write-Host "You can track the build progress in the 'Actions' tab on GitHub." -ForegroundColor Gray