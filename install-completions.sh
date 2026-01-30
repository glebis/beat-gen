#!/bin/bash
# Install shell completions for beat-gen

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== beat-gen Shell Completion Installer ==="
echo ""

# Detect shell
if [ -n "$ZSH_VERSION" ]; then
  SHELL_TYPE="zsh"
elif [ -n "$BASH_VERSION" ]; then
  SHELL_TYPE="bash"
else
  echo "Error: Unsupported shell. Use bash or zsh."
  exit 1
fi

echo "Detected shell: $SHELL_TYPE"
echo ""

# Install based on shell type
if [ "$SHELL_TYPE" = "bash" ]; then
  # Bash installation
  COMPLETION_DIR="$HOME/.bash_completion.d"
  mkdir -p "$COMPLETION_DIR"

  cp completions/beat-gen.bash "$COMPLETION_DIR/"
  echo -e "${GREEN}✓${NC} Copied bash completion to $COMPLETION_DIR"

  # Add to .bashrc if not already there
  if ! grep -q "beat-gen.bash" "$HOME/.bashrc" 2>/dev/null; then
    echo "source $COMPLETION_DIR/beat-gen.bash" >> "$HOME/.bashrc"
    echo -e "${GREEN}✓${NC} Added source line to ~/.bashrc"
  fi

  echo ""
  echo -e "${YELLOW}Run this to activate:${NC}"
  echo "  source ~/.bashrc"
  echo ""
  echo "Or reload your shell."

elif [ "$SHELL_TYPE" = "zsh" ]; then
  # Zsh installation
  COMPLETION_DIR="$HOME/.zsh/completion"
  mkdir -p "$COMPLETION_DIR"

  cp completions/_beat-gen "$COMPLETION_DIR/"
  echo -e "${GREEN}✓${NC} Copied zsh completion to $COMPLETION_DIR"

  # Add to .zshrc if not already there
  if ! grep -q "fpath=.*\.zsh/completion" "$HOME/.zshrc" 2>/dev/null; then
    echo "fpath=($COMPLETION_DIR \$fpath)" >> "$HOME/.zshrc"
    echo "autoload -Uz compinit && compinit" >> "$HOME/.zshrc"
    echo -e "${GREEN}✓${NC} Added completion setup to ~/.zshrc"
  fi

  echo ""
  echo -e "${YELLOW}Run this to activate:${NC}"
  echo "  rm ~/.zcompdump"
  echo "  source ~/.zshrc"
  echo ""
  echo "Or reload your shell."
fi

echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo "Test it:"
echo "  beat-gen <Tab>"
echo "  beat-gen compose --<Tab>"
