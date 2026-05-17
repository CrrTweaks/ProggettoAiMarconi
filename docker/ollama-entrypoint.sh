#!/bin/sh
set -e

# Avvia il server Ollama in background
ollama serve &
PID=$!

# Attendi che il server locale risponda
until ollama list >/dev/null 2>&1; do
    sleep 1
done

# Scarica il modello di default se non è presente
if ! ollama list | grep -q "^mistral"; then
    echo "[ollama-entrypoint] Pulling mistral model..."
    ollama pull mistral
    echo "[ollama-entrypoint] mistral ready."
else
    echo "[ollama-entrypoint] mistral already present."
fi

# Mantieni il container attivo in foreground
wait $PID
