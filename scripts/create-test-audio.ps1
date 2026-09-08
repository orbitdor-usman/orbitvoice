param([Parameter(Mandatory=$true)][string]$OutputPath)
Add-Type -AssemblyName System.Speech
$synthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
  $synthesizer.SetOutputToWaveFile($OutputPath, $format)
  $prompt = New-Object System.Speech.Synthesis.PromptBuilder
  $prompt.AppendBreak([TimeSpan]::FromSeconds(1))
  $prompt.AppendText('The quick brown fox jumps over the lazy dog. Voice typing works without an API key.')
  $prompt.AppendBreak([TimeSpan]::FromSeconds(5))
  $synthesizer.Speak($prompt)
} finally { $synthesizer.Dispose() }
