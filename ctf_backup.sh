#!/bin/bash

# Backup CTFd data
echo "Backing up CTFd data..."
docker exec -it ctf_challenge_server tar -czvf /opt/CTFd/ctfd-backup.tar.gz /opt/CTFd

# Copy backup to host
docker cp ctf_challenge_server:/opt/CTFd/ctfd-backup.tar.gz .

# Push to GitHub
echo "Pushing backup to GitHub..."
git add .
git commit -m "Backup CTFd server"
git push origin main

echo "Backup completed and pushed to GitHub."
