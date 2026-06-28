export TAURI_SIGNING_PRIVATE_KEY_PATH := "./signage_keys/shadychemicals.key"

[private]
default:
    just --list

tauri *ARGS:
    cargo tauri {{ARGS}}

run-dev:
    cargo tauri dev

build-bundle:
    cargo tauri build