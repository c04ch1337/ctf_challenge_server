#!/bin/bash

# Build and run the CTF server
echo "Building and starting CTF server..."
docker-compose up -d

# Wait for CTF to initialize
echo "Waiting for CTF to initialize..."
sleep 60  # Increased wait time

# Set admin username and password
echo "Setting admin username and password..."
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="password"

# Use the CTF API to set admin credentials
docker exec -it ctf_challenge_server python3 <<EOF
import requests

# CTF API URL
CTF_URL = "http://localhost:8080"

# Default admin credentials (CTF initial setup uses these)
DEFAULT_USERNAME = "admin"
DEFAULT_PASSWORD = "password"

# New admin credentials
NEW_USERNAME = "${ADMIN_USERNAME}"
NEW_PASSWORD = "${ADMIN_PASSWORD}"

# Login with default credentials
login_url = f"{CTF_URL}/login"
login_data = {
    "name": DEFAULT_USERNAME,
    "password": DEFAULT_PASSWORD,
}
response = requests.post(login_url, data=login_data)
if response.status_code != 200:
    raise Exception("Failed to log in with default credentials")

cookies = response.cookies

# Change admin password
change_password_url = f"{CTF_URL}/admin/reset_password"
change_password_data = {
    "confirm": NEW_PASSWORD,
    "password": NEW_PASSWORD,
    "user_id": 1,  # Admin user ID is always 1
}
response = requests.post(change_password_url, data=change_password_data, cookies=cookies)
if response.status_code != 200:
    raise Exception("Failed to change admin password")

# Change admin username (if needed)
if NEW_USERNAME != DEFAULT_USERNAME:
    change_username_url = f"{CTF_URL}/admin/users/1"
    change_username_data = {
        "name": NEW_USERNAME,
    }
    response = requests.patch(change_username_url, json=change_username_data, cookies=cookies)
    if response.status_code != 200:
        raise Exception("Failed to change admin username")

print("Admin username and password set successfully")
EOF

# Install Python and required dependencies
echo "Installing Python and dependencies..."
docker exec -it ctf_challenge_server apt-get update
docker exec -it ctf_challenge_server apt-get install -y python3 python3-pip
docker exec -it ctf_challenge_server pip3 install requests

# Copy the add_challenges.py script to the container
docker cp add_challenges.py ctf_challenge_server:/opt/CTFd/add_challenges.py

# Run the add_challenges.py script
echo "Adding challenges to CTF..."
docker exec -it ctf_challenge_server python3 /opt/CTFd/add_challenges.py

echo "CTF server is running on http://localhost:8080"
echo "Admin username: ${ADMIN_USERNAME}"
echo "Admin password: ${ADMIN_PASSWORD}"
