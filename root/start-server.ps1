# Simple HTTP Server for Digit Duel Game
# This script starts a local web server to avoid CORS issues

$port = 8080
$url = "http://localhost:$port/"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Digit Duel - Local Development Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting server on: $url" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Create HTTP listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
$listener.Start()

Write-Host "Server is running! Open your browser and navigate to:" -ForegroundColor Green
Write-Host $url -ForegroundColor White -BackgroundColor DarkGreen
Write-Host ""

# Open browser automatically
Start-Process $url

# MIME type mapping
$mimeTypes = @{
    '.html' = 'text/html'
    '.css'  = 'text/css'
    '.js'   = 'application/javascript'
    '.json' = 'application/json'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
    '.webp' = 'image/webp'
    '.woff' = 'font/woff'
    '.woff2' = 'font/woff2'
    '.ttf'  = 'font/ttf'
    '.webmanifest' = 'application/manifest+json'
    '.toml' = 'text/plain'
}

try {
    while ($listener.IsListening) {
        # Wait for request
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        # Get requested path
        $path = $request.Url.LocalPath
        if ($path -eq '/') {
            $path = '/index.html'
        }
        
        # Build file path
        $filePath = Join-Path $PSScriptRoot $path.TrimStart('/')
        
        Write-Host "$(Get-Date -Format 'HH:mm:ss') - " -NoNewline
        Write-Host "$($request.HttpMethod) " -ForegroundColor Cyan -NoNewline
        Write-Host "$path" -NoNewline
        
        # Check if file exists
        if (Test-Path $filePath -PathType Leaf) {
            # Get file extension and MIME type
            $extension = [System.IO.Path]::GetExtension($filePath)
            $mimeType = $mimeTypes[$extension]
            if (-not $mimeType) {
                $mimeType = 'application/octet-stream'
            }
            
            # Read file content
            $content = [System.IO.File]::ReadAllBytes($filePath)
            
            # Set response
            $response.ContentType = $mimeType
            $response.ContentLength64 = $content.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($content, 0, $content.Length)
            
            Write-Host " - 200 OK" -ForegroundColor Green
        }
        else {
            # File not found
            $response.StatusCode = 404
            $notFoundMessage = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found: $path")
            $response.OutputStream.Write($notFoundMessage, 0, $notFoundMessage.Length)
            
            Write-Host " - 404 Not Found" -ForegroundColor Red
        }
        
        $response.Close()
    }
}
finally {
    $listener.Stop()
    Write-Host ""
    Write-Host "Server stopped." -ForegroundColor Yellow
}
