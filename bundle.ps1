$shared = @("data.js", "components.js", "auth.js")

function Bundle-Files {
    param([string[]]$Files, [string]$OutFile)
    
    $content = "(() => {`n"
    foreach ($f in $Files) {
        $c = Get-Content "js/$f" -Raw
        # Remove multi-line imports
        $c = $c -replace '(?s)import\s*\{[^\}]*\}\s*from\s*[''"].*?[''"];?', ''
        # Remove single-line imports
        $c = $c -replace '(?m)^import\s+.*$', ''
        
        # Remove exports
        $c = $c -replace '(?m)^export\s+const\s+', 'const '
        $c = $c -replace '(?m)^export\s+let\s+', 'let '
        $c = $c -replace '(?m)^export\s+function\s+', 'function '
        $c = $c -replace '(?m)^export\s+async\s+function\s+', 'async function '
        $c = $c -replace '(?m)^export\s+\{[^\}]*\}\s*;?', ''
        
        $content += "// --- $f ---`n" + $c + "`n"
    }
    $content += "})();"
    
    Set-Content $OutFile $content
    Write-Host "Created $OutFile"
}

Bundle-Files -Files ($shared + "admin.js" + "landing.js") -OutFile "js/bundle-landing-v4.js"
Bundle-Files -Files ($shared + "shop.js") -OutFile "js/bundle-shop-v4.js"
Bundle-Files -Files ($shared + "account.js") -OutFile "js/bundle-account-v4.js"
