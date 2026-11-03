$ErrorActionPreference = 'SilentlyContinue'
$raw = [Console]::In.ReadToEnd()
try { $data = $raw | ConvertFrom-Json } catch { exit 0 }
$file = $data.tool_input.file_path
if (-not $file -or -not (Test-Path -LiteralPath $file -PathType Leaf)) { exit 0 }

$root = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { (Resolve-Path "$PSScriptRoot\..\..").Path }
$full = (Resolve-Path -LiteralPath $file).Path
$rootFull = (Resolve-Path -LiteralPath $root).Path
if (-not $full.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) { exit 0 }

$rel = $full.Substring($rootFull.Length).TrimStart('\', '/') -replace '\\', '/'
if ($rel -match '^(node_modules|\.next|resources|\.claude|\.playwright-screenshots)/') { exit 0 }
if ($rel -eq 'package-lock.json') { exit 0 }

$ext = [IO.Path]::GetExtension($full).ToLower()
$prettierExts = '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.md', '.mdx', '.html', '.yml', '.yaml'
$eslintExts = '.ts', '.tsx', '.js', '.jsx', '.mjs'

Set-Location $rootFull

if ($prettierExts -contains $ext -and (Test-Path 'node_modules\prettier')) {
  & npx --no-install prettier --write $full *> $null
}

$compactExts = '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.html', '.yml', '.yaml'
if ($compactExts -contains $ext) {
  $text = [IO.File]::ReadAllText($full)
  $lines = $text -split "`r?`n" | ForEach-Object { $_.TrimEnd() } | Where-Object { $_ -ne '' }
  $compact = ($lines -join "`n") + "`n"
  if ($compact -cne $text) { [IO.File]::WriteAllText($full, $compact, (New-Object Text.UTF8Encoding($false))) }
}

if ($eslintExts -contains $ext -and (Test-Path 'node_modules\eslint')) {
  $out = & npx --no-install eslint --fix $full 2>&1 | Out-String
  if ($LASTEXITCODE -ne 0) {
    [Console]::Error.WriteLine("ESLint encontró errores en ${rel}:`n$out")
    exit 2
  }
}
exit 0
