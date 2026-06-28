export TAURI_SIGNING_PRIVATE_KEY := read(absolute_path("./signage_keys/schadychemicals.key"))

[private]
default:
    just --list

tauri *ARGS:
    cargo tauri {{ARGS}}

run-dev:
    cargo tauri dev

build-bundle:
    cargo tauri build

[doc("Checks out the release branch and merges master onto it (checks master out again after that)")]
push-release:
    git checkout release
    git merge master
    git push origin
    git checkout master