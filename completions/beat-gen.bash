#!/bin/bash
# Bash completion for beat-gen CLI

_beat_gen_completion() {
  local cur prev commands
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"

  # Main commands
  commands="sample compose export import render help"

  # Get the subcommand
  local command=""
  local i
  for ((i=1; i < COMP_CWORD; i++)); do
    if [[ " ${commands} " =~ " ${COMP_WORDS[i]} " ]]; then
      command="${COMP_WORDS[i]}"
      break
    fi
  done

  # If no command yet, complete commands
  if [ -z "$command" ]; then
    COMPREPLY=($(compgen -W "${commands} --help --version" -- ${cur}))
    return 0
  fi

  # Complete flags based on command
  case "${command}" in
    sample)
      case "${prev}" in
        -k|--kit)
          COMPREPLY=($(compgen -W "808 acoustic electronic" -- ${cur}))
          return 0
          ;;
        -o|--output|--api-key)
          COMPREPLY=($(compgen -d -- ${cur}))
          return 0
          ;;
        *)
          if [[ ${cur} == -* ]]; then
            COMPREPLY=($(compgen -W "-k --kit -o --output -d --duration -i --influence --api-key -q --quiet -v --verbose" -- ${cur}))
          fi
          return 0
          ;;
      esac
      ;;

    compose)
      case "${prev}" in
        -o|--output)
          COMPREPLY=($(compgen -f -X '!*.mid' -- ${cur}))
          return 0
          ;;
        -f|--format)
          COMPREPLY=($(compgen -W "midi json" -- ${cur}))
          return 0
          ;;
        -b|--bpm|-s|--swing|-r|--resolution)
          # Numeric values, no completion
          return 0
          ;;
        *)
          if [[ ${cur} == -* ]]; then
            COMPREPLY=($(compgen -W "-b --bpm -t --time-signature -s --swing -r --resolution -o --output -f --format -q --quiet -v --verbose" -- ${cur}))
          else
            # Complete pattern files
            COMPREPLY=($(compgen -f -X '!*.@(txt|json|pattern)' -- ${cur}))
          fi
          return 0
          ;;
      esac
      ;;

    render)
      case "${prev}" in
        -s|--samples)
          COMPREPLY=($(compgen -d -- ${cur}))
          return 0
          ;;
        -o|--output)
          COMPREPLY=($(compgen -f -X '!*.wav' -- ${cur}))
          return 0
          ;;
        --format)
          COMPREPLY=($(compgen -W "wav mp3 flac" -- ${cur}))
          return 0
          ;;
        *)
          if [[ ${cur} == -* ]]; then
            COMPREPLY=($(compgen -W "-s --samples -o --output --sample-rate --bit-depth --format -q --quiet -v --verbose" -- ${cur}))
          else
            # Complete JSON pattern files
            COMPREPLY=($(compgen -f -X '!*.json' -- ${cur}))
          fi
          return 0
          ;;
      esac
      ;;

    import)
      case "${prev}" in
        -o|--output)
          COMPREPLY=($(compgen -f -X '!*.@(json|txt)' -- ${cur}))
          return 0
          ;;
        -f|--format)
          COMPREPLY=($(compgen -W "json text" -- ${cur}))
          return 0
          ;;
        *)
          if [[ ${cur} == -* ]]; then
            COMPREPLY=($(compgen -W "-f --format -o --output -q --quiet -v --verbose" -- ${cur}))
          else
            # Complete MIDI files
            COMPREPLY=($(compgen -f -X '!*.@(mid|midi)' -- ${cur}))
          fi
          return 0
          ;;
      esac
      ;;

    export)
      case "${prev}" in
        -o|--output)
          COMPREPLY=($(compgen -f -X '!*.@(mid|midi|txt)' -- ${cur}))
          return 0
          ;;
        -f|--format)
          COMPREPLY=($(compgen -W "midi text" -- ${cur}))
          return 0
          ;;
        *)
          if [[ ${cur} == -* ]]; then
            COMPREPLY=($(compgen -W "-f --format -o --output -q --quiet -v --verbose" -- ${cur}))
          else
            # Complete JSON pattern files
            COMPREPLY=($(compgen -f -X '!*.json' -- ${cur}))
          fi
          return 0
          ;;
      esac
      ;;
  esac
}

# Register completion
complete -F _beat_gen_completion beat-gen
