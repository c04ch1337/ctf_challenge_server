#!/bin/bash

# Build and run the CTFd server
echo "Building and starting CTFd server..."
docker-compose up -d

# Wait for CTFd to initialize
echo "Waiting for CTFd to initialize..."
sleep 30

# Add challenges to CTFd
echo "Adding challenges to CTFd..."
for i in {1..4}; do
  docker exec -it ctf_challenge_server python /opt/CTFd/add_challenge.py \
    --name "Challenge $i" \
    --description "$(cat challenges/challenge-$i/story.txt)" \
    --flags "$(cat challenges/challenge-$i/flags.txt)" \
    --hints "$(cat challenges/challenge-$i/hints.txt)"
done

echo "CTFd server is running on http://localhost:8080"
