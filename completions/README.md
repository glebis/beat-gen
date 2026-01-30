# Shell Completions for beat-gen

Auto-completion for bash and zsh shells.

## Features

- ✅ Command completion (`sample`, `compose`, `render`, etc.)
- ✅ Flag completion (`--bpm`, `--output`, `--quiet`, etc.)
- ✅ File path completion (pattern files, MIDI files, directories)
- ✅ Value suggestions (kit names, formats, common BPMs)
- ✅ Context-aware (different completions per command)

## Installation

### Bash

**Option 1: User install**
```bash
mkdir -p ~/.bash_completion.d
cp completions/beat-gen.bash ~/.bash_completion.d/
echo 'source ~/.bash_completion.d/beat-gen.bash' >> ~/.bashrc
source ~/.bashrc
```

**Option 2: System-wide (macOS with Homebrew)**
```bash
cp completions/beat-gen.bash /opt/homebrew/etc/bash_completion.d/
```

**Option 3: System-wide (Linux)**
```bash
sudo cp completions/beat-gen.bash /etc/bash_completion.d/
```

### Zsh

**Option 1: User install**
```bash
mkdir -p ~/.zsh/completion
cp completions/_beat-gen ~/.zsh/completion/
echo 'fpath=(~/.zsh/completion $fpath)' >> ~/.zshrc
echo 'autoload -Uz compinit && compinit' >> ~/.zshrc
source ~/.zshrc
```

**Option 2: Oh-My-Zsh**
```bash
mkdir -p ~/.oh-my-zsh/custom/plugins/beat-gen
cp completions/_beat-gen ~/.oh-my-zsh/custom/plugins/beat-gen/
# Add 'beat-gen' to plugins in ~/.zshrc
plugins=(... beat-gen)
source ~/.zshrc
```

**Option 3: System-wide (with Homebrew)**
```bash
cp completions/_beat-gen /opt/homebrew/share/zsh/site-functions/
```

## Usage Examples

### Command Completion

Type `beat-gen` and press Tab:
```bash
$ beat-gen <Tab>
sample  compose  export  import  render  help  --help  --version
```

### Flag Completion

Type `beat-gen compose --` and press Tab:
```bash
$ beat-gen compose --<Tab>
--bpm  --time-signature  --swing  --resolution  --output  --format  --quiet  --verbose
```

### File Path Completion

```bash
$ beat-gen compose patterns/<Tab>
example-basic.txt  example-hiphop.txt  trip-hop-atmospheric.json  ...
```

### Value Suggestions

```bash
$ beat-gen sample --kit <Tab>
808  acoustic  electronic

$ beat-gen compose --format <Tab>
midi  json

$ beat-gen render --samples <Tab>
samples/808/  samples/test/  ...
```

### Context-Aware

Different flags for each command:

```bash
$ beat-gen sample --<Tab>
--kit  --output  --duration  --influence  --api-key  --quiet  --verbose

$ beat-gen render --<Tab>
--samples  --output  --sample-rate  --bit-depth  --format  --quiet  --verbose
```

## Testing

Test if completions are loaded:

```bash
# Bash
complete -p beat-gen

# Zsh
which _beat-gen
```

If working, you should see the completion function defined.

## Troubleshooting

**Bash: Completions not working**
- Ensure bash-completion is installed: `brew install bash-completion` (macOS)
- Check if sourced: `grep beat-gen ~/.bashrc`
- Reload shell: `source ~/.bashrc`

**Zsh: Completions not working**
- Check fpath: `echo $fpath`
- Rebuild completion cache: `rm ~/.zcompdump && compinit`
- Reload shell: `source ~/.zshrc`

**Completions not updating**
- Bash: `source ~/.bash_completion.d/beat-gen.bash`
- Zsh: `rm ~/.zcompdump && exec zsh`

## Completion Features by Command

### `beat-gen sample`
- Kit presets: 808, acoustic, electronic
- Output directory completion
- API key (no completion)
- Quiet/verbose flags

### `beat-gen compose`
- Pattern files: .txt, .json, .pattern
- BPM values (numeric)
- Time signatures: 4/4, 3/4, 6/8, 7/8
- Swing values: 0, 0.3, 0.5, 0.66
- Resolution: 16, 32, 64
- Format: midi, json
- Output file: .mid files

### `beat-gen render`
- Pattern files: .json only
- Samples directory completion
- Sample rates: 44100, 48000, 96000
- Bit depths: 16, 24, 32
- Format: wav, mp3, flac
- Output file: .wav files

### `beat-gen import`
- MIDI files: .mid, .midi
- Output format: json, text
- Output file completion

### `beat-gen export`
- JSON pattern files
- Output format: midi, text
- Output file completion

## Advanced Features

**Partial matching:**
```bash
$ beat-gen comp<Tab>  # → compose
$ beat-gen --v<Tab>   # → --verbose
```

**Multiple arguments:**
```bash
$ beat-gen sample --kit 808 --out<Tab>  # → --output
```

**File filtering:**
Only relevant file types are shown:
```bash
$ beat-gen compose <Tab>     # Only .txt, .json, .pattern
$ beat-gen import <Tab>      # Only .mid, .midi
$ beat-gen render <Tab>      # Only .json
```

## Customization

Edit completion files to add:
- Custom kit names
- Common BPM presets
- Project-specific directories
- Additional flags

Example (bash):
```bash
# In beat-gen.bash, change:
COMPREPLY=($(compgen -W "808 acoustic electronic my-custom-kit" -- ${cur}))
```

## Future Enhancements

- [ ] Dynamic completion from config files
- [ ] Sample directory detection
- [ ] Recent patterns history
- [ ] Preset completion from user config
- [ ] Fish shell support
