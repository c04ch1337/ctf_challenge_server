#!/bin/bash

# Build and run the CTFd server
echo "Building and starting CTFd server..."
docker-compose up -d

# Wait for CTFd to initialize
echo "Waiting for CTFd to initialize..."
sleep 30

# Install Python and required dependencies
echo "Installing Python and dependencies..."
docker exec -it ctf_challenge_server apt-get update
docker exec -it ctf_challenge_server apt-get install -y python3 python3-pip
docker exec -it ctf_challenge_server pip3 install requests

# Copy the add_challenges.py script to the container
docker cp add_challenges.py ctf_challenge_server:/opt/CTFd/add_challenges.py

# Run the add_challenges.py script
echo "Adding challenges to CTFd..."
docker exec -it ctf_challenge_server python3 /opt/CTFd/add_challenges.py

echo "CTFd server is running on http://localhost:8080"
