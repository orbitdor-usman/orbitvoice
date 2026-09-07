param([Parameter(Mandatory=$true)][string]$OutputPath)
Add-Type -AssemblyName System.Speech
$synthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
  $synthesizer.SetOutputToWaveFile($OutputPath, $format)
  $synthesizer.Speak('The quick brown fox jumps over the lazy dog. Voice typing works without an API key.')
} finally { $synthesizer.Dispose() }
