# Build / test / package for Windows. Requires JDK 21+ only (no Maven/Gradle).
# Usage: powershell -ExecutionPolicy Bypass -File scripts\build.ps1 -Task test
param(
    [ValidateSet('build', 'test', 'run', 'jar', 'package', 'clean')]
    [string]$Task = 'build'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$srcMain = Join-Path $root 'src\main\java'
$srcTest = Join-Path $root 'src\test\java'
$build = Join-Path $root 'build'
$classes = Join-Path $build 'classes'
$testClasses = Join-Path $build 'test-classes'
$dist = Join-Path $root 'dist'
$mainClass = 'com.helloworld.taiin.calculator.CalculatorFrame'
$testClass = 'com.helloworld.taiin.calculator.EvaluatorTest'
$uiTestClass = 'com.helloworld.taiin.calculator.UiTest'
$appName = 'Calculator'

function Resolve-JdkBin {
    if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\jar.exe'))) {
        return (Join-Path $env:JAVA_HOME 'bin')
    }
    # java writes -XshowSettings output to stderr; capture via cmd to avoid NativeCommandError.
    $out = & $env:ComSpec /c 'java -XshowSettings:properties -version 2>&1'
    $line = @($out -split "`r?`n" | Where-Object { $_ -match '^\s*java\.home\s*=' })
    if ($line.Count -gt 0) {
        $jdkHome = ($line[0] -replace '^\s*java\.home\s*=\s*', '').Trim()
        if (Test-Path (Join-Path $jdkHome 'bin\jar.exe')) { return (Join-Path $jdkHome 'bin') }
    }
    throw 'JDK not found; set JAVA_HOME to a full JDK 21 installation'
}

$jdkBin = Resolve-JdkBin
$env:Path = "$jdkBin;$env:Path"
$javacExe = Join-Path $jdkBin 'javac.exe'
$jarExe = Join-Path $jdkBin 'jar.exe'
$javaExe = Join-Path $jdkBin 'java.exe'
$jpackageExe = Join-Path $jdkBin 'jpackage.exe'

function Invoke-Build {
    New-Item -ItemType Directory -Force -Path $classes | Out-Null
    $files = @(Get-ChildItem -Path $srcMain -Recurse -Filter *.java | ForEach-Object { $_.FullName })
    & $javacExe --release 21 -encoding UTF-8 -d $classes $files
    if ($LASTEXITCODE -ne 0) { throw 'javac failed' }
    Write-Host "Compiled -> $classes"
}

function Invoke-Test {
    Invoke-Build
    New-Item -ItemType Directory -Force -Path $testClasses | Out-Null
    $files = @(Get-ChildItem -Path $srcTest -Recurse -Filter *.java | ForEach-Object { $_.FullName })
    & $javacExe --release 21 -encoding UTF-8 -cp $classes -d $testClasses $files
    if ($LASTEXITCODE -ne 0) { throw 'test compilation failed' }
    & $javaExe '-Dfile.encoding=UTF-8' -cp "$classes;$testClasses" $testClass
    if ($LASTEXITCODE -ne 0) { throw 'tests failed' }
    & $javaExe '-Dfile.encoding=UTF-8' -cp "$classes;$testClasses" $uiTestClass
    if ($LASTEXITCODE -ne 0) { throw 'ui tests failed' }
}

function Invoke-Jar {
    Invoke-Build
    New-Item -ItemType Directory -Force -Path $dist | Out-Null
    $jarPath = Join-Path $dist "$appName.jar"
    & $jarExe --create --file $jarPath --main-class $mainClass -C $classes .
    if ($LASTEXITCODE -ne 0) { throw 'jar failed' }
    Write-Host "Jar -> $jarPath"
}

function Invoke-Package {
    Invoke-Jar
    if (-not (Test-Path $jpackageExe)) {
        throw 'jpackage not found; install a full JDK (not a JRE)'
    }
    # jpackage requires --input to be a directory that contains the main jar.
    $stage = Join-Path $build 'package-input'
    if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
    New-Item -ItemType Directory -Force -Path $stage | Out-Null
    Copy-Item (Join-Path $dist "$appName.jar") $stage
    New-Item -ItemType Directory -Force -Path $dist | Out-Null

    $type = 'deb'
    if ($env:OS -eq 'Windows_NT') { $type = 'msi' }
    elseif (Get-Command sw_vers -ErrorAction SilentlyContinue) { $type = 'dmg' }

    $jpackageArgs = @(
        '--type', $type,
        '--name', $appName,
        '--app-version', '1.0.0',
        '--input', $stage,
        '--main-jar', "$appName.jar",
        '--main-class', $mainClass,
        '--dest', $dist,
        '--java-options', '-Dfile.encoding=UTF-8'
    )
    & $jpackageExe @jpackageArgs
    if ($LASTEXITCODE -ne 0) {
        if ($type -eq 'msi') {
            Write-Host 'MSI failed (WiX Toolset not installed). Building a portable app-image instead...'
            & $jpackageExe '--type', 'app-image', '--name', $appName, '--app-version', '1.0.0',
                '--input', $stage, '--main-jar', "$appName.jar", '--main-class', $mainClass,
                '--dest', $dist, '--java-options', '-Dfile.encoding=UTF-8'
            if ($LASTEXITCODE -ne 0) { throw 'jpackage failed' }
            Write-Host "Portable app -> $(Join-Path $dist $appName)"
            return
        }
        throw 'jpackage failed'
    }
    Write-Host "Installer -> $dist"
}

switch ($Task) {
    'build' { Invoke-Build }
    'test' { Invoke-Test }
    'run' { Invoke-Build; & $javaExe '-Dfile.encoding=UTF-8' -cp $classes $mainClass }
    'jar' { Invoke-Jar }
    'package' { Invoke-Package }
    'clean' {
        if (Test-Path $build) { Remove-Item -Recurse -Force $build }
        if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
        Write-Host 'Cleaned build/ and dist/'
    }
}
