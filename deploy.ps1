param(
    [string]$ServiceName = "yt-viewer",
    [string]$ProjectId = "",
    [string]$Region = "us-west1",
    [string]$DatabaseUrlSecretName = "yt-viewer-database-url",
    [string]$DatabaseUrlSecretVersion = "latest"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Remove-DirectoryIfPresent
{
    param(
        [string]$Path
    )

    if (Test-Path -LiteralPath $Path)
    {
        Remove-Item -LiteralPath $Path -Recurse -Force
    }
}

function Copy-Directory
{
    param(
        [string]$Source,
        [string]$Destination
    )

    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    Copy-Item -Path (Join-Path $Source "*") -Destination $Destination -Recurse -Force
}

function Update-DeployPackageManifest
{
    param(
        [string]$PackageJsonPath
    )

    $packageJson = Get-Content -LiteralPath $PackageJsonPath -Raw | ConvertFrom-Json

    if (-not $packageJson.scripts)
    {
        $packageJson | Add-Member -MemberType NoteProperty -Name "scripts" -Value ([pscustomobject]@{})
    }

    $packageJson.scripts | Add-Member -MemberType NoteProperty -Name "start" -Value "node build" -Force
    $packageJson | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $PackageJsonPath
}

function Invoke-SmokeTest
{
    param(
        [string]$BuildPath
    )

    $quotedBuildPath = '"' + ($BuildPath -replace '"', '\"') + '"'
    $nodeCommand = Get-Command node -ErrorAction Stop
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $nodeCommand.Source
    $startInfo.Arguments = $quotedBuildPath
    $startInfo.UseShellExecute = $false
    $startInfo.WorkingDirectory = (Get-Location).Path
    $startInfo.EnvironmentVariables["PORT"] = "8080"
    $startInfo.EnvironmentVariables["HOST"] = "0.0.0.0"
    $startInfo.EnvironmentVariables["DATABASE_URL"] = "postgres://yt_viewer:yt_viewer_dev@localhost:5432/yt_viewer?sslmode=disable"

    $process = [System.Diagnostics.Process]::Start($startInfo)

    if (-not $process)
    {
        throw "Failed to start smoke test process."
    }

    try
    {
        Start-Sleep -Seconds 1

        if ($process.HasExited -and $process.ExitCode -ne 0)
        {
            throw "Smoke test process exited early with code $($process.ExitCode)."
        }
    }
    finally
    {
        if (-not $process.HasExited)
        {
            $process.Kill()
            $process.WaitForExit()
        }

        $process.Dispose()
    }
}

$repoRoot = $PSScriptRoot
$buildPath = Join-Path $repoRoot "build"
$deployPath = Join-Path $repoRoot "deploy"
$deployBuildPath = Join-Path $deployPath "build"
$deployPackageJsonPath = Join-Path $deployPath "package.json"
$deployCommit = (git rev-parse --short HEAD).Trim()
$deployDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

if ([string]::IsNullOrWhiteSpace($ProjectId))
{
    throw "ProjectId is required. Pass -ProjectId <gcp-project-id>."
}

Write-Host "Building..."
Remove-DirectoryIfPresent -Path $buildPath
Remove-DirectoryIfPresent -Path $deployPath

$previousDeployCommit = $env:PUBLIC_DEPLOY_COMMIT
$previousDeployDate = $env:PUBLIC_DEPLOY_DATE

try
{
    $env:PUBLIC_DEPLOY_COMMIT = $deployCommit
    $env:PUBLIC_DEPLOY_DATE = $deployDate

    npm.cmd ci
    npm.cmd run build
}
finally
{
    $env:PUBLIC_DEPLOY_COMMIT = $previousDeployCommit
    $env:PUBLIC_DEPLOY_DATE = $previousDeployDate
}

New-Item -ItemType Directory -Path $deployPath -Force | Out-Null
Copy-Directory -Source $buildPath -Destination $deployBuildPath
Copy-Item -LiteralPath (Join-Path $repoRoot "package.json") -Destination $deployPackageJsonPath -Force
Copy-Item -LiteralPath (Join-Path $repoRoot "package-lock.json") -Destination (Join-Path $deployPath "package-lock.json") -Force
Set-Content -LiteralPath (Join-Path $deployPath ".githash") -Value ((git rev-parse HEAD).Trim())
Update-DeployPackageManifest -PackageJsonPath $deployPackageJsonPath

Write-Host "Smoke testing..."
Invoke-SmokeTest -BuildPath $buildPath

Write-Host "Deploying to Cloud Run..."
gcloud config set project $ProjectId
gcloud run deploy $ServiceName `
    --source $deployPath `
    --region=$Region `
    --allow-unauthenticated `
    --set-build-env-vars "GOOGLE_NODE_RUN_SCRIPTS=" `
    --set-env-vars "HOST=0.0.0.0" `
    --update-secrets "DATABASE_URL=$DatabaseUrlSecretName`:$DatabaseUrlSecretVersion" `
    --port=8080 `
    --memory=2Gi

Remove-DirectoryIfPresent -Path $deployPath
Write-Host "Done."
